import { Router } from "express";
import * as vendorController from "../controllers/vendorController";

const router = Router();

router.post("/", vendorController.createVendor);
router.get("/", vendorController.getVendors);
router.get("/:id", vendorController.getVendorById);
router.put("/:id", vendorController.updateVendor);
router.delete("/:id", vendorController.deleteVendor);

export default router;
