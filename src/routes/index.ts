import { Router } from "express";
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

const router = Router();

router.use("/auth", authRouter);
router.use("/customers", customersRouter);
router.use("/vendors", vendorsRouter);
router.use("/purchases", purchasesRouter);
router.use("/batches", batchesRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/variants", variantsRouter);
router.use("/invoices", invoicesRouter);
router.use("/creditnotes", creditNotesRouter);
router.use("/units", unitsRouter);
router.use("/stock-movements", stockMovementsRouter);
router.use("/stock-adjustments", stockAdjustmentsRouter);
router.use("/analytics", analyticsRouter);
router.use("/preferences", preferencesRouter);

export default router;


