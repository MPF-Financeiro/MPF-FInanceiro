import { z } from "zod";
import { competenciaDe } from "@/lib/mes";

/**
 * Dinheiro digitado por pessoa: "1.234,56", "1234,56", "1234.56", "1234".
 * Nunca `parseFloat` direto, que lê "1.234,56" como 1,234.
 */
export function parseCentavos(entrada: unknown): number | null {
  const texto = String(entrada ?? "").trim().replace(/\s|R\$/g, "");
  if (!texto) return null;
  if (!/^-?[\d.,]+$/.test(texto)) return null;

  let normalizado = texto;
  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");
  if (temVirgula && temPonto) {
    // O último separador manda: "1.234,56" e "1,234.56" dão o mesmo valor.
    normalizado =
      texto.lastIndexOf(",") > texto.lastIndexOf(".")
        ? texto.replace(/\./g, "").replace(",", ".")
        : texto.replace(/,/g, "");
  } else if (temVirgula) {
    normalizado = texto.replace(",", ".");
  } else if (temPonto) {
    // "1.234" é mil duzentos e trinta e quatro; "1.23" é um e vinte e três.
    const decimais = texto.length - texto.lastIndexOf(".") - 1;
    normalizado = decimais === 3 ? texto.replace(/\./g, "") : texto;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 100);
}

/** Zod que lê dinheiro de um campo de texto e devolve centavos inteiros. */
export const dinheiro = z
  .string()
  .transform((v, ctx) => {
    const centavos = parseCentavos(v);
    if (centavos === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor inválido" });
      return z.NEVER;
    }
    return centavos;
  });

export const dinheiroPositivo = dinheiro.refine((c) => c > 0, "O valor tem de ser maior que zero");

/** Percentual digitado ("4,5") vira pontos-base (450). */
export function parseBps(entrada: unknown): number | null {
  const centavos = parseCentavos(entrada);
  return centavos === null ? null : centavos;
}

export const dataObrigatoria = z
  .string()
  .min(1, "Informe a data")
  .transform((v, ctx) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida" });
      return z.NEVER;
    }
    return d;
  });

export const dataOpcional = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const competencia = z
  .string()
  .min(1, "Informe a competência")
  .transform((v, ctx) => {
    const d = competenciaDe(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Competência inválida" });
      return z.NEVER;
    }
    return d;
  });

export const textoCurto = z.string().trim().max(200);
export const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : null));

/** Primeira mensagem de erro de cada campo, no formato que os forms usam. */
export function erroDe(e: z.ZodError): string {
  const primeiro = e.issues[0];
  const campo = primeiro?.path?.join(".");
  return campo ? `${campo}: ${primeiro.message}` : (primeiro?.message ?? "Dados inválidos");
}
