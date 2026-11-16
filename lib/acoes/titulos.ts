"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Categoria, Direcao, FormaPagamento, Origem } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, PAPEIS_FINANCEIRO } from "@/lib/permissoes";
import { exigirMesAberto } from "@/lib/fechamento";
import { inicioDoMes } from "@/lib/mes";
import { dividirRepasses, saldo } from "@/lib/money";
import {
  competencia as competenciaZ,
  dataObrigatoria,
  dinheiroPositivo,
  textoOpcional,
} from "@/lib/validacao";
import { aviso, ehRedirect, falha, type Estado } from "@/lib/acoes/comum";

const vazioParaNulo = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};

const esquemaTitulo = z.object({
  empresaId: z.string().min(1, "Escolha a empresa"),
  direcao: z.nativeEnum(Direcao),
  categoria: z.nativeEnum(Categoria),
  descricao: z.string().trim().min(3, "Descreva a conta em pelo menos 3 letras").max(200),
  valor: dinheiroPositivo,
  parcelas: z.coerce.number().int().min(1).max(36).default(1),
  competencia: competenciaZ,
  vencimento: dataObrigatoria,
  forma: z.nativeEnum(FormaPagamento).optional(),
  clienteId: z.string().optional(),
  fornecedorId: z.string().optional(),
  contratoId: z.string().optional(),
  colaboradorId: z.string().optional(),
  observacoes: textoOpcional,
});

function somarMeses(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

/**
 * Lança uma conta a receber ou a pagar. Parcelado gera um título por parcela,
 * cada um com a própria competência e vencimento: é o que deixa o relatório
 * do mês certo sem ninguém ter de ratear à mão depois.
 */
export async function lancarTitulo(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = esquemaTitulo.parse({
      empresaId: dados.get("empresaId"),
      direcao: dados.get("direcao"),
      categoria: dados.get("categoria"),
      descricao: dados.get("descricao"),
      valor: String(dados.get("valor") ?? ""),
      parcelas: vazioParaNulo(dados.get("parcelas")) ?? 1,
      competencia: dados.get("competencia"),
      vencimento: dados.get("vencimento"),
      forma: vazioParaNulo(dados.get("forma")) as FormaPagamento | undefined,
      clienteId: vazioParaNulo(dados.get("clienteId")),
      fornecedorId: vazioParaNulo(dados.get("fornecedorId")),
      contratoId: vazioParaNulo(dados.get("contratoId")),
      colaboradorId: vazioParaNulo(dados.get("colaboradorId")),
      observacoes: String(dados.get("observacoes") ?? ""),
    });

    await exigirMesAberto(d.competencia);
    if (d.parcelas > 1) {
      await exigirMesAberto(somarMeses(d.competencia, d.parcelas - 1));
    }

    const valores = dividirRepasses(d.valor, d.parcelas);
    await db.titulo.createMany({
      data: valores.map((valor, i) => ({
        empresaId: d.empresaId,
        direcao: d.direcao,
        categoria: d.categoria,
        descricao:
          d.parcelas > 1 ? `${d.descricao} (${i + 1}/${d.parcelas})` : d.descricao,
        valor,
        competencia: inicioDoMes(somarMeses(d.competencia, i)),
        vencimento: somarMeses(d.vencimento, i),
        forma: d.forma ?? null,
        clienteId: d.clienteId ?? null,
        fornecedorId: d.fornecedorId ?? null,
        contratoId: d.contratoId ?? null,
        colaboradorId: d.colaboradorId ?? null,
        observacoes: d.observacoes,
        origem: Origem.MANUAL,
        criadoPorId: sessao.id,
      })),
    });

    const destino = d.direcao === Direcao.RECEBER ? "/receber" : "/pagar";
    revalidatePath(destino);
    revalidatePath("/");
    redirect(destino);
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

const esquemaBaixa = z.object({
  tituloId: z.string().min(1),
  valor: dinheiroPositivo,
  data: dataObrigatoria,
  forma: z.nativeEnum(FormaPagamento),
  contaId: z.string().optional(),
  comprovante: textoOpcional,
});

/**
 * Dar baixa é registrar que o dinheiro andou. O status do título sai daqui,
 * por cálculo: ninguém escolhe "quitado" na mão.
 */
export async function darBaixa(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = esquemaBaixa.parse({
      tituloId: dados.get("tituloId"),
      valor: String(dados.get("valor") ?? ""),
      data: dados.get("data"),
      forma: dados.get("forma"),
      contaId: vazioParaNulo(dados.get("contaId")),
      comprovante: String(dados.get("comprovante") ?? ""),
    });

    const titulo = await db.titulo.findUnique({
      where: { id: d.tituloId },
      include: { baixas: true },
    });
    if (!titulo) aviso("Título não encontrado.");
    if (titulo.canceladoEm) aviso("Este título está cancelado. Não dá para dar baixa nele.");

    await exigirMesAberto(titulo.competencia);
    await exigirMesAberto(d.data);

    const pendente = saldo(titulo.valor, titulo.baixas.map((b) => b.valor));
    if (d.valor > pendente) {
      aviso(
        `O valor é maior que o pendente. Faltam ${(pendente / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}. Se recebeu a mais, lance o excedente como outro título.`
      );
    }

    await db.baixa.create({
      data: {
        tituloId: titulo.id,
        valor: d.valor,
        data: d.data,
        forma: d.forma,
        contaId: d.contaId ?? null,
        comprovante: d.comprovante,
        registradoPorId: sessao.id,
      },
    });

    const destino = titulo.direcao === Direcao.RECEBER ? "/receber" : "/pagar";
    revalidatePath(destino);
    revalidatePath(`${destino}/${titulo.id}`);
    revalidatePath("/");
    return { erro: null, ok: "Baixa registrada." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Estorno não apaga a baixa errada: cria outra, negativa, com motivo. O
 * histórico fica contando o que aconteceu, que é o que a auditoria pede.
 */
export async function estornarBaixa(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        baixaId: z.string().min(1),
        motivo: z.string().trim().min(5, "Escreva o motivo do estorno"),
        data: dataObrigatoria,
      })
      .parse({
        baixaId: dados.get("baixaId"),
        motivo: dados.get("motivo"),
        data: dados.get("data"),
      });

    const baixa = await db.baixa.findUnique({
      where: { id: d.baixaId },
      include: { titulo: true },
    });
    if (!baixa) aviso("Baixa não encontrada.");
    if (baixa.valor < 0) aviso("Esta linha já é um estorno.");
    await exigirMesAberto(d.data);

    await db.baixa.create({
      data: {
        tituloId: baixa.tituloId,
        valor: -baixa.valor,
        data: d.data,
        forma: baixa.forma,
        contaId: baixa.contaId,
        motivo: d.motivo,
        registradoPorId: sessao.id,
      },
    });

    const destino = baixa.titulo.direcao === Direcao.RECEBER ? "/receber" : "/pagar";
    revalidatePath(destino);
    revalidatePath(`${destino}/${baixa.tituloId}`);
    revalidatePath("/");
    return { erro: null, ok: "Estorno registrado no histórico." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Cancelar guarda o motivo e mantém o título na lista, carimbado. */
export async function cancelarTitulo(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().min(1),
        motivo: z.string().trim().min(5, "Escreva o motivo do cancelamento"),
      })
      .parse({ id: dados.get("id"), motivo: dados.get("motivo") });

    const titulo = await db.titulo.findUnique({
      where: { id: d.id },
      include: { baixas: true },
    });
    if (!titulo) aviso("Título não encontrado.");
    if (titulo.canceladoEm) aviso("Este título já está cancelado.");
    const movimentado = titulo.baixas.reduce((a, b) => a + b.valor, 0);
    if (movimentado !== 0) {
      aviso(
        "Este título já teve dinheiro movimentado. Estorne as baixas primeiro; o cancelamento é só para o que nunca andou."
      );
    }
    await exigirMesAberto(titulo.competencia);

    await db.titulo.update({
      where: { id: titulo.id },
      data: { canceladoEm: new Date(), motivoCancelamento: d.motivo },
    });

    const destino = titulo.direcao === Direcao.RECEBER ? "/receber" : "/pagar";
    revalidatePath(destino);
    revalidatePath(`${destino}/${titulo.id}`);
    revalidatePath("/");
    return { erro: null, ok: "Título cancelado, com o motivo registrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Corrigir o que não é dinheiro: descrição, vencimento, forma, observação. */
export async function atualizarTitulo(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().min(1),
        descricao: z.string().trim().min(3).max(200),
        vencimento: dataObrigatoria,
        forma: z.nativeEnum(FormaPagamento).optional(),
        observacoes: textoOpcional,
      })
      .parse({
        id: dados.get("id"),
        descricao: dados.get("descricao"),
        vencimento: dados.get("vencimento"),
        forma: vazioParaNulo(dados.get("forma")) as FormaPagamento | undefined,
        observacoes: String(dados.get("observacoes") ?? ""),
      });

    const titulo = await db.titulo.findUnique({ where: { id: d.id } });
    if (!titulo) aviso("Título não encontrado.");
    await exigirMesAberto(titulo.competencia);

    await db.titulo.update({
      where: { id: titulo.id },
      data: {
        descricao: d.descricao,
        vencimento: d.vencimento,
        forma: d.forma ?? null,
        observacoes: d.observacoes,
      },
    });

    const destino = titulo.direcao === Direcao.RECEBER ? "/receber" : "/pagar";
    revalidatePath(destino);
    revalidatePath(`${destino}/${titulo.id}`);
    return { erro: null, ok: "Título atualizado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}
