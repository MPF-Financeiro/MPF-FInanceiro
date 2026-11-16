import type { NextAuthConfig } from "next-auth";

/**
 * Config compartilhada entre o middleware (edge) e o handler de API (node).
 * Nada de Prisma ou bcrypt aqui: o provider de credenciais vive em lib/auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  basePath: "/financeiro/api/auth",
  // Com basePath, o next-auth não prefixa estes caminhos: eles têm de vir
  // completos, senão a pessoa é jogada para o login do SampsOS.
  pages: { signIn: "/financeiro/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const user = auth?.user;
      // Dependendo de onde o app roda, o middleware vê o caminho com ou sem
      // o basePath. Tirar o prefixo deixa a regra igual nos dois casos.
      const pathname = request.nextUrl.pathname.replace(/^\/financeiro/, "") || "/";
      const isLogin = pathname === "/login";

      if (!user) return isLogin;
      if (isLogin) return Response.redirect(new URL("/financeiro", request.nextUrl));
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
