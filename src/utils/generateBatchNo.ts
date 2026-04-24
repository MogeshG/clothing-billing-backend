import { randomBytes } from "crypto";

/**
 * Generates a unique, readable batch number of exactly 10 characters.
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
