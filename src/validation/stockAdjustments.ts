import { z } from "zod";

export const createStockAdjustmentSchema = z.object({
  product_variant_id: z.string().uuid(),
  product_name: z.string(),
  variant_sku: z.string().optional().nullable(),
  batch_no: z.string().optional().nullable(),
  type: z.enum(["+", "-"]),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
});
