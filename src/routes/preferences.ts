import { Router } from "express";
import {
  getPreferences,
  updatePreference,
  updateMultiplePreferences,
} from "../controllers/preferenceController";

const router = Router();

router.get("/", getPreferences);
router.post("/", updatePreference);
router.post("/bulk", updateMultiplePreferences);

export default router;
