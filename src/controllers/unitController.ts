import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await prisma.units.findMany({
      select: {
        id: true,
        unit_name: true,
        symbol: true,
      },
    });

    res.json(units);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch units" });
  }
};
