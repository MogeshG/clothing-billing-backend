import { z } from "zod";

export const createVariantSchema = z.object({
  productId: z.string().uuid("Valid product ID").optional(),
  productSku: z.string().optional(),
  size: z.string().min(1, "Size required"),
  color: z.string().min(1, "Color required"),
  sku: z.string().optional(),
  price: z.number().positive("Price required").optional(),
  costPrice: z.number().positive("Cost price required").optional(),
  stock: z.number().int().min(0).default(0),
});

export const updateVariantSchema = createVariantSchema.partial();

createVariantSchema.refine((data) => data.productId || data.productSku, {
  message: "Provide productId or productSku",
});
