import { Router } from "express";
import * as customerController from "../controllers/customerController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post("/", requirePermission("Customers", "create"), customerController.createCustomer);
router.get("/", requirePermission("Customers", "read"), customerController.getCustomers);
router.get("/:id", requirePermission("Customers", "read"), customerController.getCustomerById);
router.put("/:id", requirePermission("Customers", "update"), customerController.updateCustomer);
router.delete("/:id", requirePermission("Customers", "delete"), customerController.deleteCustomer);

export default router;
