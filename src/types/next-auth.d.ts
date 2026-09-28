import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      /** Re-read from the database on every session read — never trusted from the token. */
      role?: string;
      vip?: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    /** The user's sessionVersion when this token was issued. */
    sv?: number;
    vip?: boolean;
  }
}
