import { Router } from "express";
import * as batchController from "../controllers/batchController";

const router = Router();

// Single batch
router.post("/", batchController.createBatch);
router.get("/", batchController.getBatches);

// Bulk for stock inward
router.post("/bulk", batchController.createBulkBatches);

// By ID
router.get("/:id", batchController.getBatchById);
router.patch("/:id", batchController.updateBatch);
router.delete("/:id", batchController.deleteBatch);

// By batchNo
router.get("/batchNo/:batchNo", batchController.getBatchByBatchNo);

export default router;
