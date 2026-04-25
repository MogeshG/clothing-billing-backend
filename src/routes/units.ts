import { Router } from "express";
import * as unitController from "../controllers/unitController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.get("/", requirePermission("Inventory", "read"), unitController.getUnits);

export default router;
