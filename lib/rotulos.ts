import type {
  Categoria,
  Direcao,
  FormaPagamento,
  MeioVenda,
  Origem,
  StatusColaborador,
  StatusFerias,
  StatusVoucher,
  TipoBeneficio,
  TipoExame,
} from "@prisma/client";

/** Um lugar só para o texto que a cliente lê. Enum nunca vai cru para a tela. */
export const CATEGORIA: Record<Categoria, string> = {
  FORNECEDORES: "Fornecedores",
  SALARIOS: "Salários",
  VALE_ALIMENTACAO: "Vale-alimentação",
  VALE_TRANSPORTE: "Vale-transporte",
  IMPOSTOS_ENCARGOS: "Impostos e encargos",
  ALUGUEL: "Aluguel",
  SERVICOS_ASSINATURAS: "Serviços e assinaturas",
  BONIFICACOES: "Bonificações",
  PRO_LABORE: "Pró-labore",
  VALORES_A_ACERTAR: "Valores a acertar",
  VENDAS_SITE: "Vendas do site",
  SERVICOS_PRESTADOS: "Serviços prestados",
  OUTROS: "Outros",
};

/** As que fazem sentido numa conta a receber. */
export const CATEGORIAS_RECEBER: Categoria[] = [
  "SERVICOS_PRESTADOS",
  "VENDAS_SITE",
  "VALORES_A_ACERTAR",
  "OUTROS",
];

export const CATEGORIAS_PAGAR: Categoria[] = [
  "FORNECEDORES",
  "SALARIOS",
  "VALE_ALIMENTACAO",
  "VALE_TRANSPORTE",
  "IMPOSTOS_ENCARGOS",
  "ALUGUEL",
  "SERVICOS_ASSINATURAS",
  "BONIFICACOES",
  "PRO_LABORE",
  "VALORES_A_ACERTAR",
  "OUTROS",
];

export const FORMA: Record<FormaPagamento, string> = {
  PIX: "PIX",
  CARTAO: "Cartão",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  VOUCHER: "Voucher",
  DINHEIRO: "Dinheiro",
};

export const ORIGEM: Record<Origem, string> = {
  MANUAL: "Lançado à mão",
  FOLHA: "Folha",
  VENDA_SITE: "Venda do site",
  CONTRATO: "Contrato",
  VOUCHER: "Voucher",
  BENEFICIO: "Benefício",
  BONIFICACAO: "Bonificação",
  PRO_LABORE: "Pró-labore",
  ACERTO: "Acerto",
  EXAME: "Exame ocupacional",
};

export const DIRECAO: Record<Direcao, string> = {
  RECEBER: "A receber",
  PAGAR: "A pagar",
};

export const MEIO_VENDA: Record<MeioVenda, string> = {
  PIX: "PIX",
  CARTAO: "Cartão",
};

export const STATUS_VOUCHER: Record<StatusVoucher, string> = {
  PENDENTE: "Pendente",
  UTILIZADO: "Utilizado",
  RECEBIDO: "Repasse recebido",
  CANCELADO: "Cancelado",
};

export const STATUS_COLABORADOR: Record<StatusColaborador, string> = {
  ATIVO: "Ativo",
  AFASTADO: "Afastado",
  DESLIGADO: "Desligado",
};

export const TIPO_BENEFICIO: Record<TipoBeneficio, string> = {
  VALE_ALIMENTACAO: "Vale-alimentação",
  VALE_TRANSPORTE: "Vale-transporte",
  PLANO_SAUDE: "Plano de saúde",
  OUTRO: "Outro",
};

export const STATUS_FERIAS: Record<StatusFerias, string> = {
  PROGRAMADA: "Programada",
  EM_GOZO: "Em gozo",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const TIPO_EXAME: Record<TipoExame, string> = {
  ADMISSIONAL: "Admissional",
  PERIODICO: "Periódico",
  RETORNO_AO_TRABALHO: "Retorno ao trabalho",
  MUDANCA_DE_RISCO: "Mudança de risco",
  DEMISSIONAL: "Demissional",
};

/** Categoria da folha e dos benefícios: o RH vê só isto do Financeiro. */
export const CATEGORIAS_DA_FOLHA: Categoria[] = [
  "SALARIOS",
  "VALE_ALIMENTACAO",
  "VALE_TRANSPORTE",
  "IMPOSTOS_ENCARGOS",
  "BONIFICACOES",
  "PRO_LABORE",
];
