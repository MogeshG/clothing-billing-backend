import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

/**
 * Generates a barcode string. Defaults to a UUID-like format.
 */
export const generateBarcode = (): string => {
  // Use a UUID without dashes for a compact barcode
  return randomUUID().replace(/-/g, "").toUpperCase();
};

/**
 * Generates a unique barcode that does not exist in the database.
 * Retries up to 10 times if collisions occur.
 */
export const generateUniqueBarcode = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const candidate = generateBarcode();
    const existing = await prisma.batches.findFirst({
      where: { barcode: candidate },
    });

    if (!existing) {
      return candidate;
    }
    attempts++;
  }

  throw new Error(
    "Unable to generate a unique barcode after multiple attempts",
  );
};
