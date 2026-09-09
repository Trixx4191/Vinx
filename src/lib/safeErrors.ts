import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[db error]", err.code, err.message);
      if (err.code === "P2002") {
        return NextResponse.json({ error: "That value already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Request could not be processed" }, { status: 400 });
    }

    console.error("[unhandled error]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
