import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Generic error message on purpose: never reveal whether the email or the
// password was wrong. That distinction is exactly what account-enumeration
// attacks rely on.
const INVALID_CREDENTIALS = "Invalid email or password";

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
        password: { label: "Password", type: "password" }
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

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    }
  },
  // secure: true cookies are enforced automatically by NextAuth when
  // NEXTAUTH_URL is https, and cookies are httpOnly + sameSite=lax by default.
  secret: process.env.NEXTAUTH_SECRET
};
