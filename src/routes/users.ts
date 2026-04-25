import { Router } from "express";
import * as userController from "../controllers/userController";
import { requirePermission } from "../lib/authMiddleware";

const router = Router();

router.post(
  "/",
  requirePermission("Users", "create"),
  userController.createUser,
);
router.get("/", requirePermission("Users", "read"), userController.getUsers);
router.get(
  "/:id",
  requirePermission("Users", "read"),
  userController.getUserById,
);
router.put(
  "/:id",
  requirePermission("Users", "update"),
  userController.updateUser,
);

export default router;
