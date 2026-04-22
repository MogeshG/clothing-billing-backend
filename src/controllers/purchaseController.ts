import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";
import {
  createPurchaseSchema,
  updatePurchaseSchema,
} from "../validation/purchases";

console.log(1);

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const parsed = createPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log(parsed.error);
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const {
      purchase_no,
      vendor_name,
      vendor_phone,
      vendor_gstin,
      purchase_date,
      discount,
      items,
      status,
    } = parsed.data;

    let finalPurchaseNo = purchase_no;
    if (purchase_no === "new") {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      finalPurchaseNo = `PURCH-${dateStr}-${randomNum}`;
    }

    // Compute totals (proper tax_inclusive handling, CGST+SGST tax)
    let subTotal = 0;
    let taxAmount = 0;
    const itemTotals = items.map((item) => {
      const qty = item.quantity;
      const price = item.cost_price;
      const cgst = item.cgst_percent;
      const sgst = item.sgst_percent;
      const igst = item.igst_percent || 0;
      const taxRate = (cgst + sgst) / 100;
      const taxInclusive = item.tax_inclusive;

      let itemSub, itemTax, itemTotal;
      if (taxInclusive) {
        itemSub = (price / (1 + taxRate)) * qty;
      } else {
        itemSub = price * qty;
      }
      itemTax = itemSub * taxRate;
      itemTotal = itemSub + itemTax;

      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, total: itemTotal };
    });
    const totalAmount = subTotal - (discount || 0) + taxAmount;

    // Create purchase
    const purchaseDateValue = purchase_date
      ? new Date(purchase_date)
      : new Date();

    const purchase = await prisma.purchases.create({
      data: {
        purchase_no: finalPurchaseNo,
        vendor_name: vendor_name,
        vendor_phone: vendor_phone,
        vendor_gstin: vendor_gstin,
        purchase_date: purchaseDateValue,
        sub_total: subTotal,
        discount: discount || 0,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: status,
      },
    });
    const purchaseItemsData = itemTotals.map((item) => ({
      purchase_id: purchase.id,
      item_name: item.item_name,
      item_type: item.item_type,
      sku: item.sku || null,
      size: item.size || null,
      color: item.color || null,
      hsn_code: item.hsn_code || null,
      product_variant_id: item.product_variant_id || null,
      quantity: item.quantity,
      unit_id: item.unit_id,
      unit_symbol: item.unit_symbol,
      unit_name: item.unit_name,
      cost_price: item.cost_price,
      cgst_percent: item.cgst_percent,
      sgst_percent: item.sgst_percent,
      igst_percent: item.igst_percent || 0,
      total: item.total,
    }));

    const purchaseItems = await Promise.all(
      purchaseItemsData.map((itemData) =>
        prisma.purchase_item.create({
          data: itemData,
        }),
      ),
    );

    // Create batches for FINISHED items only if COMPLETED
    const batches = [];
    if (status === "COMPLETED") {
      for (let index = 0; index < purchaseItems.length; index++) {
        const purchaseItem = purchaseItems[index];
        const inputItem = itemTotals[index];
        if (
          inputItem.item_type === "FINISHED" &&
          inputItem.product_variant_id
        ) {
          const batchNo = `${purchase.purchase_no}-B${index + 1}`;
          const batch = await prisma.batches.create({
            data: {
              product_variant_id: inputItem.product_variant_id,
              unit_id: purchaseItem.unit_id,
              unit_name: purchaseItem.unit_name,
              unit_symbol: purchaseItem.unit_symbol,
              product_name: inputItem.item_name,
              variant_sku: inputItem.sku,
              hsn_code: inputItem.hsn_code,
              batch_no: batchNo,
              barcode: randomUUID(),
              status: "PENDING",
              purchase_item_id: purchaseItem.id,
              purchase_no: purchase.purchase_no,
              vendor_name: vendor_name || "",
              purchase_date: purchaseDateValue,
              purchase_price: inputItem.cost_price,
              selling_price: 0,
              cgst_percent: inputItem.cgst_percent,
              sgst_percent: inputItem.sgst_percent,
              igst_percent: inputItem.igst_percent,
              quantity: inputItem.quantity,
              remaining_quantity: inputItem.quantity,
            },
          });
          batches.push(batch);
        }
      }
    }

    res.status(201).json({
      message: "Purchase created successfully",
      purchase,
      items: purchaseItems,
      batches,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Purchase number already exists" });
    }
    if (error.code === "P2002" && error.meta?.target?.includes("batch_no")) {
      return res.status(409).json({ error: "Batch number already exists" });
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
      created_at: "desc",
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

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updatePurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log(parsed.error);
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data = req.body;
    if (!data.items || data.items.length === 0) {
      return res.status(400).json({
        error: "At least one item and purchase_no required for update",
      });
    }
    const {
      purchase_no,
      vendor_name,
      vendor_phone,
      vendor_gstin,
      purchase_date,
      discount,
      items,
      status = "COMPLETED",
    } = data;

    let finalPurchaseNo =
      purchase_no ||
      `PURCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 10000,
      )
        .toString()
        .padStart(4, "0")}`;

    // Compute totals like create
    let subTotal = 0;
    let taxAmount = 0;
    const itemTotals = items.map((item) => {
      const qty = item.quantity;
      const price = item.cost_price;
      const cgst = item.cgst_percent;
      const sgst = item.sgst_percent;
      const igst = item.igst_percent || 0;
      const taxRate = (cgst + sgst) / 100;
      const taxInclusive = item.tax_inclusive;

      let itemSub, itemTax, itemTotal;
      if (taxInclusive) {
        itemSub = (price / (1 + taxRate)) * qty;
      } else {
        itemSub = price * qty;
      }
      itemTax = itemSub * taxRate;
      itemTotal = itemSub + itemTax;

      subTotal += itemSub;
      taxAmount += itemTax;
      return { ...item, total: itemTotal };
    });
    const totalAmount = subTotal - (discount || 0) + taxAmount;

    const purchaseDateValue = purchase_date
      ? new Date(purchase_date)
      : new Date();

    // Update purchase header
    const purchase = await prisma.purchases.update({
      where: { id },
      data: {
        purchase_no: finalPurchaseNo,
        vendor_name,
        vendor_phone,
        vendor_gstin,
        purchase_date: purchaseDateValue,
        sub_total: subTotal,
        discount: discount || 0,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status,
      },
    });

    // Delete existing purchase_items
    await prisma.purchase_item.deleteMany({
      where: { purchase_id: id },
    });

    // Create new purchase_items
    const purchaseItemsData = itemTotals.map((item) => ({
      purchase_id: id,
      item_name: item.item_name,
      item_type: item.item_type,
      sku: item.sku || null,
      size: item.size || null,
      color: item.color || null,
      hsn_code: item.hsn_code || null,
      product_variant_id: item.product_variant_id || null,
      quantity: item.quantity,
      unit_id: item.unit_id,
      unit_symbol: item.unit_symbol,
      unit_name: item.unit_name,
      cost_price: item.cost_price,
      cgst_percent: item.cgst_percent,
      sgst_percent: item.sgst_percent,
      igst_percent: item.igst_percent || 0,
      total: item.total,
    }));

    const purchaseItems = await Promise.all(
      purchaseItemsData.map((itemData) =>
        prisma.purchase_item.create({
          data: itemData,
        }),
      ),
    );

    // Delete existing batches for this purchase and recreate for FINISHED
    await prisma.batches.deleteMany({
      where: {
        purchase_item_id: {
          in: purchaseItems.map((pi) => pi.id),
        },
      },
    });

    // Create new batches only if COMPLETED
    const batches = [];
    if (status === "COMPLETED") {
      for (let index = 0; index < purchaseItems.length; index++) {
        const purchaseItem = purchaseItems[index];
        const inputItem = itemTotals[index];
        if (
          inputItem.item_type === "FINISHED" &&
          inputItem.product_variant_id
        ) {
          const batchNo = `${purchase.purchase_no}-B${index + 1}`;
          const batch = await prisma.batches.create({
            data: {
              product_variant_id: inputItem.product_variant_id,
              unit_id: purchaseItem.unit_id,
              unit_name: purchaseItem.unit_name,
              unit_symbol: purchaseItem.unit_symbol,
              product_name: inputItem.item_name,
              variant_sku: inputItem.sku,
              hsn_code: inputItem.hsn_code,
              batch_no: batchNo,
              barcode: randomUUID(),
              status: "PENDING",
              purchase_item_id: purchaseItem.id,
              purchase_no: purchase.purchase_no,
              vendor_name: vendor_name || "",
              purchase_date: purchaseDateValue,
              purchase_price: inputItem.cost_price,
              selling_price: 0,
              cgst_percent: inputItem.cgst_percent,
              sgst_percent: inputItem.sgst_percent,
              igst_percent: inputItem.igst_percent,
              quantity: inputItem.quantity,
              remaining_quantity: inputItem.quantity,
            },
          });
          batches.push(batch);
        }
      }
    }

    res.json({
      message: "Purchase updated successfully",
      purchase,
      items: purchaseItems,
      batches,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Purchase number already exists" });
    }
    if (error.code === "P2002" && error.meta?.target?.includes("batch_no")) {
      return res.status(409).json({ error: "Batch number already exists" });
    }
    res.status(500).json({ error: "Failed to update purchase" });
  }
};

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const purchase = await prisma.purchases.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json({ message: "Purchase cancelled successfully", purchase });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Purchase not found" });
    }
    res.status(500).json({ error: "Failed to cancel purchase" });
  }
};
