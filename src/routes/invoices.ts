import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateDraftInvoice,
  finalizeInvoice,
  deleteInvoice,
} from "../controllers/invoiceController";

const router = Router();

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.patch("/:id", updateDraftInvoice);
router.post("/:id/finalize", finalizeInvoice);
router.delete("/:id", deleteInvoice);

export default router;
