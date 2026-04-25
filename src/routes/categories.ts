import { Router } from "express";
import * as categoryController from "../controllers/categoryController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Inventory", "create"),
  categoryController.createCategory,
);
router.get(
  "/",
  requirePermission("Inventory", "read"),
  categoryController.getCategories,
);
router.get(
  "/:id",
  requirePermission("Inventory", "read"),
  categoryController.getCategoryById,
);
router.put(
  "/:id",
  requirePermission("Inventory", "update"),
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  requirePermission("Inventory", "delete"),
  categoryController.deleteCategory,
);

export default router;
