import { PrismaClient, units } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultUnits: Omit<units, "id" | "created_at" | "updated_at">[] = [
    { unit_name: "Piece", symbol: "PCS" },
    { unit_name: "Pair", symbol: "PAIR" },
    { unit_name: "Set", symbol: "SET" },
    { unit_name: "Dozen", symbol: "DOZ" },

    { unit_name: "Meter", symbol: "MTR" },
    { unit_name: "Centimeter", symbol: "CM" },
    { unit_name: "Inch", symbol: "IN" },
    { unit_name: "Yard", symbol: "YRD" },

    { unit_name: "Kilogram", symbol: "KG" },
    { unit_name: "Gram", symbol: "G" },
  ];

  for (const unit of defaultUnits) {
    await prisma.units.upsert({
      where: { symbol: unit.symbol },
      update: {},
      create: unit,
    });
  }

  console.log("✅ Seeded default units");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
