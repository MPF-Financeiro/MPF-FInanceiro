import {
  AtividadeCaixa,
  Categoria,
  Direcao,
  GrupoGasto,
  NaturezaGasto,
  Origem,
} from "@prisma/client";

/**
 * A classificação dos relatórios da diretoria. O título guarda só o que foge
 * da regra; o resto sai daqui. Regra da especificação: custo de pessoal vai
 * sempre para Pessoal.
 */

export const ATIVIDADE: Record<AtividadeCaixa, string> = {
  OPERACIONAL: "Operacional",
  INVESTIMENTO: "Investimento",
  FINANCIAMENTO: "Financiamento",
};

export const ATIVIDADE_EXPLICA: Record<AtividadeCaixa, string> = {
  OPERACIONAL: "o dia a dia: clientes, fornecedores, equipe, impostos",
  INVESTIMENTO: "compra ou venda de equipamento, aplicação, participação",
  FINANCIAMENTO: "empréstimo, aporte e retirada dos sócios, acerto com terceiros",
};

export const NATUREZA: Record<NaturezaGasto, string> = {
  FIXO: "Fixo",
  VARIAVEL: "Variável",
};

export const GRUPO: Record<GrupoGasto, string> = {
  PESSOAL: "Pessoal",
  CONSUMO: "Consumo",
  INFRAESTRUTURA: "Infraestrutura",
  COMERCIAL: "Comercial",
  MARKETING: "Marketing",
  ADMINISTRATIVO: "Administrativo, jurídico e contábil",
  BANCARIA: "Bancária",
  FINANCEIRA: "Despesas financeiras",
  VEICULOS: "Veículos",
  DIRETORIA: "Diretoria",
};

export const ATIVIDADES = Object.keys(ATIVIDADE) as AtividadeCaixa[];
export const GRUPOS = Object.keys(GRUPO) as GrupoGasto[];

const DE_PESSOAL: Categoria[] = [
  Categoria.SALARIOS,
  Categoria.VALE_ALIMENTACAO,
  Categoria.VALE_TRANSPORTE,
  Categoria.BONIFICACOES,
];

type Base = { direcao: Direcao; categoria: Categoria; origem: Origem };

export function atividadePadrao(t: Base): AtividadeCaixa {
  // Empréstimo do sócio a acertar é financiamento, nos dois sentidos.
  if (t.categoria === Categoria.VALORES_A_ACERTAR) return AtividadeCaixa.FINANCIAMENTO;
  return AtividadeCaixa.OPERACIONAL;
}

export function naturezaPadrao(t: Base): NaturezaGasto | null {
  if (t.direcao !== Direcao.PAGAR) return null;
  if (t.categoria === Categoria.FORNECEDORES) return NaturezaGasto.VARIAVEL;
  // Imposto sobre o faturamento (DAS) acompanha a venda; encargo da folha, não.
  if (t.categoria === Categoria.IMPOSTOS_ENCARGOS && t.origem !== Origem.FOLHA) {
    return NaturezaGasto.VARIAVEL;
  }
  return NaturezaGasto.FIXO;
}

export function grupoPadrao(t: Base): GrupoGasto {
  if (DE_PESSOAL.includes(t.categoria)) return GrupoGasto.PESSOAL;
  if (t.origem === Origem.FOLHA || t.origem === Origem.BENEFICIO || t.origem === Origem.EXAME) {
    return GrupoGasto.PESSOAL;
  }
  if (t.categoria === Categoria.PRO_LABORE) return GrupoGasto.DIRETORIA;
  if (t.categoria === Categoria.ALUGUEL) return GrupoGasto.INFRAESTRUTURA;
  return GrupoGasto.ADMINISTRATIVO;
}

export type Classificavel = Base & {
  atividade: AtividadeCaixa | null;
  natureza: NaturezaGasto | null;
  grupo: GrupoGasto | null;
  unidadeId: string | null;
  naoOperacional: boolean;
};

export type Classificacao = {
  atividade: AtividadeCaixa;
  /** Só em gasto operacional. */
  natureza: NaturezaGasto | null;
  /** Só em gasto fixo. */
  grupo: GrupoGasto | null;
  unidadeId: string | null;
  /** Conta no resultado operacional (receita da operação ou gasto da operação). */
  operacional: boolean;
};

/** O que vale para os relatórios: o que foi escolhido, ou o padrão. */
export function classificar(t: Classificavel): Classificacao {
  const atividade = t.atividade ?? atividadePadrao(t);
  const daOperacao = atividade === AtividadeCaixa.OPERACIONAL;
  const natureza =
    t.direcao === Direcao.PAGAR && daOperacao ? (t.natureza ?? naturezaPadrao(t)) : null;
  const grupo = natureza === NaturezaGasto.FIXO ? (t.grupo ?? grupoPadrao(t)) : null;
  return {
    atividade,
    natureza,
    grupo,
    unidadeId: t.unidadeId,
    operacional: daOperacao && !(t.direcao === Direcao.RECEBER && t.naoOperacional),
  };
}
