import { describe, expect, it } from "vitest";
import { AtividadeCaixa, Categoria, Direcao, NaturezaGasto, Origem } from "@prisma/client";
import { classificar } from "@/lib/classificacao";
import {
  balancoEm,
  fluxoDoMes,
  gastosFixosDoMes,
  margemPorUnidade,
  resultadoOperacional,
  resumoDaOperacao,
  type Lancamento,
} from "@/lib/relatorios";

const d = (m: number, dia: number) => new Date(Date.UTC(2026, m - 1, dia));
const NOV = d(11, 1);
let n = 0;

function lanc(p: Partial<Lancamento> & Pick<Lancamento, "direcao" | "categoria" | "valor">): Lancamento {
  n += 1;
  return {
    id: `t${n}`,
    descricao: `t${n}`,
    origem: Origem.MANUAL,
    competencia: NOV,
    vencimento: d(11, 10),
    canceladoEm: null,
    baixas: [],
    deducoesVenda: 0,
    quem: null,
    atividade: null,
    natureza: null,
    grupo: null,
    unidadeId: null,
    naoOperacional: false,
    ...p,
  };
}
const pago = (valor: number, dia = 10, m = 11) => [{ valor, data: d(m, dia), contaId: "c1" }];

const base: Lancamento[] = [
  lanc({ direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS, valor: 10_000_00, unidadeId: "agencia", baixas: pago(6_000_00) }),
  lanc({ direcao: Direcao.RECEBER, categoria: Categoria.VENDAS_SITE, valor: 900_00, deducoesVenda: 100_00, unidadeId: "cursos", baixas: pago(900_00) }),
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.SALARIOS, valor: 4_000_00, baixas: pago(4_000_00, 5) }),
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.ALUGUEL, valor: 1_500_00, baixas: pago(1_500_00, 5) }),
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.FORNECEDORES, valor: 2_000_00, unidadeId: "agencia" }),
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.VALORES_A_ACERTAR, valor: 500_00, baixas: pago(500_00, 20) }),
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.OUTROS, valor: 3_000_00, atividade: AtividadeCaixa.INVESTIMENTO, baixas: pago(3_000_00, 21) }),
  // de outubro, recebido em novembro: é caixa de novembro, competência de outubro
  lanc({ direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS, valor: 2_000_00, competencia: d(10, 1), baixas: pago(2_000_00, 3) }),
  // cancelado não conta em competência
  lanc({ direcao: Direcao.PAGAR, categoria: Categoria.ALUGUEL, valor: 9_999_00, canceladoEm: d(11, 2) }),
];
const contas = [{ id: "c1", saldoInicial: 5_000_00, saldoInicialEm: d(10, 1) }];

describe("classificação padrão", () => {
  it("pessoal vai sempre para Pessoal e é fixo", () => {
    const c = classificar(base[2]);
    expect(c).toMatchObject({ natureza: NaturezaGasto.FIXO, grupo: "PESSOAL" });
  });
  it("fornecedor é variável e não tem grupo fixo", () => {
    expect(classificar(base[4])).toMatchObject({ natureza: NaturezaGasto.VARIAVEL, grupo: null });
  });
  it("acerto com o sócio é financiamento e não é gasto", () => {
    expect(classificar(base[5])).toMatchObject({ atividade: "FINANCIAMENTO", natureza: null });
  });
  it("o que foi escolhido no lançamento vence o padrão", () => {
    const t = { ...base[3], natureza: NaturezaGasto.VARIAVEL };
    expect(classificar(t).natureza).toBe(NaturezaGasto.VARIAVEL);
  });
});

describe("01 · fluxo de caixa", () => {
  const f = fluxoDoMes(base, NOV, contas);
  it("as três atividades somam a variação do caixa", () => {
    expect(f.atividades.reduce((a, l) => a + l.liquido, 0)).toBe(f.variacao);
  });
  it("saldo final = inicial + entradas − saídas", () => {
    expect(f.saldoFinal).toBe(f.saldoInicial + f.entradas - f.saidas);
    expect(f.saldoInicial).toBe(5_000_00);
  });
  it("separa por atividade", () => {
    const por = Object.fromEntries(f.atividades.map((a) => [a.atividade, a.liquido]));
    expect(por).toEqual({
      OPERACIONAL: 6_000_00 + 900_00 + 2_000_00 - 4_000_00 - 1_500_00,
      INVESTIMENTO: -3_000_00,
      FINANCIAMENTO: -500_00,
    });
  });
  it("baixa anterior à data do saldo inicial já está dentro dele", () => {
    const antiga = lanc({ direcao: Direcao.RECEBER, categoria: Categoria.OUTROS, valor: 700_00, competencia: d(9, 1), baixas: pago(700_00, 15, 9) });
    expect(fluxoDoMes([...base, antiga], NOV, contas).saldoInicial).toBe(5_000_00);
  });
});

describe("02 · gastos fixos", () => {
  const g = gastosFixosDoMes(base, NOV);
  it("os grupos somam o total", () => {
    expect(Object.values(g.porGrupo).reduce((a, v) => a + v, 0)).toBe(g.total);
  });
  it("só fixo operacional, sem cancelado", () => {
    expect(g.total).toBe(4_000_00 + 1_500_00);
  });
});

describe("03 · margem por BU", () => {
  const m = margemPorUnidade(base, NOV);
  it("as BUs somam o consolidado", () => {
    const soma = m.unidades.reduce((a, u) => a + u.margem, 0);
    expect(soma).toBe(m.consolidado.margem);
  });
  it("venda do site entra pelo que o aluno pagou, com nota e taxa como variável", () => {
    const cursos = m.unidades.find((u) => u.unidadeId === "cursos")!;
    expect(cursos).toMatchObject({ vendas: 1_000_00, variaveis: 100_00, margem: 900_00, taxaBps: 9000 });
  });
});

describe("04 · resumo da operação", () => {
  const r = resumoDaOperacao(base, NOV);
  it("competência e caixa ficam separados", () => {
    expect(r.vendas).toBe(10_900_00);
    expect(r.recebimentos).toBe(6_000_00 + 900_00 + 2_000_00);
  });
  it("lista o que não foi recebido nem pago", () => {
    expect(r.totalNaoRecebido).toBe(4_000_00);
    expect(r.totalNaoPago).toBe(2_000_00);
  });
});

describe("05 · resultado operacional", () => {
  const r = resultadoOperacional(base, NOV, contas);
  it("lucro = MC − fixos", () => {
    expect(r.lucroOperacional).toBe(r.margem - r.fixos);
  });
  it("ponto de equilíbrio = fixos ÷ taxa de MC", () => {
    expect(r.pontoDeEquilibrio).toBe(Math.round((r.fixos * 10_000) / r.taxaBps!));
  });
  it("sem margem positiva, o ponto de equilíbrio não é calculável", () => {
    const so = [lanc({ direcao: Direcao.PAGAR, categoria: Categoria.ALUGUEL, valor: 100_00 })];
    expect(resultadoOperacional(so, NOV, []).pontoDeEquilibrio).toBeNull();
  });
});

describe("06 · balanço gerencial", () => {
  it("Ativo = Passivo + PL", () => {
    expect(balancoEm(base, contas, NOV).fecha).toBe(true);
  });
  it("fecha com adiantamento, estorno e baixa anterior ao saldo inicial", () => {
    const extra = [
      // recebido em outubro, de competência de dezembro
      lanc({ direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS, valor: 800_00, competencia: d(12, 1), baixas: pago(800_00, 20, 10) }),
      // pago e estornado
      lanc({ direcao: Direcao.PAGAR, categoria: Categoria.ALUGUEL, valor: 300_00, baixas: [...pago(300_00, 3), { valor: -300_00, data: d(11, 4), contaId: "c1" }] }),
      // pago em setembro, antes do saldo inicial de 1º/10
      lanc({ direcao: Direcao.PAGAR, categoria: Categoria.OUTROS, valor: 150_00, competencia: d(9, 1), baixas: pago(150_00, 10, 9) }),
      // empréstimo recebido
      lanc({ direcao: Direcao.RECEBER, categoria: Categoria.VALORES_A_ACERTAR, valor: 2_000_00, baixas: pago(2_000_00, 2) }),
    ];
    const b = balancoEm([...base, ...extra], contas, NOV);
    expect(b.fecha).toBe(true);
    expect(b.passivo.recebidoAdiantado).toBe(800_00);
    expect(b.passivo.dividas).toBe(2_000_00 - 500_00);
  });
  it("o caixa do balanço é o saldo final do fluxo", () => {
    expect(balancoEm(base, contas, NOV).ativo.caixa).toBe(fluxoDoMes(base, NOV, contas).saldoFinal);
  });
});
