import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

const permissionFlagsSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

export const userPermissionSchema = z.object({
  module: z.string().min(1),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().regex(phoneRegex, "Phone must be exactly 10 digits"),
  email: z.preprocess((val) => {
    if (val === "" || val === null) return undefined;
    return val;
  }, z.string().email("Invalid email").optional()),
  password: z.string().min(6, "Password must be at least 6 characters"),
  permissions: z
    .union([
      z.record(z.string(), permissionFlagsSchema),
      z.array(userPermissionSchema),
    ])
    .optional(),
});

const optionalPasswordSchema = z.preprocess((val) => {
  if (val === "" || val === null) return undefined;
  return val;
}, z.string().min(6, "Password must be at least 6 characters").optional());

const optionalConfirmPasswordSchema = z.preprocess((val) => {
  if (val === "" || val === null) return undefined;
  return val;
}, z.string().optional());

export const updateUserSchema = createUserSchema
  .partial()
  .extend({
    password: optionalPasswordSchema,
    confirmPassword: optionalConfirmPasswordSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  )
  .superRefine((data, ctx) => {
    if (data.password !== undefined || data.confirmPassword !== undefined) {
      if (data.password === undefined || data.confirmPassword === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Both password and confirm password are required",
          path: ["confirmPassword"],
        });
      } else if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: "Passwords must match",
          path: ["confirmPassword"],
        });
      }
    }
  });
