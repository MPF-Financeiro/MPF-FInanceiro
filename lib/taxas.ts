import type { ConfigTaxa } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * PROVISÓRIO até a cliente confirmar as taxas do Paga-me. Ficam aqui, num
 * lugar só, para a troca não virar caça aos números espalhados pelo código.
 */
export const TAXA_PADRAO = {
  notaBps: 1000, // 10% da nota fiscal, este número veio da cliente
  pixBps: 100,
  cartaoBps: 450,
  fixoPorVenda: 0,
};

export type Taxa = typeof TAXA_PADRAO & { id: string | null; vigenteDe: Date | null };

/**
 * A taxa é lida pela data da venda, não pela data de hoje: venda de março
 * continua batendo com o que foi recebido em março mesmo depois de a taxa
 * mudar.
 */
export async function taxaVigente(data: Date): Promise<Taxa> {
  const config = await db.configTaxa.findFirst({
    where: {
      vigenteDe: { lte: data },
      OR: [{ vigenteAte: null }, { vigenteAte: { gte: data } }],
    },
    orderBy: { vigenteDe: "desc" },
  });
  return deConfig(config);
}

export function deConfig(config: ConfigTaxa | null): Taxa {
  if (!config) return { ...TAXA_PADRAO, id: null, vigenteDe: null };
  return {
    id: config.id,
    vigenteDe: config.vigenteDe,
    notaBps: config.notaBps,
    pixBps: config.pixBps,
    cartaoBps: config.cartaoBps,
    fixoPorVenda: config.fixoPorVenda,
  };
}

export function bpsDoMeio(taxa: Taxa, meio: "PIX" | "CARTAO"): number {
  return meio === "PIX" ? taxa.pixBps : taxa.cartaoBps;
}

/** "4,5%" a partir de 450 bps. */
export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
