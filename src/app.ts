import express from "express";
import cors from "cors";
import path from "path";
import routes from "./routes";

const app = express();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api/v1", routes);

export default app;
