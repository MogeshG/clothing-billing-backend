import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createVariantSchema,
  updateVariantSchema,
} from "../validation/variants";

export const createVariant = async (req: Request, res: Response) => {
  try {
    const parsed = createVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format()._errors[0] });
    }

    let data = parsed.data;
    let productId = data.productId;

    if (!productId && data.productSku) {
      const product = await prisma.products.findUnique({
        where: { sku: data.productSku },
      });
      if (!product) return res.status(404).json({ error: "Product not found" });
      productId = product.id;
    }

    const variant = await prisma.productVariant.create({
      data: { ...data, productId: productId! },
    });

    res.status(201).json({ message: "Variant created", variant });
  } catch (error: any) {
    if (error.code === "P2002")
      return res.status(409).json({ error: "SKU already exists" });
    res.status(500).json({ error: "Failed to create variant" });
  }
};

export const getVariants = async (req: Request, res: Response) => {
  const variants = await prisma.productVariant.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(variants);
};

export const getVariantById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: { product: true, batches: true },
  });
  if (!variant) return res.status(404).json({ error: "Variant not found" });
  res.json(variant);
};

export const getVariantsByProductId = async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: { product: true },
  });
  res.json(variants);
};

export const updateVariant = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = updateVariantSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.format()._errors[0] });

  const variant = await prisma.productVariant.update({
    where: { id },
    data: parsed.data,
  });
  res.json({ message: "Variant updated", variant });
};

export const deleteVariant = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await prisma.productVariant.delete({ where: { id } });
  res.json({ message: "Variant deleted" });
};
