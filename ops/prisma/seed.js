const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "hello@haulinjunkies.com";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD env var is required to seed the admin user.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Seeded admin user: ${user.email}`);

  const existingTaxRate = await prisma.taxRate.findFirst({ where: { name: "FL Sales Tax" } });
  if (existingTaxRate) {
    await prisma.taxRate.update({ where: { id: existingTaxRate.id }, data: { rateBps: 650, active: true } });
  } else {
    await prisma.taxRate.create({ data: { name: "FL Sales Tax", rateBps: 650 } });
  }
  console.log("Seeded tax rate: FL Sales Tax (6.5%)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
