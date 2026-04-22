import { Router } from "express";
import * as unitController from "../controllers/unitController";

const router = Router();

router.get("/", unitController.getUnits);

export default router;
