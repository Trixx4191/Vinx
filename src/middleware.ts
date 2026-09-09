import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Runs before any matched page renders. Two layers of protection:
//  1. Not logged in at all -> bounce to /login (checkout, account, admin)
//  2. Logged in but not an ADMIN -> silently redirect home, never a page
//     that confirms an admin area exists at this path.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute =
    pathname.startsWith("/checkout") || pathname.startsWith("/account") || pathname.startsWith("/orders");

  if (!token && (isAdminRoute || isProtectedRoute)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*", "/account/:path*", "/admin/:path*", "/orders/:path*"]
};
