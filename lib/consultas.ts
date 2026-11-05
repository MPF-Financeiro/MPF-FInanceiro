import { Direcao, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { saldo, statusDoTitulo, type StatusTitulo } from "@/lib/money";

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

export async function listarTitulos(direcao: Direcao): Promise<TituloNaTela[]> {
  const titulos = await db.titulo.findMany({
    where: { direcao },
    include: COM_BAIXAS,
    orderBy: [{ vencimento: "asc" }],
  });
  return titulos.map(decorar);
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
