import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, generateToken } from "../lib/auth";
import { registerSchema, loginSchema } from "../validation/auth";

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
        hashedPassword,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
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

    if (!user || !user.hashedPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await comparePassword(password, user.hashedPassword);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, phone: user.phone },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
