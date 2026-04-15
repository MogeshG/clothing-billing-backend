import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createProductSchema,
  updateProductSchema,
} from "../validation/products";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const inputData = parsed.data;

    // Resolve categoryId
    let categoryId = inputData.categoryId;
    if (inputData.categoryKey && !categoryId) {
      const category = await prisma.productCategories.findUnique({
        where: { key: inputData.categoryKey },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found by key" });
      }
      categoryId = category.id;
    }

    const product = await prisma.products.create({
      data: {
        name: inputData.name,
        sku: inputData.sku,
        description: inputData.description,
        categoryId: categoryId!,
        brand: inputData.brand,
        barcode: inputData.barcode,
        basePrice: inputData.basePrice,
        costPrice: inputData.costPrice,
        mrp: inputData.mrp,
        gstPercent: inputData.gstPercent,
        taxInclusive: inputData.taxInclusive,
        isActive: inputData.isActive,
      },
    });

    res.status(201).json({ message: "Product created", product });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "SKU already exists" });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        include: {
          category: true,
        },
        where: {
          isActive: req.query.active !== "false",
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.products.count(),
    ]);

    res.json({
      products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getProductBySku = async (req: Request, res: Response) => {
  try {
    const sku = Array.isArray(req.params.sku)
      ? req.params.sku[0]
      : req.params.sku;
    const product = await prisma.products.findUnique({
      where: { sku },
      include: {
        category: true,
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const inputData = parsed.data;

    // Resolve categoryId
    let categoryId = inputData.categoryId;
    if (inputData.categoryKey && !categoryId) {
      const category = await prisma.productCategories.findUnique({
        where: { key: inputData.categoryKey },
      });
      if (!category) {
        return res.status(404).json({ error: "Category not found by key" });
      }
      categoryId = category.id;
    }

    const product = await prisma.products.update({
      where: { id },
      data: {
        name: inputData.name,
        description: inputData.description,
        categoryId: categoryId,
        brand: inputData.brand,
        barcode: inputData.barcode,
        basePrice: inputData.basePrice,
        costPrice: inputData.costPrice,
        mrp: inputData.mrp,
        gstPercent: inputData.gstPercent,
        taxInclusive: inputData.taxInclusive,
        isActive: inputData.isActive,
      },
    });
    res.json({ message: "Product updated", product });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.products.delete({
      where: { id },
    });
    res.json({ message: "Product deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    if (error.code === "P2017") {
      return res
        .status(409)
        .json({ error: "Cannot delete product with variants/batches" });
    }
    res.status(500).json({ error: "Failed to delete product" });
  }
};
