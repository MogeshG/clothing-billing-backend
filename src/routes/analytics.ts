import { Router } from "express";
import {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getLowStockAlerts,
  getRevenueByPaymentMethod,
} from "../controllers/analyticsController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.get("/stats", requirePermission("Dashboard", "read"), getDashboardStats);
router.get("/sales-report", requirePermission("Sales", "read"), getSalesReport);
router.get(
  "/top-products",
  requirePermission("Dashboard", "read"),
  getTopProducts,
);
router.get(
  "/low-stock",
  requirePermission("Stocks", "read"),
  getLowStockAlerts,
);
router.get(
  "/payment-breakdown",
  requirePermission("Dashboard", "read"),
  getRevenueByPaymentMethod,
);

export default router;
