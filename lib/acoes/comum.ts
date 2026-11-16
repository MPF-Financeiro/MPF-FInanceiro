import { ZodError } from "zod";
import { SemPermissao } from "@/lib/permissoes";
import { MesFechado } from "@/lib/fechamento";
import { JaLancado } from "@/lib/idempotencia";
import { erroDe } from "@/lib/validacao";

export type Estado = { erro: string | null; ok: string | null };
export const ESTADO_VAZIO: Estado = { erro: null, ok: null };

/**
 * Caminho com o basePath, para <a> e formulários method="get", que não passam
 * pelo router. O `redirect()` do Next já põe o basePath sozinho: passar o
 * caminho com o prefixo nele leva a /financeiro/financeiro e dá 404.
 */
export const BASE = "/financeiro";
export function rota(caminho: string): string {
  return `${BASE}${caminho === "/" ? "" : caminho}` || BASE;
}

/**
 * Traduz a exceção para uma frase que a cliente entenda. Erro inesperado não
 * vaza detalhe de banco para a tela, mas vai para o log do servidor.
 */
export function falha(e: unknown): Estado {
  if (e instanceof ZodError) return { erro: erroDe(e), ok: null };
  if (e instanceof SemPermissao || e instanceof MesFechado || e instanceof JaLancado) {
    return { erro: e.message, ok: null };
  }
  if (e instanceof Error && e.message.startsWith("AVISO: ")) {
    return { erro: e.message.slice(7), ok: null };
  }
  console.error("[financeiro] ação falhou", e);
  return { erro: "Não deu para salvar. Tente de novo; se insistir, me chame.", ok: null };
}

/** Erro de regra de negócio, com mensagem que pode ir para a tela. */
export function aviso(mensagem: string): never {
  throw new Error(`AVISO: ${mensagem}`);
}

/** O redirect do Next é lançado como exceção: tem de subir, não virar erro. */
export function ehRedirect(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (e as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}
