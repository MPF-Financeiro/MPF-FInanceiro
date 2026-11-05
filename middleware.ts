import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/** Só authConfig: o middleware roda no edge, onde Prisma e bcrypt não vão. */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
