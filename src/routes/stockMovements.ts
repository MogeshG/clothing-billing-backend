import { Router } from "express";
import * as stockMovementController from "../controllers/stockMovementController";

const router = Router();

router.get("/", stockMovementController.getStockMovements);
router.get("/:id", stockMovementController.getStockMovementById);

export default router;
