import { Router } from "express";
import {
  getPreferences,
  updatePreference,
  updateMultiplePreferences,
} from "../controllers/preferenceController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.get("/", requirePermission("Settings", "read"), getPreferences);
router.post("/", requirePermission("Settings", "update"), updatePreference);
router.post(
  "/bulk",
  requirePermission("Settings", "update"),
  updateMultiplePreferences,
);

export default router;
