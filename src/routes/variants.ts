import { Router } from "express";
import * as variantController from "../controllers/variantController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Inventory", "create"),
  variantController.createVariant,
);
router.get(
  "/",
  requirePermission("Inventory", "read"),
  variantController.getVariants,
);
router.get(
  "/:id",
  requirePermission("Inventory", "read"),
  variantController.getVariantById,
);
router.get(
  "/product/:productId",
  requirePermission("Inventory", "read"),
  variantController.getVariantsByProductId,
);
router.patch(
  "/:id",
  requirePermission("Inventory", "update"),
  variantController.updateVariant,
);
router.delete(
  "/:id",
  requirePermission("Inventory", "delete"),
  variantController.deleteVariant,
);

export default router;
