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
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post("/", requirePermission("Sales", "create"), createInvoice);
router.get("/", requirePermission("Sales", "read"), getInvoices);
router.get("/:id", requirePermission("Sales", "read"), getInvoiceById);
router.get("/:id/bill", requirePermission("Sales", "read"), getInvoiceBill);
router.put("/:id", requirePermission("Sales", "update"), updateDraftInvoice);
router.post(
  "/:id/finalize",
  requirePermission("Sales", "update"),
  finalizeInvoice,
);
router.delete("/:id", requirePermission("Sales", "delete"), deleteInvoice);

export default router;
