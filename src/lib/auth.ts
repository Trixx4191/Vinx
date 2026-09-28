import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { evaluateSession, type SessionUserRow } from "@/lib/sessionCheck";

// Generic error message on purpose: never reveal whether the email or the
// password was wrong. That distinction is exactly what account-enumeration
// attacks rely on.
const INVALID_CREDENTIALS = "Invalid email or password";
// Distinct, specific error the login page watches for to know when to show
// a second "enter your 6-digit code" step — not a security-sensitive
// distinction, since it only ever fires after the password already checked out.
const TWO_FACTOR_REQUIRED = "2FA_REQUIRED";
const INVALID_TWO_FACTOR = "Invalid authentication code";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(INVALID_CREDENTIALS);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        });

        // Run bcrypt.compare even when no user exists, against a dummy hash,
        // so response timing doesn't leak whether the email is registered.
        const dummyHash = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8O5RZQhH4/UNTNbLAyE0J.5o.3ZlWK";
        const isValid = await bcrypt.compare(credentials.password, user?.passwordHash ?? dummyHash);

        if (!user || !isValid) {
          throw new Error(INVALID_CREDENTIALS);
        }

        // 2FA is enforced for admin accounts with it enabled — the account
        // type that matters most to protect. Regular customers aren't
        // required to have it (kept optional here to avoid adding friction
        // to checkout), but the same fields/flow would extend to them too.
        //
        // This MUST use isAdminRole rather than comparing to "ADMIN": a
        // literal comparison silently stops covering SUPER_ADMIN the moment
        // that role exists, which would let the single most privileged
        // account in the system log in on a password alone despite having
        // 2FA switched on.
        if (isAdminRole(user.role) && user.twoFactorEnabled) {
          if (!user.twoFactorSecret) {
            throw new Error(INVALID_CREDENTIALS); // inconsistent state — fail closed
          }
          if (!credentials.code) {
            throw new Error(TWO_FACTOR_REQUIRED);
          }
          const validCode = authenticator.check(credentials.code, user.twoFactorSecret);
          if (!validCode) {
            throw new Error(INVALID_TWO_FACTOR);
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion
        };
      }
    })
  ],
  callbacks: {
    /**
     * Runs on every server-side session read — getServerSession in pages, API
     * routes and layouts, and the client's /api/auth/session poll.
     *
     * The token is no longer trusted for anything but WHO the user is. What
     * they are allowed to do is re-read from the database every time. See
     * src/lib/sessionCheck.ts for the flaw this closes.
     */
    async jwt({ token, user }) {
      // Sign-in: stamp the token with the user's current session version.
      if (user) {
        token.id = user.id;
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.role = (user as { role?: string }).role;
        return token;
      }

      if (!token.id) return token;

      let row: SessionUserRow | null;
      try {
        row = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, sessionVersion: true, vipUntil: true, name: true, avatarUrl: true }
        });
      } catch (error) {
        // The database is unreachable. Two bad options, and this picks the
        // safer one. Throwing here would make NextAuth clear the cookie —
        // signing every user out on every database blip. Returning the token
        // unchanged would let a revoked admin through while the database is
        // down. Instead the identity is kept and the PRIVILEGE is dropped for
        // this request: nobody is treated as an admin until the role can be
        // confirmed, and the next successful read restores it.
        console.error("[auth] could not verify session against the database", error);
        return { ...token, role: undefined, vip: false };
      }

      const verdict = evaluateSession(token.sv, row);
      if (verdict.kind === "revoked") {
        // Throwing is how a JWT session ends in NextAuth v4: the session route
        // catches it, clears the cookie and returns an empty session, and
        // getServerSession then returns null everywhere.
        throw new Error(`SESSION_REVOKED:${verdict.reason}`);
      }

      token.role = verdict.role;
      token.vip = verdict.vip;
      token.name = verdict.name;
      token.picture = verdict.image;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as { id?: string; role?: string; vip?: boolean; image?: string | null; name?: string | null };
        user.id = token.id as string;
        user.role = token.role as string | undefined;
        user.vip = Boolean(token.vip);
        user.name = (token.name as string | null | undefined) ?? null;
        user.image = (token.picture as string | null | undefined) ?? null;
      }
      return session;
    }
  },
  // secure: true cookies are enforced automatically by NextAuth when
  // NEXTAUTH_URL is https, and cookies are httpOnly + sameSite=lax by default.
  secret: process.env.NEXTAUTH_SECRET
};
