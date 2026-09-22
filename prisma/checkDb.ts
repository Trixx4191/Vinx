// Check whether the database is reachable, and say plainly what is wrong.
//
//   npm run db:check
//
// "Connection reset by peer" during an upload tells you almost nothing about
// which layer failed. This isolates the database from everything else: if this
// passes, the problem is elsewhere; if it fails, the message names the likely
// cause rather than leaving you to infer it from a TLS error.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/Connection reset by peer|Connection refused|connect ETIMEDOUT|ECONNRESET/i.test(message)) {
    return [
      "Could not open a connection to the database.",
      "",
      "Most likely, in order:",
      "  1. A serverless database (Neon, Supabase) has auto-suspended after being idle.",
      "     These wake on demand, but the first connection after sleeping is often",
      "     reset while the compute starts. Simply running this again usually works.",
      "  2. Your machine lost internet, or changed network (e.g. a phone hotspot",
      "     dropping). The database is remote, so every query needs connectivity.",
      "  3. A firewall or VPN is blocking outbound Postgres (usually port 5432)."
    ].join("\n");
  }

  if (/authentication failed|password/i.test(message)) {
    return "The database rejected the credentials. Check the user and password in DATABASE_URL.";
  }

  if (/does not exist/i.test(message)) {
    return "Connected to the server, but that database name does not exist. Check the last path segment of DATABASE_URL.";
  }

  if (/getaddrinfo|ENOTFOUND/i.test(message)) {
    return "The database hostname could not be resolved. Check the host in DATABASE_URL, and that you are online.";
  }

  return message;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  // Show the host without ever printing the password.
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`Connecting to ${url.hostname}${url.pathname} as ${url.username}…`);
  } catch {
    console.log("Connecting…");
  }

  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const elapsed = Date.now() - startedAt;

    const [categories, products, admins] = await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
      prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } })
    ]);

    console.log(`\nConnected in ${elapsed}ms.`);
    console.log(`  categories: ${categories}`);
    console.log(`  products:   ${products}`);
    console.log(`  admins:     ${admins}`);

    if (categories === 0) console.log("\nNo categories yet — run: npm run seed");
    if (admins === 0) console.log("\nNo admin yet — run: npm run create-admin -- --super <email> \"<password>\"");
  } catch (error) {
    console.error(`\n${describe(error)}`);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
