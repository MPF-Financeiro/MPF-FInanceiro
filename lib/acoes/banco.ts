"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Direcao } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, PAPEIS_ADMIN, PAPEIS_FINANCEIRO } from "@/lib/permissoes";
import { fimDoMes, inicioDoMes } from "@/lib/mes";
import { lerExtrato } from "@/lib/extrato";
import { competencia as competenciaZ, dinheiro, parseCentavos } from "@/lib/validacao";
import { aviso, ehRedirect, falha, type Estado } from "@/lib/acoes/comum";

/**
 * Importa o extrato colado. O par (conta, identificador) é único no banco:
 * importar o mesmo arquivo duas vezes não cria movimento repetido.
 */
export async function importarExtrato(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({ contaId: z.string().min(1, "Escolha a conta"), texto: z.string().min(5, "Cole o extrato") })
      .parse({ contaId: dados.get("contaId"), texto: dados.get("texto") });

    const { linhas, erros } = lerExtrato(d.texto);
    if (linhas.length === 0) {
      aviso(
        `Nenhuma linha reconhecida. Esperado: data, descrição, valor e, se houver, o identificador do banco.${
          erros[0] ? ` Primeiro erro: linha ${erros[0].linha}, ${erros[0].motivo}.` : ""
        }`
      );
    }

    const resultado = await db.movimentoExtrato.createMany({
      data: linhas.map((l) => ({
        contaId: d.contaId,
        data: l.data,
        descricao: l.descricao,
        valor: l.valor,
        fitid: l.fitid,
      })),
      skipDuplicates: true,
    });

    const repetidas = linhas.length - resultado.count;
    revalidatePath("/banco");
    return {
      erro: null,
      ok: `${resultado.count} movimentos importados${repetidas > 0 ? `, ${repetidas} já existiam` : ""}${
        erros.length > 0 ? `. ${erros.length} linhas não foram lidas: ${erros.slice(0, 3).map((e) => `linha ${e.linha} (${e.motivo})`).join("; ")}` : ""
      }.`,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Conciliar é confirmar que aquele movimento do banco é aquela baixa. */
export async function conciliar(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({ movimentoId: z.string().min(1), baixaId: z.string().min(1, "Escolha a baixa") })
      .parse({ movimentoId: dados.get("movimentoId"), baixaId: dados.get("baixaId") });

    const [movimento, baixa] = await Promise.all([
      db.movimentoExtrato.findUnique({ where: { id: d.movimentoId } }),
      db.baixa.findUnique({ where: { id: d.baixaId }, include: { movimento: true } }),
    ]);
    if (!movimento) aviso("Movimento não encontrado.");
    if (!baixa) aviso("Baixa não encontrada.");
    if (movimento.baixaId) aviso("Este movimento já está conciliado.");
    if (baixa.movimento) aviso("Esta baixa já está conciliada com outro movimento.");
    if (Math.abs(movimento.valor) !== Math.abs(baixa.valor)) {
      aviso("O valor do movimento e o da baixa são diferentes.");
    }

    await db.movimentoExtrato.update({
      where: { id: movimento.id },
      data: { baixaId: baixa.id },
    });

    revalidatePath("/banco");
    return { erro: null, ok: "Movimento conciliado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function desconciliar(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const id = String(dados.get("movimentoId") ?? "");
    if (!id) aviso("Movimento não informado.");
    await db.movimentoExtrato.update({ where: { id }, data: { baixaId: null } });
    revalidatePath("/banco");
    return { erro: null, ok: "Conciliação desfeita." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Saldo que o sistema calcula para a conta no mês, a partir das baixas. */
export async function saldoCalculado(
  contaId: string,
  competencia: Date,
  saldoInicial: number
): Promise<{ entradas: number; saidas: number; saldoFinal: number }> {
  const baixas = await db.baixa.findMany({
    where: { contaId, data: { gte: inicioDoMes(competencia), lt: fimDoMes(competencia) } },
    include: { titulo: { select: { direcao: true } } },
  });
  const entradas = baixas
    .filter((b) => b.titulo.direcao === Direcao.RECEBER)
    .reduce((a, b) => a + b.valor, 0);
  const saidas = baixas
    .filter((b) => b.titulo.direcao === Direcao.PAGAR)
    .reduce((a, b) => a + b.valor, 0);
  return { entradas, saidas, saldoFinal: saldoInicial + entradas - saidas };
}

/**
 * Fechar o mês trava os lançamentos daquela competência. É o que faz o
 * relatório que a cliente olhou continuar igual amanhã. Correção depois do
 * fechamento é estorno no mês aberto.
 */
export async function fecharMes(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_ADMIN);
    const d = z
      .object({
        contaId: z.string().min(1, "Escolha a conta"),
        competencia: competenciaZ,
        saldoInicial: dinheiro,
        saldoFinalExtrato: z.string().optional(),
      })
      .parse({
        contaId: dados.get("contaId"),
        competencia: dados.get("competencia"),
        saldoInicial: String(dados.get("saldoInicial") ?? "0"),
        saldoFinalExtrato: String(dados.get("saldoFinalExtrato") ?? ""),
      });

    const calculado = await saldoCalculado(d.contaId, d.competencia, d.saldoInicial);
    const extrato = d.saldoFinalExtrato ? parseCentavos(d.saldoFinalExtrato) : null;
    if (d.saldoFinalExtrato && extrato === null) aviso("Saldo do extrato inválido.");

    const naoConciliados = await db.movimentoExtrato.count({
      where: {
        contaId: d.contaId,
        baixaId: null,
        data: { gte: inicioDoMes(d.competencia), lt: fimDoMes(d.competencia) },
      },
    });

    await db.fechamentoMensal.upsert({
      where: { contaId_competencia: { contaId: d.contaId, competencia: d.competencia } },
      update: {
        saldoInicial: d.saldoInicial,
        saldoFinalCalculado: calculado.saldoFinal,
        saldoFinalExtrato: extrato,
        fechadoEm: new Date(),
      },
      create: {
        contaId: d.contaId,
        competencia: d.competencia,
        saldoInicial: d.saldoInicial,
        saldoFinalCalculado: calculado.saldoFinal,
        saldoFinalExtrato: extrato,
        fechadoEm: new Date(),
      },
    });

    const diferenca = extrato === null ? 0 : extrato - calculado.saldoFinal;
    revalidatePath("/banco");
    revalidatePath("/");
    return {
      erro: null,
      ok:
        `Mês fechado. Saldo calculado ${(calculado.saldoFinal / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` +
        (extrato !== null && diferenca !== 0
          ? ` Atenção: o extrato difere em ${(diferenca / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
          : "") +
        (naoConciliados > 0 ? ` ${naoConciliados} movimentos do mês seguem sem conciliar.` : ""),
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function reabrirMes(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_ADMIN);
    const d = z
      .object({ id: z.string().min(1), motivo: z.string().trim().min(5, "Escreva o motivo") })
      .parse({ id: dados.get("id"), motivo: dados.get("motivo") });

    const fechamento = await db.fechamentoMensal.findUnique({ where: { id: d.id } });
    if (!fechamento) aviso("Fechamento não encontrado.");

    await db.fechamentoMensal.update({
      where: { id: d.id },
      data: {
        fechadoEm: null,
        observacoes: [fechamento.observacoes, `Reaberto: ${d.motivo}`].filter(Boolean).join("\n"),
      },
    });

    revalidatePath("/banco");
    revalidatePath("/");
    return { erro: null, ok: "Mês reaberto, com o motivo registrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Verificação do mês antes de fechar, para a tela mostrar o que falta. */
export async function conferirMes(contaId: string, competencia: Date) {
  const fechamento = await db.fechamentoMensal.findUnique({
    where: { contaId_competencia: { contaId, competencia: inicioDoMes(competencia) } },
  });
  const saldoInicial = fechamento?.saldoInicial ?? 0;
  const calculado = await saldoCalculado(contaId, competencia, saldoInicial);
  const naoConciliados = await db.movimentoExtrato.count({
    where: {
      contaId,
      baixaId: null,
      data: { gte: inicioDoMes(competencia), lt: fimDoMes(competencia) },
    },
  });
  return { fechamento, ...calculado, naoConciliados };
}
