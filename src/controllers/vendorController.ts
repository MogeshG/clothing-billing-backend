import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createVendorSchema, updateVendorSchema } from "../validation/vendors";

async function phoneExists(phone: string, excludeId?: string) {
  const where: any = { phone: phone.trim(), is_deleted: false };
  if (excludeId) where.NOT = { id: excludeId };
  return !!(await prisma.vendors.findFirst({ where }));
}

async function gstinExists(gstin: string, excludeId?: string) {
  const where: any = {
    gstin: gstin.trim().toUpperCase(),
    is_deleted: false,
  };
  if (excludeId) where.NOT = { id: excludeId };
  return !!(await prisma.vendors.findFirst({ where }));
}

export const createVendor = async (req: Request, res: Response) => {
  try {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const dbData = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      gstin: parsed.data.gstin ?? null,
      company_name: parsed.data.companyName ?? "",
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      country: parsed.data.country || "India",
      is_deleted: false,
    };

    // Pre-check uniqueness
    if (await phoneExists(dbData.phone)) {
      return res.status(409).json({ error: "Phone already exists" });
    }
    if (dbData.gstin && dbData.gstin.trim()) {
      if (await gstinExists(dbData.gstin)) {
        return res.status(409).json({ error: "GSTIN already exists" });
      }
    }

    const vendor = await prisma.vendors.create({
      data: dbData,
    });

    // Transform back to camelCase for frontend
    const camelVendor = {
      ...vendor,
      companyName: vendor.company_name,
    };

    res.status(201).json({ vendor: camelVendor });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Duplicate field value" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const getVendors = async (req: Request, res: Response) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { is_deleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { company_name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendors.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: "desc" },
      }),
      prisma.vendors.count({ where }),
    ]);

    const camelVendors = vendors.map((v) => ({
      ...v,
      companyName: v.company_name,
    }));

    res.json({
      vendors: camelVendors,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getVendorById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : (req.params.id as string);
    const vendor = await prisma.vendors.findUnique({
      where: {
        id,
        is_deleted: false,
      },
    });
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const camelVendor = {
      ...vendor,
      companyName: vendor.company_name,
    };

    res.json({ vendor: camelVendor });
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

    const dbData: any = {};
    if (parsed.data.name !== undefined) dbData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) dbData.phone = parsed.data.phone;
    if (parsed.data.email !== undefined)
      dbData.email = parsed.data.email ?? null;
    if (parsed.data.address !== undefined)
      dbData.address = parsed.data.address ?? null;
    if (parsed.data.gstin !== undefined)
      dbData.gstin = parsed.data.gstin ?? null;
    if (parsed.data.companyName !== undefined)
      dbData.company_name = parsed.data.companyName ?? "";
    if (parsed.data.city !== undefined) dbData.city = parsed.data.city ?? null;
    if (parsed.data.state !== undefined)
      dbData.state = parsed.data.state ?? null;
    if (parsed.data.country !== undefined) dbData.country = parsed.data.country;

    // Pre-check uniqueness
    if (dbData.phone !== undefined && (await phoneExists(dbData.phone, id))) {
      return res.status(409).json({ error: "Phone already exists" });
    }
    if (dbData.gstin !== undefined && dbData.gstin && dbData.gstin.trim()) {
      if (await gstinExists(dbData.gstin, id)) {
        return res.status(409).json({ error: "GSTIN already exists" });
      }
    }

    const vendor = await prisma.vendors.update({
      where: { id },
      data: dbData,
    });

    const camelVendor = {
      ...vendor,
      companyName: vendor.company_name,
    };

    res.json({ vendor: camelVendor });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Duplicate field value" });
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

    const vendor = await prisma.vendors.findUnique({
      where: { id, is_deleted: false },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    await prisma.vendors.update({
      where: { id },
      data: { is_deleted: true },
    });

    res.json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
