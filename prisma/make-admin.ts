// file: apps/web/prisma/make-admin.ts
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL missing");

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new Error(`No user found for email: ${email}`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN },
  });

  console.log("Promoted:", updated.email, "->", updated.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
