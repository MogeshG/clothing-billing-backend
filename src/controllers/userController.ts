import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createUserSchema, updateUserSchema } from "../validation/users";
import { hashPassword } from "../lib/auth";

const parsePermissions = (permissions: string | null | undefined) => {
  if (!permissions) return {};

  try {
    const parsed = JSON.parse(permissions);
    if (Array.isArray(parsed)) {
      return parsed.reduce((acc: Record<string, any>, item: any) => {
        if (item?.module) {
          acc[item.module] = {
            create: Boolean(item.canCreate),
            read: Boolean(item.canRead),
            update: Boolean(item.canUpdate),
            delete: Boolean(item.canDelete),
          };
        }
        return acc;
      }, {});
    }
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
};

const formatUser = (user: any) => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email ?? null,
  permissions: parsePermissions(user.permissions),
  createdAt: user.created_at?.toISOString() ?? null,
  updatedAt: user.updated_at?.toISOString() ?? null,
});

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const hashedPassword = await hashPassword(parsed.data.password);

    const user = await prisma.users.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email ?? null,
        hashed_password: hashedPassword,
        permissions: parsed.data.permissions
          ? JSON.stringify(parsed.data.permissions)
          : null,
      },
    });

    res.status(201).json({ user: formatUser(user) });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone or email already exists" });
    }

    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        phone: true,
        permissions: true,
      },
    });
    res.json({ users: users.map(formatUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        phone: true,
        permissions: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: formatUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load user" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) data.email = parsed.data.email ?? null;
    if (
      parsed.data.password !== undefined &&
      parsed.data.confirmPassword !== undefined
    ) {
      data.hashed_password = await hashPassword(parsed.data.password);
    }
    if (parsed.data.permissions !== undefined) {
      data.permissions = parsed.data.permissions
        ? JSON.stringify(parsed.data.permissions)
        : null;
    }

    const user = await prisma.users.update({
      where: { id },
      data,
    });

    res.json({ user: formatUser(user) });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone or email already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }

    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
};
