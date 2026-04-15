import { z } from "zod";

export const createInvoiceSchema = z.object({
  invoiceNo: z.string().optional(), // Auto-gen if empty
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        productName: z.string(),
        productSku: z.string(),
        variantSku: z.string().optional(),
        size: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
        discount: z.number().min(0).default(0),
        gstPercent: z.number().min(0).max(28).default(0),
      }),
    )
    .min(1),
  subTotal: z.number().min(0).optional(),
  discount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
});

export const finalizeInvoiceSchema = z.object({
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
});

export const updateDraftInvoiceSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerAddress: z.string().optional(),
  discount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK", "CREDIT"]).optional(),
  // Items editable only in DRAFT
  items: z
    .array(
      z.object({
        productName: z.string(),
        productSku: z.string(),
        variantSku: z.string().optional(),
        size: z.string().optional(),
        color: z.string().optional(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
        discount: z.number().min(0).default(0),
        gstPercent: z.number().min(0).max(28).default(0),
      }),
    )
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type FinalizeInvoiceInput = z.infer<typeof finalizeInvoiceSchema>;
export type UpdateDraftInvoiceInput = z.infer<typeof updateDraftInvoiceSchema>;
