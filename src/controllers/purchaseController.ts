import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createPurchaseSchema } from "../validation/purchases";

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const parsed = createPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const {
      purchaseNo,
      supplierName,
      supplierPhone,
      supplierGstin,
      discount,
      items,
    } = parsed.data;

    // Compute totals
    let subTotal = 0;
    let taxAmount = 0;
    const itemTotals = items.map((item) => {
      const itemSub = item.quantity * item.price;
      const itemGst = itemSub * (item.gstPercent / 100);
      const itemTotal = itemSub + itemGst;
      subTotal += itemSub;
      taxAmount += itemGst;
      return { ...item, total: itemTotal };
    });

    const totalAmount = subTotal - discount + taxAmount;

    // Create purchase
    const purchase = await prisma.purchases.create({
      data: {
        purchaseNo,
        supplierName,
        supplierPhone,
        supplierGstin,
        subTotal,
        discount,
        taxAmount,
        totalAmount,
        status: "DRAFT",
      },
    });

    // Create items
    const purchaseItems = await Promise.all(
      itemTotals.map((item) =>
        prisma.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            itemName: item.itemName,
            sku: item.sku,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price,
            gstPercent: item.gstPercent,
            total: item.total,
          },
        }),
      ),
    );

    res.status(201).json({
      message: "Purchase created successfully (status: DRAFT)",
      purchase,
      items: purchaseItems,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Purchase number already exists" });
    }
    res.status(500).json({ error: "Failed to create purchase" });
  }
};

export const getPurchases = async (req: Request, res: Response) => {
  const purchases = await prisma.purchases.findMany({
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  res.json(purchases);
};

export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await prisma.purchases.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePurchaseStatus = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;
    const purchase = await prisma.purchases.update({
      where: { id },
      data: { status },
    });
    res.json({ message: "Purchase status updated", purchase });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
