import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { prisma } from "./prisma";

export interface PermissionFlags {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type UserPermissions = Record<string, PermissionFlags>;

export interface AuthRequest extends Request {
  userId?: string;
  userPermissions?: UserPermissions;
}

const parsePermissions = (
  permissions: string | null | undefined,
): UserPermissions => {
  if (!permissions) return {};
  try {
    const parsed = JSON.parse(permissions);
    if (Array.isArray(parsed)) {
      return parsed.reduce((acc: UserPermissions, item: any) => {
        if (item?.module) {
          acc[item.module] = {
            create: Boolean(item.canCreate),
            read: Boolean(item.canRead),
            update: Boolean(item.canUpdate),
            delete: Boolean(item.canDelete),
          };
        }
        return acc;
      }, {});
    }
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as UserPermissions;
    }
    return {};
  } catch {
    return {};
  }
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = payload.userId;

  // Fetch user permissions from DB
  try {
    const user = await prisma.users.findUnique({
      where: { id: payload.userId },
      select: { permissions: true },
    });
    req.userPermissions = parsePermissions(user?.permissions);
  } catch {
    req.userPermissions = {};
  }

  next();
};

export const requirePermission = (
  module: string,
  action: keyof PermissionFlags,
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const permissions = req.userPermissions || {};
    const modulePerms = permissions[module];

    // If no permissions defined for this module at all, deny access
    if (!modulePerms) {
      return res
        .status(403)
        .json({ error: `Forbidden: no access to ${module}` });
    }

    if (!modulePerms[action]) {
      return res.status(403).json({
        error: `Forbidden: ${action} permission required for ${module}`,
      });
    }

    next();
  };
};
