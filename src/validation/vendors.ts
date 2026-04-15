import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  email: z.string().email("Invalid email").optional(),
  address: z.string().max(200).optional(),
  gstin: z.string().max(15).optional(),
  companyName: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  country: z.string().default("India"),
});

export const updateVendorSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    phone: z
      .string()
      .min(10, "Phone must be at least 10 digits")
      .max(15)
      .optional(),
    email: z.string().email("Invalid email").optional(),
    address: z.string().max(200).optional(),
    gstin: z.string().max(15).optional(),
    companyName: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    state: z.string().max(50).optional(),
    country: z.enum(["India"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field required",
  );
