import { z } from "zod";

const purchaseItemSchema = z
  .object({
    item_name: z.string().min(1, "Item name required"),
    item_type: z.enum(["RAW", "FINISHED"]),
    sku: z.string().optional().or(z.undefined()),
    size: z.string().optional().or(z.undefined()),
    color: z.string().optional().or(z.undefined()),
    hsn_code: z.string().optional(),
    unit_id: z.string(),
    unit_name: z.string(),
    unit_symbol: z.string(),
    product_variant_id: z.string().optional(),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    cost_price: z.coerce.number().positive("Cost price must be positive"),
    mrp: z.coerce.number().min(0, "MRP must be non-negative").default(0),
    tax_inclusive: z.boolean(),
    cgst_percent: z
      .number()
      .min(0, "CGST percent cannot be negative")
      .default(0),
    sgst_percent: z
      .number()
      .min(0, "SGST percent cannot be negative")
      .default(0),
    igst_percent: z
      .number()
      .min(0, "IGST percent cannot be negative")
      .default(0),
    total: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.item_type === "FINISHED" && !data.product_variant_id) {
      ctx.addIssue({
        code: "custom",
        message: "product_variant_id required for FINISHED items",
        path: ["product_variant_id"],
      });
    }
  });

export const createPurchaseSchema = z.object({
  purchase_no: z
    .string()
    .min(1, "Purchase no required")
    .max(50)
    .or(z.literal("new")),
  vendor_name: z.string().optional(),
  vendor_phone: z.string().optional(),
  vendor_gstin: z.string().optional(),
  purchase_date: z.string().optional(),
  discount: z.number().min(0).default(0),
  status: z.string(),
  items: z.array(purchaseItemSchema).min(1, "At least one item required"),
});

export const updatePurchaseSchema = createPurchaseSchema
  .partial()
  .extend({
    items: z.array(purchaseItemSchema).optional(),
    purchase_no: z.string().optional(),
  })
  .refine((data) => data.items && data.items.length > 0, {
    message: "Items required for update",
    path: ["items"],
  })
  .or(z.object({})); // Allow empty for minimal updates
