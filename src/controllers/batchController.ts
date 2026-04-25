import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createBatchSchema,
  createBulkBatchesSchema,
  updateBatchSchema,
} from "../validation/batches";
import { generateUniqueBatchNo } from "../utils/generateBatchNo";
import { generateUniqueBarcode } from "../utils/generateBarcode";

export const createBatch = async (req: Request, res: Response) => {
  try {
    const parsed = createBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const data = parsed.data;

    const batch = await prisma.batches.create({
      data: data,
    });

    res.status(201).json({
      message: "Batch created successfully",
      batch: batch,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Batch number already exists" });
    }
    res.status(500).json({ error: "Failed to create batch" });
  }
};

export const createBulkBatches = async (req: Request, res: Response) => {
  try {
    const parsed = createBulkBatchesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const batches = await prisma.$transaction(
      parsed.data.batches.map((data) =>
        prisma.batches.create({
          data: data,
        }),
      ),
    );

    res.status(201).json({
      message: "Bulk batches created",
      batches: batches,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create bulk batches" });
  }
};

export const getBatches = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      prisma.batches.findMany({
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.batches.count(),
    ]);

    res.json({
      batches: batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
};

export const getBatchById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const batch = await prisma.batches.findUnique({
      where: { id },
      include: {
        product_variant: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getBatchByBatchNo = async (req: Request, res: Response) => {
  try {
    const batchNo = (
      Array.isArray(req.params.batchNo)
        ? req.params.batchNo[0]
        : req.params.batchNo
    ) as string;
    const batch = await prisma.batches.findUnique({
      where: { batch_no: batchNo },
      include: {
        product_variant: {
          include: {
            product: true,
          },
        },
      },
    });
    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data = parsed.data;

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.purchase_price !== undefined)
      updateData.purchase_price = data.purchase_price;
    if (data.selling_price !== undefined)
      updateData.selling_price = data.selling_price;
    if (data.remaining_quantity !== undefined)
      updateData.remaining_quantity = data.remaining_quantity;
    if (data.manufacture_date !== undefined)
      updateData.manufacture_date = data.manufacture_date;
    if (data.expiry_date !== undefined)
      updateData.expiry_date = data.expiry_date;
    if (data.vendor_name !== undefined)
      updateData.vendor_name = data.vendor_name;
    if (data.tax_inclusive !== undefined)
      updateData.tax_inclusive = data.tax_inclusive;
    if (data.batch_no !== undefined) updateData.batch_no = data.batch_no;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;

    const batch = await prisma.batches.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: "Batch updated", batch: batch });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target?.join(", ");
      if (target?.includes("batch_no")) {
        return res.status(409).json({ error: "Batch number already exists" });
      }
      if (target?.includes("barcode")) {
        return res.status(409).json({ error: "Barcode already exists" });
      }
      return res.status(409).json({ error: "Unique constraint violation" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Batch not found" });
    }
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const batch = await prisma.batches.findUnique({ where: { id } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    await prisma.batches.delete({ where: { id } });

    res.json({ message: "Batch deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete batch" });
  }
};

export const getNewBatchNo = async (_req: Request, res: Response) => {
  try {
    const batchNo = await generateUniqueBatchNo();
    res.json({ batchNo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate batch number" });
  }
};

export const getNewBarcode = async (_req: Request, res: Response) => {
  try {
    const barcode = await generateUniqueBarcode();
    res.json({ barcode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate barcode" });
  }
};
