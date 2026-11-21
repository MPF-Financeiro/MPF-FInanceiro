import { db } from "@/lib/db";
import { competenciaDe, inicioDoMes } from "@/lib/mes";
import type { ContaParaSaldo, Lancamento } from "@/lib/relatorios";

/**
 * Carrega tudo de que os relatórios precisam numa ida só. O volume da Samps é
 * de centenas de títulos por ano: cabe na memória e as contas ficam puras.
 */
export async function carregarRelatorios() {
  const [titulos, contas, unidades] = await Promise.all([
    db.titulo.findMany({
      include: {
        baixas: { select: { valor: true, data: true, contaId: true } },
        vendaSite: { select: { nota: true, taxa: true } },
        cliente: { select: { nome: true } },
        fornecedor: { select: { nome: true } },
        colaborador: { select: { nome: true } },
      },
    }),
    db.contaBancaria.findMany({
      select: { id: true, apelido: true, banco: true, saldoInicial: true, saldoInicialEm: true, ativa: true },
      orderBy: { apelido: "asc" },
    }),
    db.unidadeNegocio.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const lancamentos: Lancamento[] = titulos.map((t) => ({
    id: t.id,
    direcao: t.direcao,
    categoria: t.categoria,
    origem: t.origem,
    descricao: t.descricao,
    valor: t.valor,
    competencia: t.competencia,
    vencimento: t.vencimento,
    canceladoEm: t.canceladoEm,
    baixas: t.baixas,
    deducoesVenda: t.vendaSite ? t.vendaSite.nota + t.vendaSite.taxa : 0,
    quem: t.cliente?.nome ?? t.fornecedor?.nome ?? t.colaborador?.nome ?? null,
    atividade: t.atividade,
    natureza: t.natureza,
    grupo: t.grupo,
    unidadeId: t.unidadeId,
    naoOperacional: t.naoOperacional,
  }));

  const contasParaSaldo: ContaParaSaldo[] = contas.map((c) => ({
    id: c.id,
    saldoInicial: c.saldoInicial,
    saldoInicialEm: c.saldoInicialEm,
  }));

  const nomeDaUnidade = (id: string | null) =>
    id ? (unidades.find((u) => u.id === id)?.nome ?? "BU removida") : "Sem BU";

  return { lancamentos, contas, contasParaSaldo, unidades, nomeDaUnidade };
}

/** O mês que a página mostra: `?mes=2026-11`, ou o mês corrente. */
export function mesDaPagina(param: string | string[] | undefined): Date {
  const texto = Array.isArray(param) ? param[0] : param;
  return (texto && competenciaDe(texto)) || inicioDoMes(new Date());
}
