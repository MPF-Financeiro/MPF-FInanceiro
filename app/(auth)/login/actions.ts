"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type EstadoLogin = { erro: string | null };

/**
 * O login é server action, não `signIn` do cliente: como o app roda sob
 * basePath /financeiro, o cliente do next-auth chamaria /api/auth e levaria
 * 404. No servidor o caminho é resolvido pela própria config.
 */
export async function entrar(
  _estado: EstadoLogin,
  dados: FormData
): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("password") ?? "");
  // Com basePath, o redirect do next-auth não prefixa sozinho: o destino
  // tem de vir completo, senão a pessoa cai na raiz do SampsOS.
  const destino = String(dados.get("callbackUrl") ?? "") || "/financeiro";

  if (!email || !senha) return { erro: "Preencha e-mail e senha para continuar." };

  try {
    await signIn("credentials", { email, password: senha, redirectTo: destino });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        erro: "Não foi possível entrar. Confira o e-mail e a senha, ou se a conta está ativa.",
      };
    }
    // O redirect de sucesso é lançado como erro pelo Next: tem de subir.
    throw e;
  }
  return { erro: null };
}
