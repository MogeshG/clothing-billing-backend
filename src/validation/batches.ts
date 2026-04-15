import { z } from "zod";

const batchItemSchema = z
  .object({
    batchNo: z.string().min(1, "Batch no required").max(50),
    productVariantId: z.string().uuid("Valid product variant ID").optional(),
    productSku: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    quantity: z.number().int().positive("Quantity must be positive"),
    purchasePrice: z.number().positive("Purchase price must be positive"),
    sellingPrice: z
      .number()
      .positive("Selling price must be positive")
      .optional(),
    remainingQuantity: z.number().int().min(0).default(0),
    manufactureDate: z.date().optional(),
    expiryDate: z.date().optional(),
    supplierName: z.string().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.productVariantId) return true;
      if (data.productSku && data.size && data.color) return true;
      return false;
    },
    {
      message: "Provide either productVariantId or (productSku + size + color)",
    },
  );

export const createBatchSchema = batchItemSchema;

export const createBulkBatchesSchema = z.object({
  batches: z.array(batchItemSchema).min(1, "At least one batch required"),
});

export const updateBatchSchema = z.object({
  productVariantId: z.string().uuid().optional(),
  quantity: z.number().int().positive().optional(),
  purchasePrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  remainingQuantity: z.number().int().min(0).optional(),
  manufactureDate: z.date().optional(),
  expiryDate: z.date().optional(),
  supplierName: z.string().max(100).optional(),
});
