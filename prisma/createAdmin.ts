// Create or reset an admin account.
//
//   npm run create-admin -- --super trixx4191@gmail.com "your-password" "Your Name"
//   npm run create-admin -- staff@vinx.com "their-password" "Their Name"
//
// --super creates a SUPER_ADMIN (master admin): everything an ADMIN can do,
// plus granting and revoking staff access from /admin/staff. Without the flag
// the account is a regular ADMIN.
//
// This is intentionally a standalone script, not an API route. Creating the
// FIRST admin has to be possible before any admin exists to authorise it, and
// bootstrapping privilege should require access to the server/database
// directly (SSH, hosting console, CI secrets) — never something reachable over
// HTTP. Once a master admin exists, further staff are added through the UI.
//
// Note: a password passed as a CLI argument is visible in your shell history
// and, briefly, to anyone who can run `ps` on this machine. To avoid both,
// pass it by environment variable instead:
//
//   ADMIN_PASSWORD='your-password' npm run create-admin -- --super you@example.com

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const wantsSuper = args.includes("--super");
  const [email, passwordArg, name] = args.filter((arg) => arg !== "--super");

  const password = process.env.ADMIN_PASSWORD ?? passwordArg;
  const role = wantsSuper ? "SUPER_ADMIN" : "ADMIN";

  if (!email || !password) {
    console.error('Usage: npm run create-admin -- [--super] <email> "<password>" ["Name"]');
    console.error("   or: ADMIN_PASSWORD='...' npm run create-admin -- [--super] <email> [\"Name\"]");
    process.exit(1);
  }

  // Mirrors passwordSchema in src/lib/validation.ts. Kept as a plain check so
  // this script has no dependency on the app's module graph.
  if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error("Password must be at least 10 characters and include a letter and a number.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const normalisedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    select: { role: true }
  });

  const user = await prisma.user.upsert({
    where: { email: normalisedEmail },
    // Re-running against an existing account resets its password and role.
    // That is deliberate: this doubles as the recovery path if the master
    // admin is ever locked out.
    update: { role, passwordHash },
    create: { email: normalisedEmail, name: name ?? "Admin", passwordHash, role }
  });

  const verb = existing ? "updated" : "created";
  console.log(`${role === "SUPER_ADMIN" ? "Master admin" : "Admin"} ${verb}: ${user.email}`);

  if (existing && existing.role !== role) {
    console.log(`  Role changed: ${existing.role} -> ${role}`);
  }

  if (role === "SUPER_ADMIN") {
    console.log("\nNext: sign in, then turn on 2FA at /admin/security.");
    console.log("Until 2FA is on, this account is protected by the password alone.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
