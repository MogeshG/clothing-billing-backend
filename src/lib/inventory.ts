import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

interface StockItem {
  productSku: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}

export const deductStock = async (items: StockItem[]): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      // Find variant by productSku + size/color
      const variant = await tx.productVariant.findFirst({
        where: {
          product: { sku: item.productSku },
          size: item.size,
          color: item.color,
        },
        select: { id: true },
      });

      if (!variant) {
        throw new Error(
          `Variant not found for ${item.productSku} ${item.size} ${item.color}`,
        );
      }

      // FIFO: deduct from oldest batches first
      const batches = await tx.batches.findMany({
        where: {
          productVariantId: variant.id,
          remainingQuantity: { gt: 0 },
        },
        orderBy: { manufactureDate: "asc" },
      });

      let remainingQty = item.quantity;
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const deductQty = Math.min(remainingQty, batch.remainingQuantity);
        remainingQty -= deductQty;

        await tx.batches.update({
          where: { id: batch.id },
          data: { remainingQuantity: batch.remainingQuantity - deductQty },
        });
      }

      if (remainingQty > 0) {
        throw new Error(
          `Insufficient stock for ${item.productSku}: need ${item.quantity}, available ${item.quantity - remainingQty}`,
        );
      }
    }
  });
};

export const restoreStock = async (items: StockItem[]): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const variant = await tx.productVariant.findFirst({
        where: {
          product: { sku: item.productSku },
          size: item.size,
          color: item.color,
        },
        select: { id: true },
      });

      if (!variant) {
        throw new Error(
          `Variant not found for ${item.productSku} ${item.size} ${item.color}`,
        );
      }

      // Restore to oldest batches first (FIFO reverse)
      const batches = await tx.batches.findMany({
        where: {
          productVariantId: variant.id,
          remainingQuantity: { lt: 0 }, // Only batches that were deducted from
        },
        orderBy: { manufactureDate: "asc" },
      });

      let remainingQty = item.quantity;
      for (const batch of batches) {
        if (remainingQty <= 0) break;

        const restoreQty = Math.min(remainingQty, -batch.remainingQuantity); // Negative for deducted
        remainingQty -= restoreQty;

        await tx.batches.update({
          where: { id: batch.id },
          data: { remainingQuantity: batch.remainingQuantity + restoreQty },
        });
      }
    }
  });
};

export const getAvailableStock = async (
  productSku: string,
  size?: string,
  color?: string,
): Promise<number> => {
  const variant = await prisma.productVariant.findFirst({
    where: {
      product: { sku: productSku },
      size,
      color,
    },
    include: {
      batches: {
        where: { remainingQuantity: { gt: 0 } },
        select: { remainingQuantity: true },
      },
    },
  });

  if (!variant) return 0;

  return variant.batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
};
