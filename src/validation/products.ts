import { z } from "zod";

const productBaseSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  sku: z.string().min(1).max(50).optional(),
  hsn_code: z.string().min(1, "HSN code required").max(50),
  description: z.string().max(1000).optional(),

  category_id: z.string().uuid("Invalid category ID").optional(),

  brand: z.string().max(100).optional(),

  cgst_percent: z.coerce
    .number()
    .min(0, "CGST must be >= 0")
    .max(28, "CGST too high")
    .default(0),
  sgst_percent: z.coerce
    .number()
    .min(0, "SGST must be >= 0")
    .max(28, "SGST too high")
    .default(0),
  igst_percent: z.coerce
    .number()
    .min(0, "IGST must be >= 0")
    .max(28, "IGST too high")
    .default(0),

  tax_inclusive: z.boolean().default(false),
  is_active: z.boolean().default(true),
  is_deleted: z.boolean().optional(),
});

const variantSchema = z.object({
  size: z.string().min(1, "Size required").max(50),
  color: z.string().min(1, "Color required").max(50),
  barcode: z.string().min(1, "Barcode required").max(100),
  sku: z.string().max(50).optional().nullable(),
  cost_price: z.coerce.number().min(0, "Cost price must be >= 0"),
  selling_price: z.coerce.number().min(0, "Selling price must be >= 0"),
  mrp: z.coerce.number().min(0, "MRP must be >= 0"),
});

export const createProductSchema = productBaseSchema
  .extend({
    variants: z.array(variantSchema).min(1, "At least one variant required"),
  })
  .refine((data) => !!data.category_id, {
    message: "category_id is required",
    path: ["category_id"],
  });

export const updateProductSchema = productBaseSchema
  .partial()
  .omit({ is_deleted: true })
  .extend({
    variants: z.array(variantSchema).optional(),
  });
