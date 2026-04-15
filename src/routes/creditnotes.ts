import { Router } from "express";
import {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  approveCreditNote,
  deleteCreditNote,
} from "../controllers/creditNoteController";

const router = Router();

router.post("/", createCreditNote);
router.get("/", getCreditNotes);
router.get("/:id", getCreditNoteById);
router.patch("/:id", updateCreditNote);
router.post("/:id/approve", approveCreditNote);
router.delete("/:id", deleteCreditNote);

export default router;
