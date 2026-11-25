import { AtividadeCaixa, Direcao, GrupoGasto, NaturezaGasto } from "@prisma/client";
import { ATIVIDADES, GRUPOS, classificar, type Classificavel } from "@/lib/classificacao";
import { fimDoMes, inicioDoMes } from "@/lib/mes";

/**
 * As contas dos relatórios da diretoria, sem banco de dados: recebem os
 * lançamentos já carregados e devolvem números. Ficam aqui para os testes
 * provarem as checagens da especificação (as atividades somam a variação do
 * caixa, os grupos somam o total, as BUs somam o consolidado, lucro = MC −
 * fixos).
 *
 * Caixa olha a data da baixa. Competência olha o mês do título. Nunca se
 * misturam numa mesma soma.
 */

export type BaixaDoRelatorio = { valor: number; data: Date; contaId: string | null };

export type Lancamento = Classificavel & {
  id: string;
  descricao: string;
  valor: number;
  competencia: Date;
  vencimento: Date;
  canceladoEm: Date | null;
  baixas: BaixaDoRelatorio[];
  /**
   * Venda do site: o título é o líquido, mas a venda foi o que o aluno pagou.
   * Nota e taxa do Paga-me são custo variável dela. Zero nos demais.
   */
  deducoesVenda: number;
  /** Para mostrar e abrir a origem. */
  quem: string | null;
};

const sinal = (t: { direcao: Direcao }) => (t.direcao === Direcao.RECEBER ? 1 : -1);

function noMes(d: Date, mes: Date) {
  return d >= inicioDoMes(mes) && d < fimDoMes(mes);
}

function daCompetencia(t: Lancamento, mes: Date) {
  return !t.canceladoEm && noMes(t.competencia, mes);
}

// ─────────────────────────────────────────────── 01 · fluxo de caixa

export type ContaParaSaldo = { id: string; saldoInicial: number; saldoInicialEm: Date | null };

/**
 * Saldo de caixa no começo do dia `data`: o saldo inicial de cada conta mais
 * o que andou nela desde a data desse saldo. Baixa sem conta entra no caixa
 * geral, desde sempre.
 */
export function saldoEm(contas: ContaParaSaldo[], lancs: Lancamento[], data: Date): number {
  const porConta = new Map(contas.map((c) => [c.id, c]));
  let saldo = contas.reduce((a, c) => a + c.saldoInicial, 0);
  for (const t of lancs) {
    for (const b of t.baixas) {
      if (b.data >= data) continue;
      const conta = b.contaId ? porConta.get(b.contaId) : undefined;
      if (conta?.saldoInicialEm && b.data < conta.saldoInicialEm) continue;
      saldo += sinal(t) * b.valor;
    }
  }
  return saldo;
}

export type LinhaDeAtividade = {
  atividade: AtividadeCaixa;
  entradas: number;
  saidas: number;
  liquido: number;
  lancamentos: { id: string; direcao: Direcao; descricao: string; quem: string | null; valor: number; data: Date }[];
};

export type FluxoDoMes = {
  mes: Date;
  saldoInicial: number;
  atividades: LinhaDeAtividade[];
  entradas: number;
  saidas: number;
  variacao: number;
  saldoFinal: number;
};

export function fluxoDoMes(
  lancs: Lancamento[],
  mes: Date,
  contas: ContaParaSaldo[]
): FluxoDoMes {
  const saldoInicial = saldoEm(contas, lancs, inicioDoMes(mes));
  const linhas = new Map<AtividadeCaixa, LinhaDeAtividade>(
    ATIVIDADES.map((a) => [a, { atividade: a, entradas: 0, saidas: 0, liquido: 0, lancamentos: [] }])
  );
  const porConta = new Map(contas.map((c) => [c.id, c]));

  for (const t of lancs) {
    const { atividade } = classificar(t);
    const linha = linhas.get(atividade)!;
    for (const b of t.baixas) {
      if (!noMes(b.data, mes)) continue;
      const conta = b.contaId ? porConta.get(b.contaId) : undefined;
      if (conta?.saldoInicialEm && b.data < conta.saldoInicialEm) continue;
      if (t.direcao === Direcao.RECEBER) linha.entradas += b.valor;
      else linha.saidas += b.valor;
      linha.lancamentos.push({
        id: t.id,
        direcao: t.direcao,
        descricao: t.descricao,
        quem: t.quem,
        valor: sinal(t) * b.valor,
        data: b.data,
      });
    }
  }

  const atividades = [...linhas.values()].map((l) => ({
    ...l,
    liquido: l.entradas - l.saidas,
    lancamentos: l.lancamentos.sort((a, b) => a.data.getTime() - b.data.getTime()),
  }));
  const entradas = atividades.reduce((a, l) => a + l.entradas, 0);
  const saidas = atividades.reduce((a, l) => a + l.saidas, 0);
  return {
    mes: inicioDoMes(mes),
    saldoInicial,
    atividades,
    entradas,
    saidas,
    variacao: entradas - saidas,
    saldoFinal: saldoInicial + entradas - saidas,
  };
}

// ─────────────────────────────────────────────── 02 · gastos fixos

export type GastosFixosDoMes = {
  mes: Date;
  porGrupo: Record<GrupoGasto, number>;
  total: number;
  lancamentos: { id: string; grupo: GrupoGasto; descricao: string; quem: string | null; valor: number }[];
};

export function gastosFixosDoMes(lancs: Lancamento[], mes: Date): GastosFixosDoMes {
  const porGrupo = Object.fromEntries(GRUPOS.map((g) => [g, 0])) as Record<GrupoGasto, number>;
  const lancamentos: GastosFixosDoMes["lancamentos"] = [];
  for (const t of lancs) {
    if (t.direcao !== Direcao.PAGAR || !daCompetencia(t, mes)) continue;
    const c = classificar(t);
    if (c.natureza !== NaturezaGasto.FIXO || !c.grupo) continue;
    porGrupo[c.grupo] += t.valor;
    lancamentos.push({ id: t.id, grupo: c.grupo, descricao: t.descricao, quem: t.quem, valor: t.valor });
  }
  return {
    mes: inicioDoMes(mes),
    porGrupo,
    total: Object.values(porGrupo).reduce((a, v) => a + v, 0),
    lancamentos: lancamentos.sort((a, b) => b.valor - a.valor),
  };
}

// ─────────────────────────────────────────────── 03 · margem por BU

export type MargemDaUnidade = {
  unidadeId: string | null;
  vendas: number;
  variaveis: number;
  margem: number;
  /** Em pontos-base: 2.500 = 25%. Nulo sem venda. */
  taxaBps: number | null;
};

export function margemPorUnidade(lancs: Lancamento[], mes: Date): {
  unidades: MargemDaUnidade[];
  consolidado: MargemDaUnidade;
} {
  const mapa = new Map<string | null, { vendas: number; variaveis: number }>();
  const pegar = (id: string | null) => {
    if (!mapa.has(id)) mapa.set(id, { vendas: 0, variaveis: 0 });
    return mapa.get(id)!;
  };

  for (const t of lancs) {
    if (!daCompetencia(t, mes)) continue;
    const c = classificar(t);
    if (!c.operacional) continue;
    if (t.direcao === Direcao.RECEBER) {
      const u = pegar(c.unidadeId);
      u.vendas += t.valor + t.deducoesVenda;
      u.variaveis += t.deducoesVenda;
    } else if (c.natureza === NaturezaGasto.VARIAVEL) {
      pegar(c.unidadeId).variaveis += t.valor;
    }
  }

  const fechar = (unidadeId: string | null, v: { vendas: number; variaveis: number }) => {
    const margem = v.vendas - v.variaveis;
    return {
      unidadeId,
      ...v,
      margem,
      taxaBps: v.vendas > 0 ? Math.round((margem / v.vendas) * 10_000) : null,
    };
  };

  const unidades = [...mapa.entries()].map(([id, v]) => fechar(id, v));
  const soma = unidades.reduce(
    (a, u) => ({ vendas: a.vendas + u.vendas, variaveis: a.variaveis + u.variaveis }),
    { vendas: 0, variaveis: 0 }
  );
  return {
    unidades: unidades.sort((a, b) => b.vendas - a.vendas),
    consolidado: fechar(null, soma),
  };
}

// ─────────────────────────────────────────────── 04 · resumo da operação

export type Pendencia = { id: string; descricao: string; quem: string | null; valor: number; pendente: number; vencimento: Date };

export function resumoDaOperacao(lancs: Lancamento[], mes: Date) {
  let vendas = 0;
  let gastos = 0;
  let recebimentos = 0;
  let pagamentos = 0;
  const naoRecebidos: Pendencia[] = [];
  const naoPagos: Pendencia[] = [];

  for (const t of lancs) {
    const c = classificar(t);
    if (!c.operacional) continue;

    // Caixa: o que andou no mês, de qualquer competência.
    for (const b of t.baixas) {
      if (!noMes(b.data, mes)) continue;
      if (t.direcao === Direcao.RECEBER) recebimentos += b.valor;
      else pagamentos += b.valor;
    }

    // Competência: o que pertence ao mês, e quanto dele ainda não andou.
    if (!daCompetencia(t, mes)) continue;
    const pago = t.baixas.reduce((a, b) => a + b.valor, 0);
    const pendente = Math.max(0, t.valor - pago);
    const linha = { id: t.id, descricao: t.descricao, quem: t.quem, valor: t.valor, pendente, vencimento: t.vencimento };
    if (t.direcao === Direcao.RECEBER) {
      vendas += t.valor;
      if (pendente > 0) naoRecebidos.push(linha);
    } else {
      gastos += t.valor;
      if (pendente > 0) naoPagos.push(linha);
    }
  }

  const porVencimento = (a: Pendencia, b: Pendencia) => a.vencimento.getTime() - b.vencimento.getTime();
  return {
    vendas,
    recebimentos,
    gastos,
    pagamentos,
    naoRecebidos: naoRecebidos.sort(porVencimento),
    naoPagos: naoPagos.sort(porVencimento),
    totalNaoRecebido: naoRecebidos.reduce((a, p) => a + p.pendente, 0),
    totalNaoPago: naoPagos.reduce((a, p) => a + p.pendente, 0),
  };
}

// ─────────────────────────────────────────────── 05 · resultado operacional

export function resultadoOperacional(lancs: Lancamento[], mes: Date, contas: ContaParaSaldo[]) {
  const { consolidado } = margemPorUnidade(lancs, mes);
  const fixos = gastosFixosDoMes(lancs, mes).total;
  const fluxo = fluxoDoMes(lancs, mes, contas);

  const receitaNaoOperacional = lancs
    .filter(
      (t) =>
        t.direcao === Direcao.RECEBER &&
        daCompetencia(t, mes) &&
        classificar(t).atividade === AtividadeCaixa.OPERACIONAL &&
        t.naoOperacional
    )
    .reduce((a, t) => a + t.valor, 0);

  const lucroOperacional = consolidado.margem - fixos;
  const taxa = consolidado.taxaBps;
  // Ponto de equilíbrio = fixos ÷ taxa de MC. Sem margem positiva, não existe.
  const pontoDeEquilibrio = taxa !== null && taxa > 0 ? Math.round((fixos * 10_000) / taxa) : null;
  const margemDeSegurancaBps =
    pontoDeEquilibrio !== null && consolidado.vendas > 0
      ? Math.round(((consolidado.vendas - pontoDeEquilibrio) / consolidado.vendas) * 10_000)
      : null;

  return {
    faturamento: consolidado.vendas,
    variaveis: consolidado.variaveis,
    margem: consolidado.margem,
    taxaBps: taxa,
    fixos,
    lucroOperacional,
    caixaOperacional:
      fluxo.atividades.find((a) => a.atividade === AtividadeCaixa.OPERACIONAL)?.liquido ?? 0,
    caixaTotal: fluxo.variacao,
    pontoDeEquilibrio,
    margemDeSegurancaBps,
    receitaNaoOperacional,
    resultadoLiquido: lucroOperacional + receitaNaoOperacional,
  };
}

// ─────────────────────────────────────────────── 06 · demonstrações

/**
 * Balanço gerencial no fim do mês, montado como partida dobrada a partir dos
 * títulos (competência) e das baixas (caixa). Por construção, Ativo = Passivo
 * + PL; a tela mostra a checagem mesmo assim, porque é o que a especificação
 * pede e porque um erro aqui apareceria nela.
 *
 * - Venda e gasto da operação mexem no resultado (PL).
 * - Investimento vira bem (ativo não circulante); venda de bem o reduz.
 * - Financiamento recebido vira dívida; devolução e retirada a reduzem.
 * - O saldo inicial das contas é o capital de partida. O que foi baixado
 *   antes da data desse saldo já está nele: entra como ajuste de abertura.
 */
export function balancoEm(lancs: Lancamento[], contas: ContaParaSaldo[], mes: Date) {
  const fim = fimDoMes(mes);
  const anoInicio = new Date(Date.UTC(mes.getUTCFullYear(), 0, 1));
  const porConta = new Map(contas.map((c) => [c.id, c]));

  let caixa = contas.reduce((a, c) => a + c.saldoInicial, 0);
  let capital = caixa;
  // Título a título: o que falta andar é a receber/a pagar; o que andou a
  // mais (pago antes da competência) é adiantamento, do outro lado.
  let aReceber = 0;
  let recebidoAdiantado = 0;
  let aPagar = 0;
  let pagoAdiantado = 0;
  let bens = 0;
  let divida = 0;
  let resultadoDoAno = 0;
  let resultadosAnteriores = 0;

  for (const t of lancs) {
    const c = classificar(t);
    const acumula = !t.canceladoEm && t.competencia < fim;
    const v = acumula ? t.valor : 0;
    const andou = t.baixas.filter((b) => b.data < fim).reduce((a, b) => a + b.valor, 0);

    // caixa, com o ajuste do que já estava dentro do saldo inicial
    for (const b of t.baixas) {
      if (b.data >= fim) continue;
      const conta = b.contaId ? porConta.get(b.contaId) : undefined;
      const efeito = sinal(t) * b.valor;
      if (conta?.saldoInicialEm && b.data < conta.saldoInicialEm) capital -= efeito;
      else caixa += efeito;
    }

    if (t.direcao === Direcao.RECEBER) {
      const falta = v - andou;
      if (falta >= 0) aReceber += falta;
      else recebidoAdiantado -= falta;
      if (c.atividade === AtividadeCaixa.INVESTIMENTO) bens -= v;
      else if (c.atividade === AtividadeCaixa.FINANCIAMENTO) divida += v;
      else if (t.competencia >= anoInicio) resultadoDoAno += v;
      else resultadosAnteriores += v;
    } else {
      const falta = v - andou;
      if (falta >= 0) aPagar += falta;
      else pagoAdiantado -= falta;
      if (c.atividade === AtividadeCaixa.INVESTIMENTO) bens += v;
      else if (c.atividade === AtividadeCaixa.FINANCIAMENTO) divida -= v;
      else if (t.competencia >= anoInicio) resultadoDoAno -= v;
      else resultadosAnteriores -= v;
    }
  }

  const ativoCirculante = caixa + aReceber + pagoAdiantado;
  const ativo = ativoCirculante + bens;
  const passivo = aPagar + recebidoAdiantado + divida;
  const pl = capital + resultadosAnteriores + resultadoDoAno;

  return {
    data: fim,
    ativo: {
      caixa,
      aReceber,
      pagoAdiantado,
      circulante: ativoCirculante,
      bens,
      total: ativo,
    },
    passivo: {
      aPagar,
      recebidoAdiantado,
      dividas: divida,
      total: passivo,
    },
    pl: { capital, resultadosAnteriores, resultadoDoAno, total: pl },
    fecha: ativo === passivo + pl,
  };
}
