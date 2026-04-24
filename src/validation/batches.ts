import { z } from "zod";

const batchItemSchema = z.object({
  batch_no: z.string().min(1, "Batch no required").max(50),
  product_variant_id: z.string().uuid("Valid product variant ID"),
  unit_id: z.string(),
  unit_name: z.string(),
  unit_symbol: z.string(),
  product_name: z.string(),
  variant_sku: z.string().optional(),
  hsn_code: z.string().optional(),
  barcode: z.string().min(1, "Barcode is required"),
  status: z.string().default("ACTIVE"),
  purchase_item_id: z.string().optional(),
  purchase_no: z.string().optional(),
  vendor_name: z.string().max(100).optional(),
  purchase_date: z.coerce.date().optional(),
  purchase_price: z.number().positive("Purchase price must be positive"),
  mrp: z.number().positive("MRP must be positive").default(0),
  selling_price: z.number().positive("Selling price must be positive").optional(),
  cgst_percent: z.number().min(0).default(0),
  sgst_percent: z.number().min(0).default(0),
  igst_percent: z.number().min(0).default(0),
  tax_inclusive: z.boolean().default(false),
  quantity: z.number().int().positive("Quantity must be positive"),
  remaining_quantity: z.number().int().min(0).default(0),
  manufacture_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
});

export const createBatchSchema = batchItemSchema;

export const createBulkBatchesSchema = z.object({
  batches: z.array(batchItemSchema).min(1, "At least one batch required"),
});

export const updateBatchSchema = z.object({
  status: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  purchase_price: z.coerce.number().positive().optional(),
  selling_price: z.coerce.number().positive().optional(),
  remaining_quantity: z.coerce.number().int().min(0).optional(),
  manufacture_date: z.coerce.date().optional().nullable(),
  expiry_date: z.coerce.date().optional().nullable(),
  vendor_name: z.string().max(100).optional(),
  tax_inclusive: z.boolean().optional(),
});
