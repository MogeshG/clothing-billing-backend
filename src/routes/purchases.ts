import { Router } from "express";
import * as purchaseController from "../controllers/purchaseController";

const router = Router();

router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);

export default router;
