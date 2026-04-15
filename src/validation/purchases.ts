import { z } from "zod";

const purchaseItemSchema = z
  .object({
    itemName: z.string().min(1, "Item name required"),
    sku: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    quantity: z.number().positive("Quantity must be positive"),
    price: z.number().positive("Price must be positive"),
    gstPercent: z.number().min(0, "GST percent cannot be negative").default(0),
  })
  .refine(
    (data) => data.quantity > 0 && data.price > 0,
    "Valid quantity and price required",
  );

export const createPurchaseSchema = z.object({
  purchaseNo: z.string().min(1, "Purchase no required").max(50),
  supplierName: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierGstin: z.string().optional(),
  discount: z.number().min(0).default(0),
  items: z.array(purchaseItemSchema).min(1, "At least one item required"),
});
