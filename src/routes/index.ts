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

export default router;
