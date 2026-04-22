import { Router } from "express";
import * as purchaseController from "../controllers/purchaseController";

const router = Router();

router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);
router.get("/:id", purchaseController.getPurchaseById);
router.put("/:id", purchaseController.updatePurchase);
router.patch("/:id/status", purchaseController.updatePurchaseStatus);
router.delete("/:id", purchaseController.deletePurchase);

export default router;
