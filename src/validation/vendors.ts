import { z } from "zod";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().length(10, "Phone must be exactly 10 digits"),
  email: z.preprocess((val) => {
    if (val === "" || val === null) return undefined;
    return val;
  }, z.string().email("Invalid email").optional()),
  address: z.string().max(200).optional(),
  gstin: z.preprocess((val) => {
    if (val === "" || val === null) return undefined;
    return val;
  }, z.string().regex(gstinRegex, "Invalid GSTIN format").max(15).optional()),
  companyName: z.string().min(1, "Company name is required").max(100),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  country: z.string().default("India"),
});

export const updateVendorSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    phone: z.string().length(10, "Phone must be exactly 10 digits").optional(),
    email: z.preprocess((val) => {
      if (val === "" || val === null) return undefined;
      return val;
    }, z.string().email("Invalid email").optional()),
    address: z.string().max(200).optional(),
    gstin: z.preprocess((val) => {
      if (val === "" || val === null) return undefined;
      return val;
    }, z.string().regex(gstinRegex, "Invalid GSTIN format").max(15).optional()),
    companyName: z
      .string()
      .min(1, "Company name is required")
      .max(100)
      .optional(),
    city: z.string().max(50).optional(),
    state: z.string().max(50).optional(),
    country: z.enum(["India"]).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field required",
  );
