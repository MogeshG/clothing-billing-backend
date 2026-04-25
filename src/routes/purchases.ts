import { Router } from "express";
import * as purchaseController from "../controllers/purchaseController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Suppliers", "create"),
  purchaseController.createPurchase,
);
router.get(
  "/",
  requirePermission("Suppliers", "read"),
  purchaseController.getPurchases,
);
router.get(
  "/:id",
  requirePermission("Suppliers", "read"),
  purchaseController.getPurchaseById,
);
router.put(
  "/:id",
  requirePermission("Suppliers", "update"),
  purchaseController.updatePurchase,
);
router.patch(
  "/:id/status",
  requirePermission("Suppliers", "update"),
  purchaseController.updatePurchaseStatus,
);
router.delete(
  "/:id",
  requirePermission("Suppliers", "delete"),
  purchaseController.deletePurchase,
);

export default router;
