import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validation/categories";

export const createCategory = async (req: Request, res: Response) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: parsed.error.format()._errors[0] || "Validation failed",
        });
    }

    const category = await prisma.product_categories.create({
      data: parsed.data,
    });

    res.status(201).json({ message: "Category created", category });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Key already exists" });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  const categories = await prisma.product_categories.findMany({
    orderBy: { created_at: "desc" },
  });
  res.json(categories);
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const category = await prisma.product_categories.findUnique({
      where: { id },
    });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error: parsed.error.format()._errors[0] || "Validation failed",
        });
    }

    const category = await prisma.product_categories.update({
      where: { id },
      data: parsed.data,
    });
    res.json({ message: "Category updated", category });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.product_categories.delete({
      where: { id },
    });
    res.json({ message: "Category deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(500).json({ error: "Failed to delete category" });
  }
};
