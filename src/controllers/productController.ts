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
      const issues = parsed.error.issues;
      // console.log("Validation issues:", JSON.stringify(issues, null, 2));
      const errorMsg =
        issues.length > 0
          ? issues.map((i) => `${i.path?.join(".")}: ${i.message}`).join("; ")
          : "Validation failed";
      return res.status(400).json({
        error: errorMsg,
        details: issues,
      });
    }

    const inputData = parsed.data;
    const category = await prisma.product_categories.findUnique({
      where: { id: inputData.category_id! },
    });
    if (!category) {
      return res.status(400).json({ error: "Category not found" });
    }

    const productResult = await prisma.$transaction(async (tx) => {
      const product = await tx.products.create({
        data: {
          name: inputData.name,
          sku: inputData.sku,
          hsn_code: inputData.hsn_code,
          description: inputData.description,
          category_id: inputData.category_id,
          brand: inputData.brand,
          cgst_percent: inputData.cgst_percent,
          sgst_percent: inputData.sgst_percent,
          igst_percent: inputData.igst_percent,
          tax_inclusive: inputData.tax_inclusive,
          is_active: inputData.is_active,
          is_deleted: false,
        },
      });

      if (inputData.variants && inputData.variants.length > 0) {
        const variantData = inputData.variants.map((v: any) => ({
          product_id: product.id,
          size: v.size,
          color: v.color,
          barcode: v.barcode,
          sku: v.sku,
          cost_price: v.cost_price,
          selling_price: v.selling_price,
          mrp: v.mrp,
        }));
        await tx.product_variant.createMany({
          data: variantData,
        });
      }

      return product;
    });
    const product = productResult;

    // Fetch product with variants
    const productWithVariants = await prisma.products.findUnique({
      where: { id: product.id },
      include: { variants: true },
    });

    res.status(201).json({
      message: "Product created with variants",
      product: productWithVariants,
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "SKU, barcode or HSN code already exists" });
    }
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      is_deleted: false,
    };
    if (req.query.active !== "false") {
      where.is_active = true;
    }

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: true,
        },
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.products.count({ where }),
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
      where: {
        id,
        is_deleted: false,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: true,
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
      where: {
        sku,
        is_deleted: false,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
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
      const issues = parsed.error.issues;
      const errorMsg =
        issues.length > 0
          ? issues.map((i) => `${i.path?.join(".")}: ${i.message}`).join("; ")
          : "Validation failed";
      return res.status(400).json({
        error: errorMsg,
        details: issues,
      });
    }

    const inputData = parsed.data;

    // Resolve category_id if provided (check existence)
    let category_id = inputData.category_id;
    if (category_id) {
      const category = await prisma.product_categories.findUnique({
        where: { id: category_id },
      });
      if (!category) {
        return res.status(400).json({ error: "Category not found" });
      }
    }

    const updateData: any = {};

    if (inputData.name !== undefined) updateData.name = inputData.name;
    if (inputData.sku !== undefined) updateData.sku = inputData.sku;
    if (inputData.hsn_code !== undefined)
      updateData.hsn_code = inputData.hsn_code;
    if (inputData.description !== undefined)
      updateData.description = inputData.description;
    if (category_id) updateData.category_id = category_id;
    if (inputData.brand !== undefined) updateData.brand = inputData.brand;
    if (inputData.cgst_percent !== undefined)
      updateData.cgst_percent = inputData.cgst_percent;
    if (inputData.sgst_percent !== undefined)
      updateData.sgst_percent = inputData.sgst_percent;
    if (inputData.igst_percent !== undefined)
      updateData.igst_percent = inputData.igst_percent;
    if (inputData.tax_inclusive !== undefined)
      updateData.tax_inclusive = inputData.tax_inclusive;
    if (inputData.is_active !== undefined)
      updateData.is_active = inputData.is_active;

    await prisma.$transaction([
      prisma.products.update({
        where: { id },
        data: updateData,
      }),
      ...(inputData.variants && Array.isArray(inputData.variants)
        ? [
            prisma.product_variant.deleteMany({ where: { product_id: id } }),
            prisma.product_variant.createMany({
              data: inputData.variants.map((v: any) => ({
                product_id: id,
                size: v.size,
                color: v.color,
                barcode: v.barcode,
                sku: v.sku,
                cost_price: v.cost_price,
                selling_price: v.selling_price,
                mrp: v.mrp,
              })),
            }),
          ]
        : []),
    ]);

    const product = await prisma.products.findUnique({ where: { id } });

    // Fetch updated product with variants
    const productWithVariants = await prisma.products.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
      },
    });

    res.json({ message: "Product updated", product: productWithVariants });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ error: "SKU or barcode already exists" });
    }
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.products.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
      },
    });
    res.json({ message: "Product soft-deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    if (error.code === "P2017") {
      return res
        .status(409)
        .json({ error: "Cannot delete product with related records" });
    }
    res.status(500).json({ error: "Failed to delete product" });
  }
};
