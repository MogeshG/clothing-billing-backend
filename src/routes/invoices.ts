import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateDraftInvoice,
  finalizeInvoice,
  deleteInvoice,
  getInvoiceBill,
} from "../controllers/invoiceController";

const router = Router();

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.get("/:id/bill", getInvoiceBill);
router.put("/:id", updateDraftInvoice);
router.post("/:id/finalize", finalizeInvoice);
router.delete("/:id", deleteInvoice);

export default router;
