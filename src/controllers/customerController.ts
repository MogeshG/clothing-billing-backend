import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../validation/customers";

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const parsed = createCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }
    const { name, phone, email, address } = parsed.data;

    const customer = await prisma.customers.create({
      data: {
        name,
        phone,
        email,
        address,
      },
    });

    res.status(201).json({
      message: "Customer created",
      customer,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  const customers = await prisma.customers.findMany({});
  res.json(customers);
};

export const getCustomerById = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const customer = await prisma.customers.findUnique({
    where: { id },
  });
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  res.json(customer);
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = (
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    ) as string;
    const parsed = updateCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.format()._errors[0] || "Validation failed",
      });
    }

    const customer = await prisma.customers.update({
      where: { id },
      data: parsed.data,
    });

    res.json({
      message: "Customer updated",
      customer,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Phone already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = (
      Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    ) as string;
    await prisma.customers.delete({
      where: { id },
    });
    res.json({ message: "Customer deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
