import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Optional IP allowlist for /admin, on top of everything else. If
// ADMIN_IP_ALLOWLIST is unset, this check is skipped entirely (useful for
// local dev / before you have a static office/VPN IP to lock to). Once set,
// it's a comma-separated list of exact IPs — e.g. "82.14.3.10,82.14.3.11".
function isAllowedAdminIp(req: NextRequest): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST;
  if (!allowlist) return true; // not configured — don't block anyone

  const ips = allowlist.split(",").map((ip) => ip.trim());
  const forwardedFor = req.headers.get("x-forwarded-for");
  const requestIp = forwardedFor?.split(",")[0]?.trim();

  return !!requestIp && ips.includes(requestIp);
}

// Runs before any matched page renders. Layers, in order:
//  1. Admin route + IP not on the allowlist (if configured) -> redirect home
//  2. Not logged in at all -> bounce to /login (checkout, account, admin, orders)
//  3. Logged in but not an ADMIN on an admin route -> redirect home, never a
//     page that confirms an admin area exists at this path.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute && !isAllowedAdminIp(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
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
