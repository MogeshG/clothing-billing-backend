import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/v1", routes);

export default app;
