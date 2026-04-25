import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";

/**
 * Generates a readable batch number of exactly 10 characters.
 * Format: YYMMXXXXXX (YY=Year, MM=Month, XXXXXX=Random uppercase alphanumeric)
 */
export const generateBatchNo = (): string => {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  // 6 characters of random alphanumeric (uppercase + numbers)
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let randomStr = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    randomStr += charset[bytes[i] % charset.length];
  }

  return `${yy}${mm}${randomStr}`;
};

/**
 * Generates a unique batch number that does not exist in the database.
 * Retries up to 10 times if collisions occur.
 */
export const generateUniqueBatchNo = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const candidate = generateBatchNo();
    const existing = await prisma.batches.findUnique({
      where: { batch_no: candidate },
    });

    if (!existing) {
      return candidate;
    }
    attempts++;
  }

  throw new Error(
    "Unable to generate a unique batch number after multiple attempts",
  );
};
