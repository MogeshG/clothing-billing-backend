import { Router } from "express";
import * as stockMovementController from "../controllers/stockMovementController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.get(
  "/",
  requirePermission("Stocks", "read"),
  stockMovementController.getStockMovements,
);
router.get(
  "/:id",
  requirePermission("Stocks", "read"),
  stockMovementController.getStockMovementById,
);

export default router;
