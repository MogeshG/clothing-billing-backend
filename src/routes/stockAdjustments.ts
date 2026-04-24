import { Router } from "express";
import * as stockAdjustmentController from "../controllers/stockAdjustmentController";

const router = Router();

router.get("/", stockAdjustmentController.getStockAdjustments);
router.post("/", stockAdjustmentController.createStockAdjustment);
router.get("/batches", stockAdjustmentController.getBatchesForAdjustment);

export default router;
