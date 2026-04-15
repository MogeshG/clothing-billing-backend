import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createVendorSchema, updateVendorSchema } from "../validation/vendors";

export const createVendor = async (req: Request, res: Response) => {
  try {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const data = {
      ...parsed.data,
      isActive: true,
      country: parsed.data.country || "India",
    };

    const vendor = await prisma.vendors.create({
      data,
    });

    res.status(201).json({
      message: "Vendor created",
      vendor,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone or GSTIN already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const getVendors = async (req: Request, res: Response) => {
  const vendors = await prisma.vendors.findMany();
  res.json(vendors);
};

export const getVendorById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : (req.params.id as string);
    const vendor = await prisma.vendors.findUnique({
      where: { id },
    });
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateVendor = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : (req.params.id as string);
    const parsed = updateVendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const vendor = await prisma.vendors.update({
      where: { id },
      data: parsed.data,
    });

    res.json({
      message: "Vendor updated",
      vendor,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone or GSTIN already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : (req.params.id as string);
    await prisma.vendors.delete({
      where: { id },
    });
    res.json({ message: "Vendor deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
