import { Router } from "express";
import * as stockAdjustmentController from "../controllers/stockAdjustmentController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.get(
  "/",
  requirePermission("Stocks", "read"),
  stockAdjustmentController.getStockAdjustments,
);
router.post(
  "/",
  requirePermission("Stocks", "create"),
  stockAdjustmentController.createStockAdjustment,
);
router.get(
  "/batches",
  requirePermission("Stocks", "read"),
  stockAdjustmentController.getBatchesForAdjustment,
);

export default router;
