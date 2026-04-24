import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export interface BatchDeduction {
  batch_id: string;
  quantity: number;
  unit: string;
}

export interface MovementRecord {
  variant_id: string;
  deductions: BatchDeduction[];
}

export interface StockItem {
  productSku: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  variantSku?: string | null;
  batchNo?: string | null;
}

export const deductStock = async (
  items: StockItem[],
  tx?: Prisma.TransactionClient
): Promise<MovementRecord[]> => {
  const execute = async (prismaTx: Prisma.TransactionClient) => {
    // 1. Pre-fetch all variants
    const variantQueries = items.map(item => {
      if (item.variantSku) return { sku: item.variantSku };
      return {
        product: { sku: item.productSku },
        size: item.size || null,
        color: item.color || null,
      };
    });

    const allVariants = await prismaTx.product_variant.findMany({
      where: { OR: variantQueries },
      select: { id: true, sku: true, size: true, color: true, product: { select: { sku: true } } }
    });

    // 2. Map items to variants and fetch all relevant batches
    const variantIds = allVariants.map(v => v.id);
    const allBatches = await prismaTx.batches.findMany({
      where: {
        product_variant_id: { in: variantIds },
        remaining_quantity: { gt: 0 },
      },
      orderBy: { manufacture_date: "asc" },
    });

    const results: MovementRecord[] = [];

    for (const item of items) {
      const variant = allVariants.find(v =>
        item.variantSku ? v.sku === item.variantSku : (v.product.sku === item.productSku && v.size === item.size && v.color === item.color)
      );

      if (!variant) {
        throw new Error(`Variant not found for ${item.variantSku || item.productSku}`);
      }

      // Filter batches for this variant that still have stock
      const variantBatches = allBatches.filter(b => b.product_variant_id === variant.id && b.remaining_quantity > 0);

      // Sort batches: 
      // 1. If item has a specific batchNo, that batch MUST come first.
      // 2. Otherwise, stick to FIFO (manufacture_date ASC).
      const sortedBatches = [...variantBatches].sort((a, b) => {
        if (item.batchNo) {
          if (a.batch_no === item.batchNo) return -1;
          if (b.batch_no === item.batchNo) return 1;
        }
        // Preserve original FIFO order from variantBatches
        return 0;
      });

      let remainingQty = item.quantity;
      const deductions: BatchDeduction[] = [];

      for (const batch of sortedBatches) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, batch.remaining_quantity);

        if (deductQty > 0) {
          remainingQty -= deductQty;

          // CRITICAL: Update the quantity in the master allBatches list 
          // so the NEXT item in the loop sees the reduced stock.
          batch.remaining_quantity -= deductQty;

          await prismaTx.batches.update({
            where: { id: batch.id },
            data: { remaining_quantity: { decrement: deductQty } },
          });

          deductions.push({
            batch_id: batch.id,
            quantity: deductQty,
            unit: batch.unit_symbol,
          });
        }
      }

      if (remainingQty > 0) {
        throw new Error(`Insufficient stock for ${item.variantSku || item.productSku}. Requested: ${item.quantity}, Remaining: ${item.quantity - remainingQty}`);
      }

      results.push({ variant_id: variant.id, deductions });
    }
    return results;
  };

  if (tx) return await execute(tx);
  return await prisma.$transaction(execute);
};

export const restoreStock = async (items: StockItem[], tx?: Prisma.TransactionClient): Promise<void> => {
  const execute = async (prismaTx: Prisma.TransactionClient) => {
    for (const item of items) {
      const variant = await prismaTx.product_variant.findFirst({
        where: item.variantSku
          ? { sku: item.variantSku }
          : {
            product: { sku: item.productSku },
            size: item.size,
            color: item.color,
          },
        select: { id: true },
      });

      if (!variant) {
        throw new Error(
          `Variant not found for ${item.variantSku || `${item.productSku} ${item.size} ${item.color}`}`,
        );
      }

      // Restore to oldest batches first (FIFO reverse)
      const batches = await prismaTx.batches.findMany({
        where: {
          product_variant_id: variant.id,
          remaining_quantity: { lt: 0 },
        },
        orderBy: { manufacture_date: "asc" },
      });

      let remainingQty = item.quantity;
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const restoreQty = Math.min(remainingQty, -batch.remaining_quantity);
        remainingQty -= restoreQty;

        await prismaTx.batches.update({
          where: { id: batch.id },
          data: { remaining_quantity: batch.remaining_quantity + restoreQty },
        });
      }
    }
  };

  if (tx) {
    await execute(tx);
  } else {
    await prisma.$transaction(execute);
  }
};

export const getAvailableStock = async (
  productSku: string,
  size?: string,
  color?: string,
): Promise<number> => {
  const variant = await prisma.product_variant.findFirst({
    where: {
      product: { sku: productSku },
      size,
      color,
    },
    include: {
      batches: {
        where: { remaining_quantity: { gt: 0 } },
        select: { remaining_quantity: true },
      },
    },
  });

  if (!variant) return 0;

  return variant.batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
};
