import { Router } from "express";
import * as batchController from "../controllers/batchController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

// Single batch
router.post(
  "/",
  requirePermission("Stocks", "create"),
  batchController.createBatch,
);
router.get(
  "/",
  requirePermission("Stocks", "read"),
  batchController.getBatches,
);

// Bulk for stock inward
router.post(
  "/bulk",
  requirePermission("Stocks", "create"),
  batchController.createBulkBatches,
);

// By ID
router.get(
  "/:id",
  requirePermission("Stocks", "read"),
  batchController.getBatchById,
);
router.put(
  "/:id",
  requirePermission("Stocks", "update"),
  batchController.updateBatch,
);
router.delete(
  "/:id",
  requirePermission("Stocks", "delete"),
  batchController.deleteBatch,
);

// By batchNo
router.get(
  "/batchNo/:batchNo",
  requirePermission("Stocks", "read"),
  batchController.getBatchByBatchNo,
);

// Generate unique batch no / barcode
router.post(
  "/generate-batch-no",
  requirePermission("Stocks", "update"),
  batchController.getNewBatchNo,
);
router.post(
  "/generate-barcode",
  requirePermission("Stocks", "update"),
  batchController.getNewBarcode,
);

export default router;
