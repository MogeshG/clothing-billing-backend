import { z } from "zod";

export const createCreditNoteSchema = z.object({
  creditNoteNo: z.string().optional(),
  invoiceId: z.string(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        productName: z.string(),
        productSku: z.string().optional(),
        quantity: z.number().int().min(1),
        refundAmount: z.number().min(0),
      }),
    )
    .min(1),
  totalRefund: z.number().min(0).optional(),
  reason: z.string().optional(),
});

export const updateCreditNoteSchema = createCreditNoteSchema
  .partial()
  .omit({ invoiceId: true });

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type UpdateCreditNoteInput = z.infer<typeof updateCreditNoteSchema>;
