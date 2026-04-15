import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { restoreStock } from "../lib/inventory";
import {
  createCreditNoteSchema,
  updateCreditNoteSchema,
  CreateCreditNoteInput,
} from "../validation/creditNotes";

export const createCreditNote = async (req: Request, res: Response) => {
  try {
    const parsed = createCreditNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data: CreateCreditNoteInput = parsed.data;

    // Auto-gen
    const creditNoteNo = data.creditNoteNo || `CN-${Date.now()}`;

    // Calc total
    let totalRefund = 0;
    if (!data.totalRefund) {
      totalRefund = data.items.reduce(
        (sum, item) => sum + item.refundAmount,
        0,
      );
    } else {
      totalRefund = data.totalRefund;
    }

    const creditNote = await prisma.creditNotes.create({
      data: {
        creditNoteNo,
        invoiceId: data.invoiceId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        totalRefund,
        reason: data.reason,
        status: "DRAFT",
        items: {
          create: data.items,
        },
      },
      include: {
        items: true,
        invoice: true,
      },
    });

    res.status(201).json({
      message: "Credit note created (status: DRAFT)",
      creditNote,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Credit note number already exists" });
    }
    res.status(500).json({ error: "Failed to create credit note" });
  }
};

export const getCreditNotes = async (req: Request, res: Response) => {
  try {
    const creditNotes = await prisma.creditNotes.findMany({
      include: {
        items: true,
        invoice: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(creditNotes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch credit notes" });
  }
};

export const getCreditNoteById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const creditNote = await prisma.creditNotes.findUnique({
      where: { id },
      include: { items: true, invoice: true },
    });
    if (!creditNote)
      return res.status(404).json({ error: "Credit note not found" });
    res.json(creditNote);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch credit note" });
  }
};

export const updateCreditNote = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateCreditNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const creditNote = await prisma.creditNotes.findUnique({ where: { id } });
    if (!creditNote)
      return res.status(404).json({ error: "Credit note not found" });
    if (creditNote.status !== "DRAFT") {
      return res
        .status(400)
        .json({ error: "Only DRAFT credit notes can be updated" });
    }

    // Update only metadata (items handled separately if needed)
    const data = {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      totalRefund: parsed.data.totalRefund,
      reason: parsed.data.reason,
    };

    const updated = await prisma.creditNotes.update({
      where: { id },
      data,
      include: { items: true },
    });

    res.json({ message: "Credit note updated", creditNote: updated });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update credit note" });
  }
};

export const approveCreditNote = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const creditNote = await prisma.creditNotes.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!creditNote)
      return res.status(404).json({ error: "Credit note not found" });
    if (creditNote.status !== "DRAFT") {
      return res
        .status(400)
        .json({ error: "Only DRAFT credit notes can be approved" });
    }

    // Stock restore items - filter items with productSku only
    const stockItems = creditNote.items
      .filter((item) => item.productSku)
      .map((item) => ({
        productSku: item.productSku!,
        size: undefined,
        color: undefined,
        quantity: item.quantity,
      }));

    if (stockItems.length > 0) {
      await restoreStock(stockItems);
    }

    const approved = await prisma.creditNotes.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    res.json({
      message: "Credit note approved - stock restored",
      creditNote: approved,
    });
  } catch (error: any) {
    if (
      error.message?.includes("Variant not found") ||
      error.message?.includes("Insufficient stock")
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Credit note not found" });
    }
    res.status(500).json({ error: "Failed to approve credit note" });
  }
};

export const deleteCreditNote = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const creditNote = await prisma.creditNotes.findUnique({ where: { id } });
    if (!creditNote || creditNote.status === "APPROVED") {
      return res
        .status(400)
        .json({ error: "Cannot delete approved credit note" });
    }

    await prisma.creditNotes.delete({ where: { id } });
    res.json({ message: "Credit note deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Credit note not found" });
    }
    res.status(500).json({ error: "Failed to delete credit note" });
  }
};
