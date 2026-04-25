import { Router } from "express";
import {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  approveCreditNote,
  deleteCreditNote,
} from "../controllers/creditNoteController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post("/", requirePermission("Sales", "create"), createCreditNote);
router.get("/", requirePermission("Sales", "read"), getCreditNotes);
router.get("/:id", requirePermission("Sales", "read"), getCreditNoteById);
router.patch("/:id", requirePermission("Sales", "update"), updateCreditNote);
router.post(
  "/:id/approve",
  requirePermission("Sales", "update"),
  approveCreditNote,
);
router.delete("/:id", requirePermission("Sales", "delete"), deleteCreditNote);

export default router;
