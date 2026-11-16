import { Direcao, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatBRL, saldo, statusDoTitulo, type StatusTitulo } from "@/lib/money";

const COM_BAIXAS = {
  baixas: { orderBy: { data: "asc" } },
  cliente: true,
  fornecedor: true,
  contrato: true,
} satisfies Prisma.TituloInclude;

export type TituloNaTela = Prisma.TituloGetPayload<{ include: typeof COM_BAIXAS }> & {
  recebido: number;
  pendente: number;
  status: StatusTitulo;
};

function decorar(t: Prisma.TituloGetPayload<{ include: typeof COM_BAIXAS }>): TituloNaTela {
  const valores = t.baixas.map((b) => b.valor);
  const recebido = valores.reduce((a, b) => a + b, 0);
  return {
    ...t,
    recebido,
    pendente: saldo(t.valor, valores),
    status: statusDoTitulo({
      valor: t.valor,
      baixas: valores,
      vencimento: t.vencimento,
      cancelado: Boolean(t.canceladoEm),
    }),
  };
}

export type FiltroTitulos = {
  /** Texto livre: descrição, cliente, fornecedor ou contrato. */
  q?: string;
  status?: StatusTitulo | "TODOS";
  /** Primeiro dia do mês, ou nulo para todas as competências. */
  competencia?: Date | null;
};

export async function listarTitulos(
  direcao: Direcao,
  filtro: FiltroTitulos = {}
): Promise<TituloNaTela[]> {
  const where: Prisma.TituloWhereInput = { direcao };

  if (filtro.competencia) {
    where.competencia = {
      gte: filtro.competencia,
      lt: new Date(
        Date.UTC(filtro.competencia.getUTCFullYear(), filtro.competencia.getUTCMonth() + 1, 1)
      ),
    };
  }

  const q = filtro.q?.trim();
  if (q) {
    where.OR = [
      { descricao: { contains: q, mode: "insensitive" } },
      { observacoes: { contains: q, mode: "insensitive" } },
      { cliente: { nome: { contains: q, mode: "insensitive" } } },
      { fornecedor: { nome: { contains: q, mode: "insensitive" } } },
      { colaborador: { nome: { contains: q, mode: "insensitive" } } },
      { contrato: { numero: { contains: q, mode: "insensitive" } } },
    ];
  }

  const titulos = await db.titulo.findMany({
    where,
    include: COM_BAIXAS,
    orderBy: [{ vencimento: "asc" }],
  });

  // O status é calculado, então o filtro dele é aplicado depois da consulta.
  // O volume da Samps é de centenas de títulos por ano: cabe na memória.
  const decorados = titulos.map(decorar);
  if (!filtro.status || filtro.status === "TODOS") return decorados;
  return decorados.filter((t) => t.status === filtro.status);
}

export type ResumoPainel = {
  aReceber: number;
  recebidoNoMes: number;
  aPagar: number;
  pagoNoMes: number;
  vencidos: { quantidade: number; total: number };
  liquidoDoSite: number;
  taxasDoSite: number;
  aReceberDoSite: number;
};

export async function resumoDoPainel(competencia: Date): Promise<ResumoPainel> {
  const inicio = new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 1));

  const [receber, pagar, vendas] = await Promise.all([
    listarTitulos(Direcao.RECEBER),
    listarTitulos(Direcao.PAGAR),
    db.vendaSite.findMany({
      where: { data: { gte: inicio, lt: fim } },
      include: { repasses: true },
    }),
  ]);

  const noMes = (t: TituloNaTela) => t.competencia >= inicio && t.competencia < fim;
  const baixasDoMes = (ts: TituloNaTela[]) =>
    ts
      .flatMap((t) => t.baixas)
      .filter((b) => b.data >= inicio && b.data < fim)
      .reduce((a, b) => a + b.valor, 0);

  const abertos = receber.filter((t) => t.status !== "QUITADO" && t.status !== "CANCELADO");
  const vencidos = receber.filter((t) => t.status === "VENCIDO");

  return {
    aReceber: abertos.reduce((a, t) => a + t.pendente, 0),
    recebidoNoMes: baixasDoMes(receber),
    aPagar: pagar
      .filter((t) => t.status !== "QUITADO" && t.status !== "CANCELADO" && noMes(t))
      .reduce((a, t) => a + t.pendente, 0),
    pagoNoMes: baixasDoMes(pagar),
    vencidos: {
      quantidade: vencidos.length,
      total: vencidos.reduce((a, t) => a + t.pendente, 0),
    },
    liquidoDoSite: vendas.reduce((a, v) => a + v.liquido, 0),
    taxasDoSite: vendas.reduce((a, v) => a + v.nota + v.taxa, 0),
    aReceberDoSite: vendas
      .flatMap((v) => v.repasses)
      .filter((r) => !r.efetivo)
      .reduce((a, r) => a + r.valor, 0),
  };
}

export async function listarVendas(competencia: Date) {
  const inicio = new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 1));
  return db.vendaSite.findMany({
    where: { data: { gte: inicio, lt: fim } },
    include: { curso: true, cupom: true, repasses: { orderBy: { numero: "asc" } } },
    orderBy: { data: "asc" },
  });
}

/** Tudo o que os selects de lançamento precisam, numa ida só ao banco. */
export async function opcoesDeLancamento() {
  const [empresas, clientes, fornecedores, contratos, colaboradores, contas] = await Promise.all([
    db.empresa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    db.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.contrato.findMany({ orderBy: { numero: "asc" }, include: { cliente: true } }),
    db.colaborador.findMany({
      where: { status: { not: "DESLIGADO" } },
      orderBy: { nome: "asc" },
    }),
    db.contaBancaria.findMany({ where: { ativa: true }, orderBy: { apelido: "asc" } }),
  ]);

  return {
    empresas: empresas.map((e) => ({ id: e.id, nome: e.nome })),
    clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
    fornecedores: fornecedores.map((f) => ({ id: f.id, nome: f.nome })),
    contratos: contratos.map((c) => ({
      id: c.id,
      nome: `${c.numero} — ${c.servico}`,
      clienteId: c.clienteId,
    })),
    colaboradores: colaboradores.map((c) => ({ id: c.id, nome: c.nome })),
    contas: contas.map((c) => ({ id: c.id, nome: `${c.apelido} (${c.banco})` })),
  };
}

const DETALHE = {
  baixas: {
    orderBy: { data: "asc" },
    include: {
      conta: true,
      registradoPor: { select: { nome: true } },
      estornadaPor: { select: { id: true } },
    },
  },
  cliente: true,
  fornecedor: true,
  contrato: true,
  colaborador: { select: { id: true, nome: true } },
  empresa: true,
  criadoPor: { select: { nome: true } },
  vendaSite: { include: { curso: true, cupom: true, repasses: true } },
  voucher: true,
} satisfies Prisma.TituloInclude;

export type TituloDetalhado = Prisma.TituloGetPayload<{ include: typeof DETALHE }> & {
  recebido: number;
  pendente: number;
  status: StatusTitulo;
};

export async function buscarTitulo(id: string): Promise<TituloDetalhado | null> {
  const t = await db.titulo.findUnique({ where: { id }, include: DETALHE });
  if (!t) return null;
  const valores = t.baixas.map((b) => b.valor);
  return {
    ...t,
    recebido: valores.reduce((a, b) => a + b, 0),
    pendente: saldo(t.valor, valores),
    status: statusDoTitulo({
      valor: t.valor,
      baixas: valores,
      vencimento: t.vencimento,
      cancelado: Boolean(t.canceladoEm),
    }),
  };
}

/** Parcelas de cartão que ainda não caíram, de qualquer mês. */
export async function repassesPendentes() {
  const repasses = await db.repasse.findMany({
    where: { efetivo: null },
    include: { venda: { include: { curso: true } } },
    orderBy: { previsao: "asc" },
  });
  const hoje = new Date();
  return repasses.map((r) => ({
    id: r.id,
    numero: r.numero,
    parcelas: r.venda.parcelas,
    valor: r.valor,
    previsao: r.previsao,
    aluno: r.venda.aluno,
    curso: r.venda.curso?.nome ?? r.venda.descricao ?? "—",
    atrasado: r.previsao < hoje,
  }));
}

export type Alerta = {
  texto: string;
  href: string;
  tom: "ruim" | "atencao" | "neutro";
};

/**
 * O que precisa de atenção hoje. A régua é sempre a mesma: só entra aqui o
 * que alguém tem de fazer algo a respeito.
 */
export async function alertas(hoje: Date): Promise<Alerta[]> {
  const emSeteDias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const emTrintaDias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  const competenciaAtual = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const [receber, pagar, repasses, exames, documentos, naoConciliados, folha] = await Promise.all([
    listarTitulos(Direcao.RECEBER),
    listarTitulos(Direcao.PAGAR),
    db.repasse.count({ where: { efetivo: null, previsao: { lt: hoje } } }),
    db.exameOcupacional.count({ where: { proximo: { not: null, lte: emTrintaDias } } }),
    db.documentoRH.count({ where: { venceEm: { not: null, lte: emTrintaDias } } }),
    db.movimentoExtrato.count({ where: { baixaId: null } }),
    db.folha.findUnique({ where: { competencia: competenciaAtual } }),
  ]);

  const lista: Alerta[] = [];

  const vencidosReceber = receber.filter((t) => t.status === "VENCIDO");
  if (vencidosReceber.length > 0) {
    lista.push({
      texto: `${vencidosReceber.length} ${vencidosReceber.length === 1 ? "conta a receber vencida" : "contas a receber vencidas"}, ${formatBRL(
        vencidosReceber.reduce((a, t) => a + t.pendente, 0)
      )} em aberto`,
      href: "/receber?status=VENCIDO",
      tom: "ruim",
    });
  }

  const vencidosPagar = pagar.filter((t) => t.status === "VENCIDO");
  if (vencidosPagar.length > 0) {
    lista.push({
      texto: `${vencidosPagar.length} ${vencidosPagar.length === 1 ? "conta a pagar vencida" : "contas a pagar vencidas"}, ${formatBRL(
        vencidosPagar.reduce((a, t) => a + t.pendente, 0)
      )}`,
      href: "/pagar?status=VENCIDO",
      tom: "ruim",
    });
  }

  const vencendo = pagar.filter(
    (t) =>
      (t.status === "ABERTO" || t.status === "PARCIAL") &&
      t.vencimento >= hoje &&
      t.vencimento <= emSeteDias
  );
  if (vencendo.length > 0) {
    lista.push({
      texto: `${vencendo.length} ${vencendo.length === 1 ? "conta vence" : "contas vencem"} nos próximos 7 dias, ${formatBRL(
        vencendo.reduce((a, t) => a + t.pendente, 0)
      )}`,
      href: "/pagar",
      tom: "atencao",
    });
  }

  if (repasses > 0) {
    lista.push({
      texto: `${repasses} ${repasses === 1 ? "repasse de cartão atrasado" : "repasses de cartão atrasados"}`,
      href: "/vendas",
      tom: "atencao",
    });
  }

  if (naoConciliados > 0) {
    lista.push({
      texto: `${naoConciliados} ${naoConciliados === 1 ? "movimento do banco sem conciliar" : "movimentos do banco sem conciliar"}`,
      href: "/banco",
      tom: "neutro",
    });
  }

  if (exames > 0) {
    lista.push({
      texto: `${exames} ${exames === 1 ? "exame ocupacional vence" : "exames ocupacionais vencem"} em até 30 dias`,
      href: "/rh",
      tom: "atencao",
    });
  }

  if (documentos > 0) {
    lista.push({
      texto: `${documentos} ${documentos === 1 ? "documento de RH vence" : "documentos de RH vencem"} em até 30 dias`,
      href: "/rh",
      tom: "neutro",
    });
  }

  if (folha && !folha.enviadaEm) {
    lista.push({
      texto: "A folha deste mês ainda não foi mandada para o Financeiro",
      href: "/rh/folha",
      tom: "atencao",
    });
  }

  return lista;
}
