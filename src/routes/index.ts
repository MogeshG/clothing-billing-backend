import { Router } from "express";
import { authenticateToken } from "../lib/authMiddleware";
import authRouter from "./auth";
import customersRouter from "./customers";
import vendorsRouter from "./vendors";
import purchasesRouter from "./purchases";
import batchesRouter from "./batches";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import variantsRouter from "./variants";
import invoicesRouter from "./invoices";
import creditNotesRouter from "./creditnotes";
import unitsRouter from "./units";
import stockMovementsRouter from "./stockMovements";
import stockAdjustmentsRouter from "./stockAdjustments";
import analyticsRouter from "./analytics";
import preferencesRouter from "./preferences";
import usersRouter from "./users";

const router = Router();

// Public auth routes (no token required)
router.use("/auth", authRouter);

// Protected routes (token required)
router.use("/customers", authenticateToken, customersRouter);
router.use("/vendors", authenticateToken, vendorsRouter);
router.use("/purchases", authenticateToken, purchasesRouter);
router.use("/batches", authenticateToken, batchesRouter);
router.use("/categories", authenticateToken, categoriesRouter);
router.use("/products", authenticateToken, productsRouter);
router.use("/variants", authenticateToken, variantsRouter);
router.use("/invoices", authenticateToken, invoicesRouter);
router.use("/creditnotes", authenticateToken, creditNotesRouter);
router.use("/units", authenticateToken, unitsRouter);
router.use("/stock-movements", authenticateToken, stockMovementsRouter);
router.use("/stock-adjustments", authenticateToken, stockAdjustmentsRouter);
router.use("/analytics", authenticateToken, analyticsRouter);
router.use("/preferences", authenticateToken, preferencesRouter);
router.use("/users", authenticateToken, usersRouter);

export default router;

