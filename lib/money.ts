/**
 * Dinheiro em centavos inteiros. Nunca float: 0.1 + 0.2 não é 0.3, e numa
 * conciliação bancária um centavo errado vira uma hora de procura.
 */

export type Centavos = number;

export function reais(valor: number): Centavos {
  return Math.round(valor * 100);
}

export function formatBRL(centavos: Centavos): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Sem o "R$", para tabelas onde a coluna já diz que é dinheiro. */
export function formatNumero(centavos: Centavos): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Percentual em pontos-base (1% = 100 bps), para que 10% seja exato e não
 * 0.1 em ponto flutuante. Arredonda para o centavo mais próximo.
 */
export function aplicarPercentual(base: Centavos, bps: number): Centavos {
  return Math.round((base * bps) / 10_000);
}

export type LinhaCascata = {
  /** Rótulo que aparece na tela, na ordem em que a conta é feita. */
  rotulo: string;
  /** Negativo quando é desconto, positivo quando entra. */
  valor: Centavos;
  /** Linha de total: desenhada com régua em cima. */
  total?: boolean;
};

export type EntradaCascata = {
  /** Preço de tabela do curso, ou o valor cheio do serviço. */
  bruto: Centavos;
  /** Desconto do cupom, em centavos, já resolvido. */
  cupom?: Centavos;
  /** Nota fiscal em pontos-base. A Samps usa 10% = 1000. */
  notaBps?: number;
  /**
   * Taxa do gateway (Paga-me) em pontos-base, sobre o valor pago.
   * PROVISÓRIO: confirmar as taxas reais com a cliente.
   */
  gatewayBps?: number;
  /** Taxa fixa por transação, se houver. */
  gatewayFixo?: Centavos;
};

export type ResultadoCascata = {
  linhas: LinhaCascata[];
  /** Valor que o aluno pagou: bruto menos cupom. */
  pago: Centavos;
  nota: Centavos;
  gateway: Centavos;
  /** O que de fato cai na conta. */
  liquido: Centavos;
};

/**
 * A conta de uma venda, aberta linha a linha: é isso que a cliente pediu para
 * ver em cada venda do site do Giovanni ("no final já sai o valor que
 * recebemos líquido"). A nota e a taxa incidem sobre o valor pago, não sobre
 * o preço de tabela — quem dá desconto não paga imposto sobre o desconto.
 */
export function calcularCascata(entrada: EntradaCascata): ResultadoCascata {
  const { bruto, cupom = 0, notaBps = 0, gatewayBps = 0, gatewayFixo = 0 } = entrada;

  if (!Number.isInteger(bruto) || bruto < 0) {
    throw new Error("bruto tem de ser centavos inteiros e não negativos");
  }
  if (cupom < 0 || cupom > bruto) {
    throw new Error("cupom não pode ser negativo nem maior que o bruto");
  }

  const pago = bruto - cupom;
  const nota = aplicarPercentual(pago, notaBps);
  const gateway = aplicarPercentual(pago, gatewayBps) + gatewayFixo;
  const liquido = pago - nota - gateway;

  const linhas: LinhaCascata[] = [{ rotulo: "Preço de tabela", valor: bruto }];
  if (cupom > 0) linhas.push({ rotulo: "Cupom", valor: -cupom });
  if (cupom > 0) linhas.push({ rotulo: "Pago pelo aluno", valor: pago });
  if (nota > 0) {
    linhas.push({ rotulo: `Nota fiscal, ${notaBps / 100}%`, valor: -nota });
  }
  if (gateway > 0) linhas.push({ rotulo: "Taxa do Paga-me", valor: -gateway });
  linhas.push({ rotulo: "Líquido", valor: liquido, total: true });

  return { linhas, pago, nota, gateway, liquido };
}

/**
 * Venda no cartão parcelada: cada parcela vira um repasse esperado, com data
 * própria. O resto da divisão fica na primeira parcela para que a soma das
 * parcelas seja exatamente o líquido — nunca um centavo a mais ou a menos.
 */
export function dividirRepasses(
  liquido: Centavos,
  parcelas: number
): Centavos[] {
  if (!Number.isInteger(parcelas) || parcelas < 1) {
    throw new Error("parcelas tem de ser inteiro maior ou igual a 1");
  }
  const base = Math.floor(liquido / parcelas);
  const resto = liquido - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => (i === 0 ? base + resto : base));
}

/** Soma de baixas, para o saldo pendente de um título. */
export function saldo(valorTitulo: Centavos, baixas: Centavos[]): Centavos {
  return valorTitulo - baixas.reduce((a, b) => a + b, 0);
}

export type StatusTitulo = "ABERTO" | "PARCIAL" | "QUITADO" | "VENCIDO" | "CANCELADO";

/**
 * Status nunca é digitado: é calculado do valor, das baixas e da data. Campo
 * de status editável à mão é a origem clássica do relatório que não bate.
 */
export function statusDoTitulo(args: {
  valor: Centavos;
  baixas: Centavos[];
  vencimento: Date;
  hoje?: Date;
  cancelado?: boolean;
}): StatusTitulo {
  if (args.cancelado) return "CANCELADO";
  const pendente = saldo(args.valor, args.baixas);
  if (pendente <= 0) return "QUITADO";
  const hoje = args.hoje ?? new Date();
  const recebeuAlgo = pendente < args.valor;
  const venceu = args.vencimento.getTime() < new Date(
    hoje.getFullYear(), hoje.getMonth(), hoje.getDate()
  ).getTime();
  if (venceu) return "VENCIDO";
  return recebeuAlgo ? "PARCIAL" : "ABERTO";
}
