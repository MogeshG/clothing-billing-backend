import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createStockAdjustmentSchema } from "../validation/stockAdjustments";

export const getStockAdjustments = async (req: Request, res: Response) => {
  try {
    const adjustments = await prisma.stock_adjustments.findMany({
      orderBy: { created_at: "desc" },
    });
    res.json(adjustments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stock adjustments" });
  }
};

export const createStockAdjustment = async (req: Request, res: Response) => {
  try {
    const parsed = createStockAdjustmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const {
      product_variant_id,
      product_name,
      variant_sku,
      batch_no,
      type,
      quantity,
      reason,
      created_by,
    } = parsed.data;

    // We assume product_variant_id passed from frontend is actually the BATCH ID 
    // because that's how the frontend was mock-coded.
    // Let's verify if a batch exists with this ID or batch_no

    const batch = await prisma.batches.findFirst({
      where: {
        OR: [
          { id: product_variant_id },
          { batch_no: batch_no || "" }
        ]
      },
      include: {
        product_variant: true
      }
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const adjustmentQty = type === "+" ? quantity : -quantity;
    const newRemainingQty = batch.remaining_quantity + adjustmentQty;

    if (newRemainingQty < 0) {
      return res.status(400).json({ error: "Insufficient stock in batch" });
    }

    // Transaction to update batch and create adjustment record
    const [adjustment, updatedBatch, movement] = await prisma.$transaction([
      prisma.stock_adjustments.create({
        data: {
          product_variant_id: batch.product_variant_id,
          product_name: product_name || batch.product_name,
          variant_sku: variant_sku || batch.variant_sku,
          batch_no: batch.batch_no,
          type,
          quantity,
          unit: batch.unit_symbol,
          reason,
          created_by,
        },
      }),
      prisma.batches.update({
        where: { id: batch.id },
        data: { remaining_quantity: newRemainingQty },
      }),
      prisma.stock_movement.create({
        data: {
          product_variant_id: batch.product_variant_id,
          product_name: batch.product_name,
          variant_sku: batch.variant_sku,
          type: "ADJUSTMENT",
          quantity: adjustmentQty,
          unit: batch.unit_symbol,
          items: {
            create: {
              batch_id: batch.id,
              quantity: adjustmentQty,
              unit: batch.unit_symbol,
            },
          },
        },
      }),
    ]);

    res.status(201).json({
      message: "Stock adjustment created successfully",
      adjustment,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      error: "Failed to create stock adjustment",
      details: error.message
    });
  }
};

export const getBatchesForAdjustment = async (req: Request, res: Response) => {
  try {
    const batches = await prisma.batches.findMany({
      where: {
        remaining_quantity: { gt: 0 },
        status: "ACTIVE",
      },
      orderBy: { created_at: "desc" },
    });
    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch batches for adjustment" });
  }
};
