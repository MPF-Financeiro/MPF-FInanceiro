"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Categoria, Direcao, FormaPagamento, MeioVenda, Origem } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, PAPEIS_ADMIN, PAPEIS_FINANCEIRO } from "@/lib/permissoes";
import { exigirMesAberto } from "@/lib/fechamento";
import { inicioDoMes, somarMeses } from "@/lib/mes";
import { calcularCascata, dividirRepasses } from "@/lib/money";
import { bpsDoMeio, taxaVigente } from "@/lib/taxas";
import {
  dataObrigatoria,
  dataOpcional,
  dinheiroPositivo,
  parseBps,
  parseCentavos,
  textoOpcional,
} from "@/lib/validacao";
import { aviso, ehRedirect, falha, type Estado } from "@/lib/acoes/comum";
import { registrarToken } from "@/lib/idempotencia";

const opcional = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};

/** Cadastro de curso: a cliente mantém os cursos e os preços de tabela. */
export async function salvarCurso(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().optional(),
        nome: z.string().trim().min(3, "Escreva o nome do curso").max(120),
        preco: dinheiroPositivo,
        ativo: z.boolean(),
      })
      .parse({
        id: opcional(dados.get("id")),
        nome: dados.get("nome"),
        preco: String(dados.get("preco") ?? ""),
        ativo: dados.get("ativo") === "on" || dados.get("ativo") === "true",
      });

    if (d.id) {
      await db.curso.update({
        where: { id: d.id },
        data: { nome: d.nome, preco: d.preco, ativo: d.ativo },
      });
    } else {
      await db.curso.create({
        data: { nome: d.nome, preco: d.preco, ativo: d.ativo },
      });
    }

    revalidatePath("/cursos");
    revalidatePath("/vendas");
    return { erro: null, ok: d.id ? "Curso atualizado." : "Curso cadastrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarCupom(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const tipo = String(dados.get("tipo") ?? "percentual");
    const d = z
      .object({
        id: z.string().optional(),
        codigo: z
          .string()
          .trim()
          .min(3, "O código precisa de pelo menos 3 letras")
          .max(40)
          .transform((v) => v.toUpperCase()),
        cursoId: z.string().optional(),
        validoAte: dataOpcional,
      })
      .parse({
        id: opcional(dados.get("id")),
        codigo: dados.get("codigo"),
        cursoId: opcional(dados.get("cursoId")),
        validoAte: String(dados.get("validoAte") ?? ""),
      });

    let percentBps: number | null = null;
    let valorFixo: number | null = null;
    if (tipo === "percentual") {
      percentBps = parseBps(dados.get("percentual"));
      if (percentBps === null || percentBps <= 0) aviso("Informe o percentual do cupom.");
      if (percentBps > 10_000) aviso("O cupom não pode passar de 100%.");
    } else {
      const centavos = parseBps(dados.get("valorFixo"));
      if (centavos === null || centavos <= 0) aviso("Informe o valor do cupom.");
      valorFixo = centavos;
    }

    const payload = {
      codigo: d.codigo,
      cursoId: d.cursoId ?? null,
      percentBps,
      valorFixo,
      validoAte: d.validoAte,
    };
    if (d.id) {
      await db.cupom.update({ where: { id: d.id }, data: payload });
    } else {
      const existente = await db.cupom.findUnique({
        where: { codigo: d.codigo },
      });
      if (existente) aviso("Já existe um cupom com esse código.");
      await db.cupom.create({ data: payload });
    }

    revalidatePath("/cursos");
    return { erro: null, ok: d.id ? "Cupom atualizado." : "Cupom cadastrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Nova vigência de taxa fecha a anterior na véspera. Nunca se edita a taxa
 * antiga: é ela que faz a venda de março continuar batendo.
 */
export async function salvarTaxas(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_ADMIN);
    const d = z.object({ vigenteDe: dataObrigatoria, observacao: textoOpcional }).parse({
      vigenteDe: dados.get("vigenteDe"),
      observacao: String(dados.get("observacao") ?? ""),
    });

    const campos = ["nota", "pix", "cartao"] as const;
    const bps: Record<string, number> = {};
    for (const campo of campos) {
      const valor = parseBps(dados.get(campo));
      if (valor === null || valor < 0) aviso(`Informe a taxa de ${campo}.`);
      if (valor > 10_000) aviso("Taxa acima de 100% não faz sentido.");
      bps[campo] = valor;
    }
    const fixo = parseBps(dados.get("fixoPorVenda")) ?? 0;

    const anterior = await db.configTaxa.findFirst({
      where: { vigenteAte: null },
      orderBy: { vigenteDe: "desc" },
    });
    if (anterior && anterior.vigenteDe >= d.vigenteDe) {
      aviso("A nova vigência tem de começar depois da vigência atual.");
    }

    await db.$transaction(async (tx) => {
      if (anterior) {
        const vespera = new Date(d.vigenteDe.getTime() - 24 * 60 * 60 * 1000);
        await tx.configTaxa.update({
          where: { id: anterior.id },
          data: { vigenteAte: vespera },
        });
      }
      await tx.configTaxa.create({
        data: {
          vigenteDe: d.vigenteDe,
          notaBps: bps.nota,
          pixBps: bps.pix,
          cartaoBps: bps.cartao,
          fixoPorVenda: fixo,
          observacao: d.observacao,
        },
      });
    });

    revalidatePath("/cursos");
    revalidatePath("/vendas");
    return { erro: null, ok: "Nova vigência de taxas registrada." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

const esquemaVenda = z.object({
  data: dataObrigatoria,
  aluno: z.string().trim().min(3, "Escreva o nome do aluno").max(120),
  cursoId: z.string().optional(),
  descricao: z.string().trim().max(160).optional(),
  valorCobrado: z.string().optional(),
  cupomId: z.string().optional(),
  meio: z.nativeEnum(MeioVenda),
  parcelas: z.coerce.number().int().min(1).max(12).default(1),
  empresaId: z.string().min(1, "Escolha a empresa"),
});

/**
 * A venda do site: o sistema faz a conta que a cliente pediu para ver, abate
 * os 10% da nota e a taxa do meio de pagamento, e já cria o título a receber
 * com um repasse esperado por parcela.
 */
export async function lancarVenda(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = esquemaVenda.parse({
      data: dados.get("data"),
      aluno: dados.get("aluno"),
      cursoId: opcional(dados.get("cursoId")),
      descricao: opcional(dados.get("descricao")),
      valorCobrado: opcional(dados.get("valorCobrado")),
      cupomId: opcional(dados.get("cupomId")),
      meio: dados.get("meio"),
      parcelas: opcional(dados.get("parcelas")) ?? 1,
      empresaId: dados.get("empresaId"),
    });

    await exigirMesAberto(d.data);
    if (d.meio === MeioVenda.PIX && d.parcelas > 1) {
      aviso("Venda no PIX não tem parcela.");
    }

    const curso = d.cursoId ? await db.curso.findUnique({ where: { id: d.cursoId } }) : null;
    if (d.cursoId && !curso) aviso("Curso não encontrado.");

    const digitado = d.valorCobrado ? parseCentavos(d.valorCobrado) : null;
    if (d.valorCobrado && digitado === null) aviso("Valor cobrado inválido.");
    const bruto = digitado ?? curso?.preco ?? 0;
    if (bruto <= 0) {
      aviso("Escolha um curso cadastrado ou informe o valor cobrado.");
    }
    if (!curso && !d.descricao) {
      aviso("Sem curso cadastrado, escreva o que foi vendido.");
    }

    const cupom = d.cupomId ? await db.cupom.findUnique({ where: { id: d.cupomId } }) : null;
    if (d.cupomId && !cupom) aviso("Cupom não encontrado.");
    if (cupom?.validoAte && cupom.validoAte < d.data) {
      aviso(`O cupom ${cupom.codigo} estava vencido na data da venda.`);
    }
    if (cupom?.cursoId && curso && cupom.cursoId !== curso.id) {
      aviso(`O cupom ${cupom.codigo} é de outro curso.`);
    }

    const desconto = cupom
      ? (cupom.valorFixo ?? Math.round((bruto * (cupom.percentBps ?? 0)) / 10_000))
      : 0;
    if (desconto > bruto) aviso("O cupom é maior que o valor da venda.");

    const taxa = await taxaVigente(d.data);
    const conta = calcularCascata({
      bruto,
      cupom: desconto,
      notaBps: taxa.notaBps,
      gatewayBps: bpsDoMeio(taxa, d.meio),
      gatewayFixo: taxa.fixoPorVenda,
    });

    if (conta.negativo) {
      aviso(
        "A conta fecha negativa: a nota e a taxa somam mais do que o aluno pagou. Confira o valor da venda e as taxas cadastradas antes de lançar."
      );
    }

    const fatias = dividirRepasses(conta.liquido, d.parcelas);
    const nome = curso?.nome ?? d.descricao ?? "Venda do site";

    const token = opcional(dados.get("token"));
    await db.$transaction(async (tx) => {
      await registrarToken(tx, token, "lancarVenda");
      const titulo = await tx.titulo.create({
        data: {
          empresaId: d.empresaId,
          direcao: Direcao.RECEBER,
          categoria: Categoria.VENDAS_SITE,
          descricao: `${nome} — ${d.aluno}`,
          // O título é o líquido: é esse o dinheiro que a Samps recebe.
          valor: conta.liquido,
          competencia: inicioDoMes(d.data),
          vencimento: d.data,
          forma: d.meio === MeioVenda.PIX ? FormaPagamento.PIX : FormaPagamento.CARTAO,
          origem: Origem.VENDA_SITE,
          criadoPorId: sessao.id,
        },
      });

      const venda = await tx.vendaSite.create({
        data: {
          data: d.data,
          aluno: d.aluno,
          cursoId: curso?.id ?? null,
          descricao: curso ? null : (d.descricao ?? null),
          meio: d.meio,
          bruto,
          cupomId: cupom?.id ?? null,
          descontoCupom: desconto,
          nota: conta.nota,
          taxa: conta.gateway,
          liquido: conta.liquido,
          parcelas: d.parcelas,
          tituloId: titulo.id,
        },
      });

      await tx.repasse.createMany({
        data: fatias.map((valor, i) => ({
          vendaId: venda.id,
          numero: i + 1,
          valor,
          previsao: somarMeses(d.data, i),
        })),
      });

      // O título nasce com origemId igual ao id da venda para que reenviar a
      // mesma venda não crie um segundo título.
      await tx.titulo.update({
        where: { id: titulo.id },
        data: { origemId: venda.id },
      });
    });

    revalidatePath("/vendas");
    revalidatePath("/receber");
    revalidatePath("/");
    redirect("/vendas");
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Repasse que caiu vira baixa no título: o dinheiro só existe no caixa quando
 * alguém diz que entrou.
 */
export async function marcarRepasse(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        repasseId: z.string().min(1),
        data: dataObrigatoria,
        contaId: z.string().optional(),
      })
      .parse({
        repasseId: dados.get("repasseId"),
        data: dados.get("data"),
        contaId: opcional(dados.get("contaId")),
      });

    const repasse = await db.repasse.findUnique({
      where: { id: d.repasseId },
      include: { venda: { include: { titulo: true } } },
    });
    if (!repasse) aviso("Repasse não encontrado.");
    if (repasse.efetivo) aviso("Este repasse já está marcado como recebido.");
    await exigirMesAberto(d.data);

    await db.$transaction(async (tx) => {
      // O `updateMany` com `efetivo: null` na condição é a trava: se dois
      // cliques chegarem juntos, só um acha a linha ainda em aberto. Sem isso,
      // os dois leriam "não recebido" e a venda seria baixada duas vezes.
      const marcados = await tx.repasse.updateMany({
        where: { id: repasse.id, efetivo: null },
        data: { efetivo: d.data },
      });
      if (marcados.count !== 1) aviso("Este repasse já está marcado como recebido.");

      const baixa = await tx.baixa.create({
        data: {
          tituloId: repasse.venda.tituloId,
          valor: repasse.valor,
          data: d.data,
          forma: repasse.venda.meio === MeioVenda.PIX ? FormaPagamento.PIX : FormaPagamento.CARTAO,
          contaId: d.contaId ?? null,
          registradoPorId: sessao.id,
        },
      });

      // O vínculo é o que deixa o estorno reabrir o repasse depois.
      await tx.repasse.update({
        where: { id: repasse.id },
        data: { baixaId: baixa.id },
      });
    });

    revalidatePath("/vendas");
    revalidatePath("/receber");
    revalidatePath("/");
    return { erro: null, ok: "Repasse marcado como recebido." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}
