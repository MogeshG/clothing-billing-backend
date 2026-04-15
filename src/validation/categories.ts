import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name required").max(100),
  key: z.string().min(1, "Key required").max(50),
  description: z.string().max(500).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
