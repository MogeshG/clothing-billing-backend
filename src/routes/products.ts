import { Router } from "express";
import * as productController from "../controllers/productController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Inventory", "create"),
  productController.createProduct,
);
router.get(
  "/",
  requirePermission("Inventory", "read"),
  productController.getProducts,
);
router.get(
  "/:id",
  requirePermission("Inventory", "read"),
  productController.getProductById,
);
router.get(
  "/sku/:sku",
  requirePermission("Inventory", "read"),
  productController.getProductBySku,
);
router.put(
  "/:id",
  requirePermission("Inventory", "update"),
  productController.updateProduct,
);
router.delete(
  "/:id",
  requirePermission("Inventory", "delete"),
  productController.deleteProduct,
);

export default router;
