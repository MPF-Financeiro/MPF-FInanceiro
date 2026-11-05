import type { NextAuthConfig } from "next-auth";

/**
 * Config compartilhada entre o middleware (edge) e o handler de API (node).
 * Nada de Prisma ou bcrypt aqui: o provider de credenciais vive em lib/auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  basePath: "/financeiro/api/auth",
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const user = auth?.user;
      const { pathname } = request.nextUrl;
      const isLogin = pathname === "/login";

      if (!user) return isLogin;
      if (isLogin) return Response.redirect(new URL("/", request.nextUrl));
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.papel = user.papel;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.papel = token.papel;
      return session;
    },
  },
} satisfies NextAuthConfig;
