// Run with: npm run create-admin -- admin@vinx.com "a-strong-password" "Admin Name"
//
// This is intentionally a standalone script, not an API route. Creating
// admins should require access to the server/database directly (e.g. SSH,
// hosting provider console, or CI secrets) — never something reachable
// over HTTP, even behind a login.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, password, name] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> "<password>" ["Name"]');
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "ADMIN", passwordHash },
    create: { email: email.toLowerCase(), name: name ?? "Admin", passwordHash, role: "ADMIN" }
  });

  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
