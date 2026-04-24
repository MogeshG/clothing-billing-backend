import { Router } from "express";
import {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getLowStockAlerts,
  getRevenueByPaymentMethod,
} from "../controllers/analyticsController";

const router = Router();

router.get("/stats", getDashboardStats);
router.get("/sales-report", getSalesReport);
router.get("/top-products", getTopProducts);
router.get("/low-stock", getLowStockAlerts);
router.get("/payment-breakdown", getRevenueByPaymentMethod);

export default router;
