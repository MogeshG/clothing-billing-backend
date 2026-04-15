import { z } from "zod";

const productBaseSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),

  description: z.string().max(1000).optional(),

  categoryId: z.string().uuid().optional(),
  categoryKey: z.string().optional(),

  brand: z.string().optional(),
  barcode: z.string().optional(),

  basePrice: z.number().positive(),
  costPrice: z.number().positive().optional(),
  mrp: z.number().positive(),

  gstPercent: z.number().min(0).max(28).default(0),
  taxInclusive: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createProductSchema = productBaseSchema.refine(
  (data) => data.categoryId || data.categoryKey,
  {
    message: "Provide categoryId or categoryKey",
    path: ["categoryId"],
  },
);

export const updateProductSchema = productBaseSchema
  .omit({ sku: true })
  .partial();
