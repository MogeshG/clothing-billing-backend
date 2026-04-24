import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getPreferences = async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.preferences.findMany();

    // Map to a cleaner object { [key]: value }
    const mappedPrefs = preferences.reduce((acc: any, pref) => {
      acc[pref.key] = pref.value;
      return acc;
    }, {});

    // Ensure default invoiceType exists
    if (!mappedPrefs.invoiceType) {
      mappedPrefs.invoiceType = "a4";
    }

    res.json(mappedPrefs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
};

export const updatePreference = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: "Key and value are required" });
    }

    const preference = await prisma.preferences.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    res.json(preference);
  } catch (error) {
    res.status(500).json({ error: "Failed to update preference" });
  }
};

export const updateMultiplePreferences = async (req: Request, res: Response) => {
  try {
    const { preferences } = req.body; // Expects { [key]: value }

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ error: "Preferences object is required" });
    }

    const updates = Object.entries(preferences).map(([key, value]) => {
      return prisma.preferences.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });

    await prisma.$transaction(updates);

    res.json({ message: "Preferences updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
};
