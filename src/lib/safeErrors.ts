import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isStalePrismaClient } from "@/lib/prismaErrors";

/**
 * Wrap a route handler's body in this. Any thrown error is logged in full
 * server-side (for debugging) but the client only ever gets a generic
 * message — never a stack trace, a Prisma error string (which can reveal
 * column/table names), or any other internal detail. This matters because
 * an unhandled exception's default JSON body is exactly the kind of thing
 * someone pokes at in devtools' Network tab.
 */
export async function withSafeErrors<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    // The database could not be reached at all — the connection never opened,
    // so nothing was read or written. This is an infrastructure condition, not
    // a bad request, and it is worth distinguishing: reporting it as a generic
    // "something went wrong" sends whoever hit it looking for a bug in the
    // form they just submitted, when the actual cause is that the database is
    // asleep, the credentials are wrong, or the network dropped.
    //
    // Naming the subsystem leaks nothing about the schema — no table names,
    // no columns, no host — so this stays consistent with the rule that
    // clients never see internal detail.
    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("[db unreachable]", err.message);
      return NextResponse.json(
        { error: "Could not reach the database. Check that it is running and reachable, then try again." },
        { status: 503 }
      );
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[db error]", err.code, err.message);
      if (err.code === "P2002") {
        return NextResponse.json({ error: "That value already exists" }, { status: 409 });
      }
      // A write conflict or deadlock under a serializable transaction. Retrying
      // is the correct response, so say so rather than reporting a flat failure.
      if (err.code === "P2034") {
        return NextResponse.json(
          { error: "That conflicted with another change. Reload and try again." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Request could not be processed" }, { status: 400 });
    }

    // The generated Prisma client is older than schema.prisma: a model was
    // added (and perhaps migrated) but `prisma generate` never ran, so
    // `prisma.someModel` is simply undefined and the first query on it throws
    // a bare TypeError. That reads like a bug in the route. It is not — it is a
    // stale build artefact, and the log should say so and say how to fix it.
    //
    // The scripts now regenerate on `npm install` and before `npm run dev`, so
    // this should not recur; this makes it obvious if it ever does.
    if (isStalePrismaClient(err)) {
      console.error(
        "[prisma client out of date] A model in schema.prisma is missing from the generated client. " +
          "Run `npx prisma generate` (and `npx prisma migrate deploy` if the table is new), then restart the dev server."
      );
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "Something went wrong"
              : "The database client is out of date. Run `npx prisma generate` and restart the dev server."
        },
        { status: 503 }
      );
    }

    console.error("[unhandled error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
