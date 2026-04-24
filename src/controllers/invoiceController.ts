import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { deductStock } from "../lib/inventory";
import dayjs from "dayjs";
import ejs from "ejs";
import path from "path";
import {
  createInvoiceSchema,
  finalizeInvoiceSchema,
  updateDraftInvoiceSchema,
} from "../validation/invoices";

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data = parsed.data;
    const is_completed = data.status === "COMPLETED";

    // Auto-generate sequential invoice_no if not provided
    let invoice_no = data.invoice_no;
    if (!invoice_no) {
      if (!is_completed) {
        invoice_no = `DRAFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      } else {
        const todayStr = dayjs().format("YYYYMMDD");
        // Get the lexicographically largest invoice_no for today
        const lastInvoice = await prisma.invoices.findFirst({
          where: { invoice_no: { startsWith: `INV-${todayStr}-` }, status: "COMPLETED" },
          orderBy: { created_at: 'desc' },
          select: { invoice_no: true }
        });

        let nextSeq = 1;
        if (lastInvoice) {
          const parts = lastInvoice.invoice_no.split('-');
          if (parts.length === 3) {
            const parsedSeq = parseInt(parts[2], 10);
            console.log(parts)
            if (!isNaN(parsedSeq)) {
              nextSeq = parsedSeq + 1;
            }
          }
        }
        invoice_no = `INV-${todayStr}-${nextSeq.toString().padStart(3, '0')}`;
      }
    }

    // Calculate totals and items
    let sub_total = 0;
    let tax_amount = 0;

    const items_input = data.items.map((item: any) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      const discount = Number(item.discount || 0);
      const cgst_percent = Number(item.cgst_percent || 0);
      const sgst_percent = Number(item.sgst_percent || 0);
      const igst_percent = Number(item.igst_percent || 0);
      const tax_inclusive = item.tax_inclusive || false;

      const total_tax_percent = cgst_percent + sgst_percent + igst_percent;
      const line_amount = (price * quantity) - discount;

      let base_amount;
      if (tax_inclusive) {
        base_amount = line_amount / (1 + total_tax_percent / 100);
      } else {
        base_amount = line_amount;
      }

      const cgst_amount = base_amount * (cgst_percent / 100);
      const sgst_amount = base_amount * (sgst_percent / 100);
      const igst_amount = base_amount * (igst_percent / 100);
      const total_tax_amount = cgst_amount + sgst_amount + igst_amount;

      sub_total += base_amount;
      tax_amount += total_tax_amount;

      return {
        product_name: item.product_name,
        product_sku: item.product_sku,
        variant_sku: item.variant_sku,
        batch_no: item.batch_no,
        hsn_code: item.hsn_code || "",
        size: item.size,
        color: item.color,
        quantity,
        unit: item.unit || "PCS",
        price,
        discount,
        cgst_percent,
        sgst_percent,
        igst_percent,
        tax_inclusive,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total: base_amount + total_tax_amount,
      };
    });

    const total_amount = sub_total + tax_amount - (data.discount || 0);
    const balance_due = total_amount - (data.paid_amount || 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const invoice = await tx.invoices.create({
        data: {
          invoice_no,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          customer_address: data.customer_address,
          sub_total,
          discount: data.discount || 0,
          tax_amount,
          total_amount,
          paid_amount: data.paid_amount || 0,
          balance_due,
          payment_method: data.payment_method || "CASH",
          status: data.status || "DRAFT",
          items: {
            create: items_input,
          },
        },
        include: {
          items: true,
        },
      });

      // 2. If Completed, deduct stock and record movements
      if (is_completed) {
        const movement_records = await deductStock(invoice.items.map(item => ({
          productSku: item.product_sku || "",
          variantSku: item.variant_sku,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          batchNo: item.batch_no,
        })), tx);

        for (let i = 0; i < invoice.items.length; i++) {
          const item = invoice.items[i];
          const record = movement_records[i];

          await tx.stock_movement.create({
            data: {
              product_variant_id: record.variant_id,
              product_name: item.product_name,
              variant_sku: item.variant_sku,
              type: "SALE",
              quantity: -item.quantity,
              unit: item.unit,
              invoice_item_id: item.id,
              items: {
                create: record.deductions.map(d => ({
                  batch_id: d.batch_id,
                  quantity: -d.quantity,
                  unit: d.unit
                }))
              }
            },
          });
        }
      }

      return invoice;
    });

    res.status(201).json({
      message: is_completed ? "Invoice completed successfully" : "Invoice created as DRAFT",
      invoice: result,
    });
  } catch (error: any) {
    console.error("Create Invoice Error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Invoice number already exists" });
    }
    if (error.message?.includes("Insufficient stock")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create invoice", details: error.message });
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
        orderBy: { created_at: "desc" },
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

    let sub_total = 0;
    let tax_amount = 0;
    let items_to_create: any[] = [];

    if (parsed.data.items) {
      // Process new items
      items_to_create = parsed.data.items.map((item: any) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const discount = Number(item.discount || 0);
        const cgst_percent = Number(item.cgst_percent || 0);
        const sgst_percent = Number(item.sgst_percent || 0);
        const igst_percent = Number(item.igst_percent || 0);
        const tax_inclusive = item.tax_inclusive || false;

        const total_tax_percent = cgst_percent + sgst_percent + igst_percent;
        const line_amount = (price * quantity) - discount;

        let base_amount;
        if (tax_inclusive) {
          base_amount = line_amount / (1 + total_tax_percent / 100);
        } else {
          base_amount = line_amount;
        }

        const cgst_amount = base_amount * (cgst_percent / 100);
        const sgst_amount = base_amount * (sgst_percent / 100);
        const igst_amount = base_amount * (igst_percent / 100);
        const total_tax_amount = cgst_amount + sgst_amount + igst_amount;

        sub_total += base_amount;
        tax_amount += total_tax_amount;

        return {
          product_name: item.product_name,
          product_sku: item.product_sku,
          variant_sku: item.variant_sku,
          batch_no: item.batch_no,
          hsn_code: item.hsn_code || "",
          size: item.size,
          color: item.color,
          quantity,
          unit: item.unit || "PCS",
          price,
          discount,
          cgst_percent,
          sgst_percent,
          igst_percent,
          tax_inclusive,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total: base_amount + total_tax_amount,
        };
      });
    } else {
      // Use existing items for total calculation
      invoice.items.forEach((item: any) => {
        const price = Number(item.price);
        const quantity = Number(item.quantity);
        const discount = Number(item.discount || 0);
        const cgst_percent = Number(item.cgst_percent || 0);
        const sgst_percent = Number(item.sgst_percent || 0);
        const igst_percent = Number(item.igst_percent || 0);
        const tax_inclusive = item.tax_inclusive || false;

        const total_tax_percent = cgst_percent + sgst_percent + igst_percent;
        const line_amount = (price * quantity) - discount;

        let base_amount;
        if (tax_inclusive) {
          base_amount = line_amount / (1 + total_tax_percent / 100);
        } else {
          base_amount = line_amount;
        }

        const total_tax_amount = base_amount * (total_tax_percent / 100);

        sub_total += base_amount;
        tax_amount += total_tax_amount;
      });
    }

    const discount = parsed.data.discount ?? Number(invoice.discount);
    const paid_amount = parsed.data.paid_amount ?? Number(invoice.paid_amount);
    const total_amount = sub_total + tax_amount - discount;
    const balance_due = total_amount - paid_amount;

    const updated_invoice = await prisma.$transaction(async (tx) => {
      if (parsed.data.items) {
        // 1. Delete old items
        await tx.invoice_item.deleteMany({
          where: { invoice_id: id },
        });

        // 2. Create new items
        await tx.invoice_item.createMany({
          data: items_to_create.map(item => ({ ...item, invoice_id: id })),
        });
      }

      // 3. Update invoice header
      return await tx.invoices.update({
        where: { id },
        data: {
          customer_name: parsed.data.customer_name ?? invoice.customer_name,
          customer_phone: parsed.data.customer_phone ?? invoice.customer_phone,
          customer_email: parsed.data.customer_email ?? invoice.customer_email,
          customer_address: parsed.data.customer_address ?? invoice.customer_address,
          discount,
          sub_total,
          tax_amount,
          total_amount,
          paid_amount,
          balance_due,
          payment_method: parsed.data.payment_method ?? invoice.payment_method,
        },
        include: { items: true },
      });
    });

    res.json({ message: "Invoice updated", invoice: updated_invoice });
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

    const finalized = await prisma.$transaction(async (tx) => {
      // Prepare stock deduction and record movements
      for (const item of invoice.items) {
        const movement_records = await deductStock([{
          productSku: item.product_sku || "",
          variantSku: item.variant_sku,
          size: item.size,
          color: item.color,
          quantity: item.quantity
        }], tx);

        const record = movement_records[0];

        await tx.stock_movement.create({
          data: {
            product_variant_id: record.variant_id,
            product_name: item.product_name,
            variant_sku: item.variant_sku,
            type: "SALE",
            quantity: -item.quantity,
            unit: item.unit,
            invoice_item_id: item.id,
            items: {
              create: record.deductions.map(d => ({
                batch_id: d.batch_id,
                quantity: -d.quantity,
                unit: d.unit
              }))
            }
          },
        });
      }

      const paid_amount = parsed.data.paid_amount ?? Number(invoice.paid_amount);
      const balance_due = Number(invoice.total_amount) - paid_amount;
      const payment_method = parsed.data.payment_method ?? invoice.payment_method;

      let new_invoice_no = invoice.invoice_no;
      if (new_invoice_no.startsWith("DRAFT-")) {
        const todayStr = dayjs().format("YYYYMMDD");
        const lastInvoice = await tx.invoices.findFirst({
          where: { invoice_no: { startsWith: `INV-${todayStr}-` } },
          orderBy: { invoice_no: 'desc' },
          select: { invoice_no: true }
        });

        let nextSeq = 1;
        if (lastInvoice) {
          const parts = lastInvoice.invoice_no.split('-');
          if (parts.length === 3) {
            const parsedSeq = parseInt(parts[2], 10);
            if (!isNaN(parsedSeq)) {
              nextSeq = parsedSeq + 1;
            }
          }
        }
        new_invoice_no = `INV-${todayStr}-${nextSeq.toString().padStart(3, '0')}`;
      }

      const finalized = await tx.invoices.update({
        where: { id },
        data: {
          status: "COMPLETED",
          invoice_no: new_invoice_no,
          paid_amount,
          balance_due,
          payment_method,
        },
        include: { items: true },
      });

      // Stock deduction
      const movement_records = await deductStock(finalized.items.map(item => ({
        productSku: item.product_sku || "",
        variantSku: item.variant_sku,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        batchNo: item.batch_no,
      })), tx);

      for (let i = 0; i < finalized.items.length; i++) {
        const item = finalized.items[i];
        const record = movement_records[i];

        await tx.stock_movement.create({
          data: {
            product_variant_id: record.variant_id,
            product_name: item.product_name,
            variant_sku: item.variant_sku,
            type: "SALE",
            quantity: -item.quantity,
            unit: item.unit,
            invoice_item_id: item.id,
            items: {
              create: record.deductions.map(d => ({
                batch_id: d.batch_id,
                quantity: -d.quantity,
                unit: d.unit
              }))
            }
          },
        });
      }

      return finalized;
    });

    res.json({ message: "Invoice completed successfully", invoice: finalized });
  } catch (error: any) {
    if (error.message?.includes("Insufficient stock")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to finalize invoice", details: error.message });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const invoice = await prisma.invoices.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "COMPLETED") {
      return res.status(400).json({ error: "Cannot delete finalized invoice" });
    }

    await prisma.$transaction([
      prisma.invoice_item.deleteMany({
        where: { invoice_id: id },
      }),
      prisma.invoices.delete({
        where: { id },
      }),
    ]);

    res.json({ message: "Invoice deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};

export const getInvoiceBill = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const type = req.query.type as string || "a4"; // Default to a4

    const invoice = await prisma.invoices.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Fetch all preferences
    const preferences = await prisma.preferences.findMany();
    const settings = preferences.reduce((acc: any, pref) => {
      acc[pref.key] = pref.value;
      return acc;
    }, {});

    const templateName = type === "thermal" ? "thermal_invoice.ejs" : "a4_invoice.ejs";
    const templatePath = path.join(__dirname, "..", "views", templateName);

    const html = await ejs.renderFile(templatePath, { invoice, settings });

    res.json({ html });
  } catch (error: any) {
    console.error("Error generating bill:", error);
    res.status(500).json({ error: "Failed to generate bill", details: error.message });
  }
};