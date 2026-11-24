import { Categoria, Direcao } from "@prisma/client";
import { db } from "@/lib/db";
import { listarTitulos, type TituloNaTela } from "@/lib/consultas";
import { inicioDoMes, fimDoMes } from "@/lib/mes";

/**
 * Os números da Visão executiva. Caixa é o que andou na conta (data da
 * baixa); competência é o mês a que o título pertence. Os dois nunca se
 * misturam numa mesma soma.
 */

export type MesDeCaixa = {
  /** Primeiro dia do mês, UTC. */
  mes: Date;
  entradas: number;
  saidas: number;
};

export type FatiaDeGasto = { categoria: Categoria; valor: number };

export type SaldoDeConta = { id: string; apelido: string; banco: string; saldo: number };

/** Entradas e saídas de caixa de cada mês, a partir das baixas. Puro, testável. */
export function caixaPorMes(
  titulos: Pick<TituloNaTela, "direcao" | "baixas">[],
  meses: Date[]
): MesDeCaixa[] {
  return meses.map((mes) => {
    const ini = inicioDoMes(mes);
    const fim = fimDoMes(mes);
    let entradas = 0;
    let saidas = 0;
    for (const t of titulos) {
      for (const b of t.baixas) {
        if (b.data < ini || b.data >= fim) continue;
        if (t.direcao === Direcao.RECEBER) entradas += b.valor;
        else saidas += b.valor;
      }
    }
    return { mes: ini, entradas, saidas };
  });
}

/** Gastos de competência do mês, por categoria, do maior para o menor. */
export function gastosPorCategoria(
  pagar: Pick<TituloNaTela, "categoria" | "competencia" | "valor" | "canceladoEm">[],
  mes: Date
): FatiaDeGasto[] {
  const ini = inicioDoMes(mes);
  const fim = fimDoMes(mes);
  const soma = new Map<Categoria, number>();
  for (const t of pagar) {
    if (t.canceladoEm || t.competencia < ini || t.competencia >= fim) continue;
    soma.set(t.categoria, (soma.get(t.categoria) ?? 0) + t.valor);
  }
  return [...soma.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function ultimosMeses(ate: Date, quantos: number): Date[] {
  const fim = inicioDoMes(ate);
  return Array.from({ length: quantos }, (_, i) =>
    new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth() - (quantos - 1 - i), 1))
  );
}

export async function visaoExecutiva(mes: Date) {
  const [receber, pagar, contas] = await Promise.all([
    listarTitulos(Direcao.RECEBER),
    listarTitulos(Direcao.PAGAR),
    db.contaBancaria.findMany({
      where: { ativa: true },
      include: { baixas: { include: { titulo: { select: { direcao: true } } } } },
      orderBy: { apelido: "asc" },
    }),
  ]);

  const meses = ultimosMeses(mes, 6);
  const caixa = caixaPorMes([...receber, ...pagar], meses);
  const atual = caixa[caixa.length - 1];
  const anterior = caixa[caixa.length - 2];

  const ini = inicioDoMes(mes);
  const fim = fimDoMes(mes);
  const daCompetencia = (t: TituloNaTela) =>
    !t.canceladoEm && t.competencia >= ini && t.competencia < fim;

  const vendasDoMes = receber.filter(daCompetencia);
  const gastosDoMes = pagar.filter(daCompetencia);
  const faturado = vendasDoMes.reduce((a, t) => a + t.valor, 0);
  const gasto = gastosDoMes.reduce((a, t) => a + t.valor, 0);
  // Do que é deste mês, quanto já virou dinheiro (seja qual for a data da baixa).
  const faturadoRecebido = vendasDoMes.reduce((a, t) => a + t.recebido, 0);
  const gastoPago = gastosDoMes.reduce((a, t) => a + t.recebido, 0);

  const abertos = (ts: TituloNaTela[]) =>
    ts.filter((t) => t.status !== "QUITADO" && t.status !== "CANCELADO");

  const saldos: SaldoDeConta[] = contas.map((c) => ({
    id: c.id,
    apelido: c.apelido,
    banco: c.banco,
    saldo: c.baixas.reduce(
      (a, b) => a + (b.titulo.direcao === Direcao.RECEBER ? b.valor : -b.valor),
      0
    ),
  }));

  return {
    caixa,
    atual,
    anterior,
    faturado,
    faturadoRecebido,
    gasto,
    gastoPago,
    aReceber: abertos(receber).reduce((a, t) => a + t.pendente, 0),
    aPagar: abertos(pagar).reduce((a, t) => a + t.pendente, 0),
    vencidoReceber: receber.filter((t) => t.status === "VENCIDO"),
    gastos: gastosPorCategoria(pagar, mes),
    saldos,
    proximosPagar: abertos(pagar)
      .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
      .slice(0, 6),
    proximosReceber: abertos(receber)
      .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
      .slice(0, 6),
  };
}
