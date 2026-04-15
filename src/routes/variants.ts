import { Router } from "express";
import * as variantController from "../controllers/variantController";

const router = Router();

router.post("/", variantController.createVariant);
router.get("/", variantController.getVariants);
router.get("/:id", variantController.getVariantById);
router.get("/product/:productId", variantController.getVariantsByProductId);
router.patch("/:id", variantController.updateVariant);
router.delete("/:id", variantController.deleteVariant);

export default router;
