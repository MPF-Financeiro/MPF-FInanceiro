import type { Centavos } from "@/lib/money";

export type ItemFolhaEntrada = {
  salarioBruto: Centavos;
  bonificacoes?: Centavos;
  horasExtras?: Centavos;
  adiantamentos?: Centavos;
  inss?: Centavos;
  irrf?: Centavos;
  outrosDescontos?: Centavos;
};

export type ResultadoItemFolha = {
  proventos: Centavos;
  descontos: Centavos;
  liquido: Centavos;
  linhas: Array<{ rotulo: string; valor: Centavos; total?: boolean }>;
};

/**
 * O líquido do contracheque. Vale-alimentação e vale-transporte NÃO entram
 * aqui: são benefícios pagos à parte, com título próprio, e somá-los ao
 * líquido seria pagar duas vezes o mesmo dinheiro. Ficam guardados no item
 * só para o contracheque mostrar o que a pessoa recebeu no mês.
 */
export function calcularItemFolha(entrada: ItemFolhaEntrada): ResultadoItemFolha {
  const {
    salarioBruto,
    bonificacoes = 0,
    horasExtras = 0,
    adiantamentos = 0,
    inss = 0,
    irrf = 0,
    outrosDescontos = 0,
  } = entrada;

  for (const [nome, valor] of Object.entries({
    salarioBruto,
    bonificacoes,
    horasExtras,
    adiantamentos,
    inss,
    irrf,
    outrosDescontos,
  })) {
    if (!Number.isInteger(valor) || valor < 0) {
      throw new Error(`${nome} tem de ser centavos inteiros e não negativos`);
    }
  }

  const proventos = salarioBruto + bonificacoes + horasExtras;
  const descontos = adiantamentos + inss + irrf + outrosDescontos;
  const liquido = proventos - descontos;

  const linhas: Array<{ rotulo: string; valor: Centavos; total?: boolean }> = [
    { rotulo: "Salário bruto", valor: salarioBruto },
  ];
  if (horasExtras > 0) linhas.push({ rotulo: "Horas extras", valor: horasExtras });
  if (bonificacoes > 0) linhas.push({ rotulo: "Bonificações", valor: bonificacoes });
  if (inss > 0) linhas.push({ rotulo: "INSS", valor: -inss });
  if (irrf > 0) linhas.push({ rotulo: "IRRF", valor: -irrf });
  if (adiantamentos > 0) linhas.push({ rotulo: "Adiantamentos", valor: -adiantamentos });
  if (outrosDescontos > 0) linhas.push({ rotulo: "Outros descontos", valor: -outrosDescontos });
  linhas.push({ rotulo: "Líquido a pagar", valor: liquido, total: true });

  return { proventos, descontos, liquido, linhas };
}

/**
 * Férias: dias de gozo e, se houver, os dias vendidos (abono pecuniário, até
 * um terço). A conta aqui é só a conferência do que foi programado; o valor a
 * pagar continua sendo lançado à mão, porque depende de média de variáveis
 * que o sistema não tem.
 */
export function conferirFerias(args: {
  inicio: Date;
  fim: Date;
  diasVendidos?: number;
}): { diasGozo: number; diasVendidos: number; total: number; aviso: string | null } {
  const umDia = 24 * 60 * 60 * 1000;
  const diasGozo = Math.round((args.fim.getTime() - args.inicio.getTime()) / umDia) + 1;
  const diasVendidos = args.diasVendidos ?? 0;
  const total = diasGozo + diasVendidos;

  let aviso: string | null = null;
  if (diasGozo <= 0) aviso = "O fim das férias está antes do início.";
  else if (diasVendidos > 10) aviso = "A venda de férias costuma ir até 10 dias (um terço de 30).";
  else if (total > 30) aviso = `Gozo e venda somam ${total} dias, acima dos 30 do período.`;

  return { diasGozo, diasVendidos, total, aviso };
}
