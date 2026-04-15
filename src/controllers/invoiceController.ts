import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { deductStock, getAvailableStock } from "../lib/inventory";
import {
  createInvoiceSchema,
  finalizeInvoiceSchema,
  updateDraftInvoiceSchema,
  CreateInvoiceInput,
  FinalizeInvoiceInput,
} from "../validation/invoices";

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data: CreateInvoiceInput = parsed.data;

    // Auto-generate invoiceNo if not provided
    const invoiceNo = data.invoiceNo || `INV-${Date.now()}`;

    // Calculate totals
    let subTotal = 0;
    let taxAmount = 0;
    const itemsData = data.items.map((item) => {
      const itemTotal = item.quantity * item.price - item.discount;
      const gstAmount = (itemTotal * item.gstPercent) / 100;
      subTotal += itemTotal;
      taxAmount += gstAmount;
      return {
        ...item,
        total: itemTotal,
        gstAmount,
      };
    });

    const totalAmount = subTotal + taxAmount - data.discount;
    const balanceDue = totalAmount - data.paidAmount;

    const invoice = await prisma.invoices.create({
      data: {
        invoiceNo,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.customerAddress,
        subTotal,
        discount: data.discount,
        taxAmount,
        totalAmount,
        paidAmount: data.paidAmount,
        balanceDue,
        paymentMethod: data.paymentMethod,
        status: "DRAFT",
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      message: "Invoice created successfully (status: DRAFT)",
      invoice,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Invoice number already exists" });
    }
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { limit = 50, status } = req.query;
    const take = parseInt(limit as string) || 50;

    const where: any = {};
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoices.findMany({
        where,
        include: {
          items: true,
        },
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoices.count({ where }),
    ]);

    res.json({
      invoices,
      pagination: { total, limit: take },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

export const updateDraftInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updateDraftInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status !== "DRAFT") {
      return res
        .status(400)
        .json({ error: "Only DRAFT invoices can be updated" });
    }

    // Recalculate totals from current items (metadata-only update)
    let subTotal = 0;
    let taxAmount = 0;
    invoice.items.forEach((item) => {
      const itemTotal = item.quantity * item.price - item.discount;
      const gstAmount = (itemTotal * item.gstPercent) / 100;
      subTotal += itemTotal;
      taxAmount += gstAmount;
    });

    const discount = parsed.data.discount ?? invoice.discount;
    const paidAmount = parsed.data.paidAmount ?? invoice.paidAmount;
    const totalAmount = subTotal + taxAmount - discount;
    const balanceDue = totalAmount - paidAmount;

    const updatedInvoice = await prisma.invoices.update({
      where: { id },
      data: {
        customerName: parsed.data.customerName ?? invoice.customerName,
        customerPhone: parsed.data.customerPhone ?? invoice.customerPhone,
        customerEmail: parsed.data.customerEmail ?? invoice.customerEmail,
        customerAddress: parsed.data.customerAddress ?? invoice.customerAddress,
        discount,
        subTotal,
        taxAmount,
        totalAmount,
        paidAmount,
        balanceDue,
        paymentMethod: parsed.data.paymentMethod ?? invoice.paymentMethod,
      },
      include: { items: true },
    });

    res.json({ message: "Invoice updated", invoice: updatedInvoice });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to update invoice" });
  }
};

export const finalizeInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = finalizeInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status !== "DRAFT") {
      return res
        .status(400)
        .json({ error: "Only DRAFT invoices can be finalized" });
    }

    // Prepare stock deduction: filter items with productSku
    const stockItems = invoice.items
      .filter((item) => item.productSku)
      .map((item) => ({
        productSku: item.productSku!,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      }));

    if (stockItems.length > 0) {
      // Deduct stock FIFO
      await deductStock(stockItems);
    }

    // Update payment/balance
    const paidAmount = parsed.data.paidAmount ?? invoice.paidAmount;
    const balanceDue = invoice.totalAmount - paidAmount;
    const paymentMethod = parsed.data.paymentMethod ?? invoice.paymentMethod;

    // Finalize invoice (no audit - model missing)
    await prisma.$transaction(async (tx) => {
      await tx.invoices.update({
        where: { id },
        data: {
          status: "FINALIZED",
          paidAmount,
          balanceDue,
          paymentMethod,
        },
      });
    });

    const finalized = await prisma.invoices.findUnique({
      where: { id },
      include: { items: true },
    });

    res.json({ message: "Invoice finalized successfully", invoice: finalized });
  } catch (error: any) {
    if (error.message?.includes("Insufficient stock")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to finalize invoice" });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const invoice = await prisma.invoices.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "FINALIZED") {
      return res.status(400).json({ error: "Cannot delete finalized invoice" });
    }

    await prisma.invoices.delete({
      where: { id },
    });

    res.json({ message: "Invoice deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};
