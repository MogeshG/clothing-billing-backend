import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      prisma.stock_movement.findMany({
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          items: true,
        },
      }),
      prisma.stock_movement.count(),
    ]);

    // Collect all unique batch_ids to resolve batch_no in one query
    const batchIds = [
      ...new Set(movements.flatMap((m) => m.items.map((i) => i.batch_id))),
    ].filter(Boolean);

    const batches = batchIds.length
      ? await prisma.batches.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, batch_no: true },
        })
      : [];

    const batchMap = Object.fromEntries(batches.map((b) => [b.id, b.batch_no]));

    // Collect all invoice_item_ids and purchase_item_ids to resolve reference nos
    const invoiceItemIds = movements
      .map((m) => m.invoice_item_id)
      .filter(Boolean) as string[];
    const purchaseItemIds = movements
      .map((m) => m.purchase_item_id)
      .filter(Boolean) as string[];

    const [invoiceItems, purchaseItems] = await Promise.all([
      invoiceItemIds.length
        ? prisma.invoice_item.findMany({
            where: { id: { in: invoiceItemIds } },
            select: { id: true, invoice_id: true, invoice: { select: { invoice_no: true } } },
          })
        : [],
      purchaseItemIds.length
        ? prisma.purchase_item.findMany({
            where: { id: { in: purchaseItemIds } },
            select: { id: true, purchase_id: true, purchase: { select: { purchase_no: true } } },
          })
        : [],
    ]);

    const invoiceItemMap = Object.fromEntries(
      invoiceItems.map((ii) => [ii.id, ii.invoice?.invoice_no])
    );
    const purchaseItemMap = Object.fromEntries(
      purchaseItems.map((pi) => [pi.id, pi.purchase?.purchase_no])
    );

    // Shape response to match frontend StockMovement type (snake_case)
    const result = movements.map((m) => ({
      id: m.id,
      product_variant_id: m.product_variant_id,
      product_name: m.product_name,
      variant_sku: m.variant_sku,
      invoice_item_id: m.invoice_item_id,
      purchase_item_id: m.purchase_item_id,
      invoice_no: m.invoice_item_id ? invoiceItemMap[m.invoice_item_id] : null,
      purchase_no: m.purchase_item_id ? purchaseItemMap[m.purchase_item_id] : null,
      type: m.type,
      quantity: m.quantity,
      unit: m.unit,
      created_at: m.created_at,
      items: m.items.map((item) => ({
        id: item.id,
        stock_movement_id: item.stock_movement_id,
        batch_id: item.batch_id,
        batch_no: batchMap[item.batch_id] || null,
        quantity: item.quantity,
        unit: item.unit,
      })),
    }));

    res.json({
      stock_movements: result,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stock movements" });
  }
};

export const getStockMovementById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const movement = await prisma.stock_movement.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!movement) {
      return res.status(404).json({ error: "Stock movement not found" });
    }

    const batchIds = movement.items.map((i) => i.batch_id).filter(Boolean);
    const batches = batchIds.length
      ? await prisma.batches.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, batch_no: true },
        })
      : [];
    const batchMap = Object.fromEntries(batches.map((b) => [b.id, b.batch_no]));

    res.json({
      ...movement,
      items: movement.items.map((item) => ({
        ...item,
        batch_no: batchMap[item.batch_id] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
