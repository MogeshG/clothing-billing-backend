import { z } from "zod";

export const createInvoiceSchema = z.object({
  invoice_no: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_address: z.string().optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT"),
  items: z
    .array(
      z.object({
        product_name: z.string(),
        product_sku: z.string().optional().nullable(),
        variant_sku: z.string().optional().nullable(),
        batch_no: z.string().optional().nullable(),
        hsn_code: z.string().optional().nullable(),
        size: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        quantity: z.coerce.number().int().min(1),
        price: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).default(0),
        cgst_percent: z.coerce.number().min(0).default(0),
        sgst_percent: z.coerce.number().min(0).default(0),
        igst_percent: z.coerce.number().min(0).default(0),
        tax_inclusive: z.boolean().default(false),
      }),
    )
    .min(1),
  sub_total: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).optional(),
  total_amount: z.coerce.number().min(0).optional(),
  paid_amount: z.coerce.number().min(0).default(0),
  payment_method: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
});

export const finalizeInvoiceSchema = z.object({
  paid_amount: z.coerce.number().min(0),
  payment_method: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
});

export const updateDraftInvoiceSchema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_address: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  paid_amount: z.coerce.number().min(0).optional(),
  payment_method: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
  items: z
    .array(
      z.object({
        product_name: z.string(),
        product_sku: z.string().optional().nullable(),
        variant_sku: z.string().optional().nullable(),
        batch_no: z.string().optional().nullable(),
        hsn_code: z.string().optional().nullable(),
        size: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        quantity: z.coerce.number().int().min(1),
        price: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).default(0),
        cgst_percent: z.coerce.number().min(0).default(0),
        sgst_percent: z.coerce.number().min(0).default(0),
        igst_percent: z.coerce.number().min(0).default(0),
        tax_inclusive: z.boolean().default(false),
      }),
    )
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type FinalizeInvoiceInput = z.infer<typeof finalizeInvoiceSchema>;
export type UpdateDraftInvoiceInput = z.infer<typeof updateDraftInvoiceSchema>;
