import { Router } from "express";
import * as vendorController from "../controllers/vendorController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Suppliers", "create"),
  vendorController.createVendor,
);
router.get(
  "/",
  requirePermission("Suppliers", "read"),
  vendorController.getVendors,
);
router.get(
  "/:id",
  requirePermission("Suppliers", "read"),
  vendorController.getVendorById,
);
router.put(
  "/:id",
  requirePermission("Suppliers", "update"),
  vendorController.updateVendor,
);
router.delete(
  "/:id",
  requirePermission("Suppliers", "delete"),
  vendorController.deleteVendor,
);

export default router;
