"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
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
  /**
   * O destino é um caminho de dentro do app, SEM o basePath: quem põe o
   * prefixo é o `redirect()` do Next. O `redirect` do próprio next-auth não
   * serve aqui, porque ele monta a URL a partir da config com basePath e o
   * router acaba pedindo /financeiro/financeiro, que é 404.
   */
  const bruto = String(dados.get("callbackUrl") ?? "");
  const destino = caminhoInterno(bruto);

  if (!email || !senha) return { erro: "Preencha e-mail e senha para continuar." };

  try {
    await signIn("credentials", { email, password: senha, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        erro: "Não foi possível entrar. Confira o e-mail e a senha, ou se a conta está ativa.",
      };
    }
    throw e;
  }

  // Fora do try: o redirect é lançado como exceção e não pode ser confundido
  // com falha de login.
  redirect(destino);
}

/**
 * Transforma o callbackUrl em um caminho interno seguro. Só caminho do próprio
 * app entra: URL de outro site viraria redirecionamento aberto.
 */
function caminhoInterno(bruto: string): string {
  if (!bruto) return "/";
  let caminho = bruto;
  if (/^https?:\/\//i.test(bruto)) {
    try {
      caminho = new URL(bruto).pathname;
    } catch {
      return "/";
    }
  }
  if (!caminho.startsWith("/") || caminho.startsWith("//")) return "/";
  caminho = caminho.replace(/^\/financeiro/, "");
  return caminho || "/";
}
