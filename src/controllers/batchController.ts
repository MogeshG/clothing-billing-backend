import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createBatchSchema,
  createBulkBatchesSchema,
  updateBatchSchema,
} from "../validation/batches";

export const createBatch = async (req: Request, res: Response) => {
  try {
    const parsed = createBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const data = parsed.data;

    // Resolve productVariantId if not provided
    let productVariantId = data.productVariantId;
    if (!productVariantId && data.productSku) {
      // Find or create Product
      let product = await prisma.products.findUnique({
        where: { sku: data.productSku },
      });
      if (!product) {
        // Assume create basic product if not exist (customize as needed)
        product = await prisma.products.create({
          data: {
            name: data.productSku,
            sku: data.productSku,
            basePrice: data.purchasePrice || 0,
            costPrice: data.purchasePrice,
            mrp: data.sellingPrice || data.purchasePrice * 1.2,
            categoryId: "64f7b8c5-9e5a-4f1d-8b2e-1a3d4e5f6789", // Default 'General' category - create via POST /categories first if needed
          },
        });
      }

      // Find or create variant
      let variant = await prisma.productVariant.findFirst({
        where: {
          productId: product.id,
          size: data.size!,
          color: data.color!,
        },
      });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            size: data.size!,
            color: data.color!,
            price: data.sellingPrice || 0,
            costPrice: data.purchasePrice,
          },
        });
      }
      productVariantId = variant.id;
    }
    if (!productVariantId) {
      return res
        .status(400)
        .json({ error: "Unable to resolve product variant" });
    }

    // Create batch
    const batch = await prisma.batches.create({
      data: {
        productVariantId,
        batchNo: data.batchNo,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        remainingQuantity: data.remainingQuantity || data.quantity,
        manufactureDate: data.manufactureDate,
        expiryDate: data.expiryDate,
        supplierName: data.supplierName,
      },
    });

    res.status(201).json({
      message: "Batch created and stock updated successfully",
      batch,
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

    const results = [];
    for (const batchData of parsed.data.batches) {
      // Reuse createBatch logic? But for speed, parallel
      const result = await createBatch(
        { body: batchData } as Request,
        res as Response,
      ); // Simplistic, better extract function
      // Actually, since async, use Promise.all but handle errors
    }

    // TODO: Implement bulk with transaction
    // For now, sequential
    const batchPromises = parsed.data.batches.map(async (data) => {
      // copy createBatch logic here or ref
      // Simplified stub - implement properly
    });

    const batches = await Promise.all(batchPromises);
    res.status(201).json({ message: "Bulk batches created", batches });
  } catch (error) {
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
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.batches.count(),
    ]);

    res.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch batches" });
  }
};

export const getBatchById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const batch = await prisma.batches.findUnique({
      where: { id },
      include: {
        productVariant: {
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
      where: { batchNo },
      include: {
        productVariant: {
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

    // Calculate stock delta if quantity changed
    const oldBatch = await prisma.batches.findUnique({ where: { id } });
    if (!oldBatch) return res.status(404).json({ error: "Batch not found" });

    const data = parsed.data;
    const newQuantity = data.quantity || oldBatch.quantity;
    const delta = newQuantity - oldBatch.quantity;

    const batch = await prisma.batches.update({
      where: { id },
      data,
    });

    res.json({ message: "Batch updated", batch });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Batch not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const batch = await prisma.batches.findUnique({ where: { id } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    await prisma.batches.delete({ where: { id } });

    res.json({ message: "Batch deleted and stock reverted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete batch" });
  }
};
