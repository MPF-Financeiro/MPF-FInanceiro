import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const senha = String(credentials?.password ?? "");
        if (!email || !senha) return null;

        const usuario = await db.usuario.findUnique({ where: { email } });
        // Compara mesmo sem usuário, para que a resposta demore igual e não
        // conte a quem tenta se o e-mail existe.
        const hash = usuario?.senhaHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi";
        const ok = await bcrypt.compare(senha, hash);
        if (!usuario || !usuario.ativo || !ok) return null;

        await db.usuario.update({
          where: { id: usuario.id },
          data: { ultimoAcesso: new Date() },
        });

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          papel: usuario.papel,
        };
      },
    }),
  ],
});
