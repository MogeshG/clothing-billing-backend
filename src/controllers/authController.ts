import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, generateToken } from "../lib/auth";
import { registerSchema, loginSchema } from "../validation/auth";

interface AuthRequest extends Request {
  userId?: string;
}

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

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const { name, phone, email, password } = parsed.data;

    const hashedPassword = await hashPassword(password);

    const user = await prisma.users.create({
      data: {
        name,
        phone,
        email,
        hashed_password: hashedPassword,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "User created successfully",
      user: formatUser(user),
      token,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone or email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const { phone, password } = parsed.data;

    const user = await prisma.users.findUnique({
      where: { phone },
    });

    if (!user || !user.hashed_password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await comparePassword(password, user.hashed_password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    res.json({
      message: "Login successful",
      user: formatUser(user),
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        permissions: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
