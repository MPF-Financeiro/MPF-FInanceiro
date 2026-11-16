"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Categoria, Direcao, FormaPagamento, Origem, StatusVoucher } from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, PAPEIS_ADMIN, PAPEIS_FINANCEIRO } from "@/lib/permissoes";
import { exigirMesAberto } from "@/lib/fechamento";
import { inicioDoMes } from "@/lib/mes";
import { dividirRepasses } from "@/lib/money";
import {
  dataObrigatoria,
  dataOpcional,
  dinheiroPositivo,
  textoOpcional,
} from "@/lib/validacao";
import { aviso, ehRedirect, falha, type Estado } from "@/lib/acoes/comum";

const opcional = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};
const ativo = (v: FormDataEntryValue | null) => v === "on" || v === "true";

export async function salvarEmpresa(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_ADMIN);
    const d = z
      .object({
        id: z.string().optional(),
        nome: z.string().trim().min(2, "Escreva o nome da empresa").max(120),
        cnpj: z
          .string()
          .trim()
          .min(11, "CNPJ incompleto")
          .transform((v) => v.replace(/\D/g, "")),
        ativa: z.boolean(),
      })
      .parse({
        id: opcional(dados.get("id")),
        nome: dados.get("nome"),
        cnpj: dados.get("cnpj"),
        ativa: ativo(dados.get("ativa")),
      });

    if (d.id) {
      await db.empresa.update({
        where: { id: d.id },
        data: { nome: d.nome, cnpj: d.cnpj, ativa: d.ativa },
      });
    } else {
      const existe = await db.empresa.findUnique({ where: { cnpj: d.cnpj } });
      if (existe) aviso("Já existe empresa com esse CNPJ.");
      await db.empresa.create({ data: { nome: d.nome, cnpj: d.cnpj, ativa: d.ativa } });
    }
    revalidatePath("/cadastros");
    return { erro: null, ok: "Empresa salva." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarConta(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_ADMIN);
    const d = z
      .object({
        id: z.string().optional(),
        empresaId: z.string().min(1, "Escolha a empresa"),
        apelido: z.string().trim().min(2, "Dê um apelido à conta").max(60),
        banco: z.string().trim().min(2, "Escreva o banco").max(60),
        agencia: z.string().trim().max(20).optional(),
        numero: z.string().trim().max(30).optional(),
        ativa: z.boolean(),
      })
      .parse({
        id: opcional(dados.get("id")),
        empresaId: dados.get("empresaId"),
        apelido: dados.get("apelido"),
        banco: dados.get("banco"),
        agencia: opcional(dados.get("agencia")),
        numero: opcional(dados.get("numero")),
        ativa: ativo(dados.get("ativa")),
      });

    const payload = {
      empresaId: d.empresaId,
      apelido: d.apelido,
      banco: d.banco,
      agencia: d.agencia ?? null,
      numero: d.numero ?? null,
      ativa: d.ativa,
    };
    if (d.id) await db.contaBancaria.update({ where: { id: d.id }, data: payload });
    else await db.contaBancaria.create({ data: payload });

    revalidatePath("/cadastros");
    return { erro: null, ok: "Conta bancária salva." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarCliente(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().optional(),
        empresaId: z.string().min(1, "Escolha a empresa"),
        nome: z.string().trim().min(2, "Escreva o nome do cliente").max(120),
        documento: z.string().trim().max(30).optional(),
        contato: z.string().trim().max(120).optional(),
        email: z.string().trim().max(120).optional(),
        telefone: z.string().trim().max(40).optional(),
        ativo: z.boolean(),
      })
      .parse({
        id: opcional(dados.get("id")),
        empresaId: dados.get("empresaId"),
        nome: dados.get("nome"),
        documento: opcional(dados.get("documento")),
        contato: opcional(dados.get("contato")),
        email: opcional(dados.get("email")),
        telefone: opcional(dados.get("telefone")),
        ativo: ativo(dados.get("ativo")),
      });

    const payload = {
      empresaId: d.empresaId,
      nome: d.nome,
      documento: d.documento ?? null,
      contato: d.contato ?? null,
      email: d.email ?? null,
      telefone: d.telefone ?? null,
      ativo: d.ativo,
    };
    if (d.id) await db.cliente.update({ where: { id: d.id }, data: payload });
    else await db.cliente.create({ data: payload });

    revalidatePath("/cadastros");
    revalidatePath("/receber");
    return { erro: null, ok: "Cliente salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarFornecedor(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().optional(),
        nome: z.string().trim().min(2, "Escreva o nome do fornecedor").max(120),
        documento: z.string().trim().max(30).optional(),
        categoria: z.nativeEnum(Categoria),
        ativo: z.boolean(),
      })
      .parse({
        id: opcional(dados.get("id")),
        nome: dados.get("nome"),
        documento: opcional(dados.get("documento")),
        categoria: dados.get("categoria"),
        ativo: ativo(dados.get("ativo")),
      });

    const payload = {
      nome: d.nome,
      documento: d.documento ?? null,
      categoria: d.categoria,
      ativo: d.ativo,
    };
    if (d.id) await db.fornecedor.update({ where: { id: d.id }, data: payload });
    else await db.fornecedor.create({ data: payload });

    revalidatePath("/cadastros");
    revalidatePath("/pagar");
    return { erro: null, ok: "Fornecedor salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarContrato(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().optional(),
        clienteId: z.string().min(1, "Escolha o cliente"),
        numero: z.string().trim().min(1, "Informe o número do contrato").max(40),
        servico: z.string().trim().min(3, "Descreva o serviço").max(160),
        valorTotal: dinheiroPositivo,
        parcelas: z.coerce.number().int().min(1).max(60),
        inicio: dataObrigatoria,
        fim: dataOpcional,
        arquivo: z.string().trim().max(300).optional(),
        observacoes: textoOpcional,
      })
      .parse({
        id: opcional(dados.get("id")),
        clienteId: dados.get("clienteId"),
        numero: dados.get("numero"),
        servico: dados.get("servico"),
        valorTotal: String(dados.get("valorTotal") ?? ""),
        parcelas: opcional(dados.get("parcelas")) ?? 1,
        inicio: dados.get("inicio"),
        fim: String(dados.get("fim") ?? ""),
        arquivo: opcional(dados.get("arquivo")),
        observacoes: String(dados.get("observacoes") ?? ""),
      });

    const payload = {
      clienteId: d.clienteId,
      numero: d.numero,
      servico: d.servico,
      valorTotal: d.valorTotal,
      parcelas: d.parcelas,
      inicio: d.inicio,
      fim: d.fim,
      arquivo: d.arquivo ?? null,
      observacoes: d.observacoes,
    };
    if (d.id) await db.contrato.update({ where: { id: d.id }, data: payload });
    else await db.contrato.create({ data: payload });

    revalidatePath("/cadastros");
    return { erro: null, ok: "Contrato salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Gera as parcelas do contrato como títulos a receber. A origem CONTRATO com
 * origemId do contrato e número da parcela impede gerar duas vezes: rodar de
 * novo atualiza o mesmo título em vez de duplicar.
 */
export async function gerarTitulosDoContrato(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({ contratoId: z.string().min(1), primeiroVencimento: dataObrigatoria })
      .parse({
        contratoId: dados.get("contratoId"),
        primeiroVencimento: dados.get("primeiroVencimento"),
      });

    const contrato = await db.contrato.findUnique({
      where: { id: d.contratoId },
      include: { cliente: true },
    });
    if (!contrato) aviso("Contrato não encontrado.");
    await exigirMesAberto(d.primeiroVencimento);

    const fatias = dividirRepasses(contrato.valorTotal, contrato.parcelas);
    let criados = 0;
    let atualizados = 0;

    for (const [i, valor] of fatias.entries()) {
      const vencimento = new Date(
        Date.UTC(
          d.primeiroVencimento.getUTCFullYear(),
          d.primeiroVencimento.getUTCMonth() + i,
          d.primeiroVencimento.getUTCDate()
        )
      );
      const origemId = `${contrato.id}-${i + 1}`;
      const existente = await db.titulo.findUnique({
        where: { origem_origemId: { origem: Origem.CONTRATO, origemId } },
        include: { baixas: true },
      });

      if (existente) {
        // Título que já teve dinheiro não é mexido por geração automática.
        if (existente.baixas.length > 0) continue;
        await db.titulo.update({
          where: { id: existente.id },
          data: {
            valor,
            vencimento,
            competencia: inicioDoMes(vencimento),
            descricao: `${contrato.servico} (${i + 1}/${contrato.parcelas})`,
          },
        });
        atualizados += 1;
      } else {
        await db.titulo.create({
          data: {
            empresaId: contrato.cliente.empresaId,
            direcao: Direcao.RECEBER,
            categoria: Categoria.SERVICOS_PRESTADOS,
            descricao: `${contrato.servico} (${i + 1}/${contrato.parcelas})`,
            valor,
            competencia: inicioDoMes(vencimento),
            vencimento,
            clienteId: contrato.clienteId,
            contratoId: contrato.id,
            origem: Origem.CONTRATO,
            origemId,
            criadoPorId: sessao.id,
          },
        });
        criados += 1;
      }
    }

    revalidatePath("/cadastros");
    revalidatePath("/receber");
    revalidatePath("/");
    return {
      erro: null,
      ok: `${criados} títulos criados${atualizados ? `, ${atualizados} atualizados` : ""}. Nenhum título com baixa foi mexido.`,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarVoucher(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({
        id: z.string().optional(),
        clienteId: z.string().optional(),
        emissor: z.string().trim().min(2, "Escreva o emissor").max(120),
        codigo: z.string().trim().min(1, "Informe o código").max(60),
        valor: dinheiroPositivo,
        emissao: dataObrigatoria,
        repassePrevisto: dataOpcional,
        observacoes: textoOpcional,
      })
      .parse({
        id: opcional(dados.get("id")),
        clienteId: opcional(dados.get("clienteId")),
        emissor: dados.get("emissor"),
        codigo: dados.get("codigo"),
        valor: String(dados.get("valor") ?? ""),
        emissao: dados.get("emissao"),
        repassePrevisto: String(dados.get("repassePrevisto") ?? ""),
        observacoes: String(dados.get("observacoes") ?? ""),
      });

    const payload = {
      clienteId: d.clienteId ?? null,
      emissor: d.emissor,
      codigo: d.codigo,
      valor: d.valor,
      emissao: d.emissao,
      repassePrevisto: d.repassePrevisto,
      observacoes: d.observacoes,
    };
    if (d.id) await db.voucher.update({ where: { id: d.id }, data: payload });
    else await db.voucher.create({ data: payload });

    revalidatePath("/vouchers");
    return { erro: null, ok: "Voucher salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Voucher utilizado ainda não é dinheiro: vira um título a receber, com
 * vencimento na data prevista de repasse. O caixa só muda na baixa.
 */
export async function marcarVoucherUtilizado(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({ id: z.string().min(1), utilizacao: dataObrigatoria, empresaId: z.string().min(1) })
      .parse({
        id: dados.get("id"),
        utilizacao: dados.get("utilizacao"),
        empresaId: dados.get("empresaId"),
      });

    const voucher = await db.voucher.findUnique({ where: { id: d.id } });
    if (!voucher) aviso("Voucher não encontrado.");
    if (voucher.utilizacao) aviso("Este voucher já está marcado como utilizado.");
    await exigirMesAberto(d.utilizacao);

    const vencimento = voucher.repassePrevisto ?? d.utilizacao;
    await db.$transaction(async (tx) => {
      const titulo = await tx.titulo.create({
        data: {
          empresaId: d.empresaId,
          direcao: Direcao.RECEBER,
          categoria: Categoria.VALORES_A_ACERTAR,
          descricao: `Voucher ${voucher.codigo} — ${voucher.emissor}`,
          valor: voucher.valor,
          competencia: inicioDoMes(d.utilizacao),
          vencimento,
          forma: FormaPagamento.VOUCHER,
          clienteId: voucher.clienteId,
          origem: Origem.VOUCHER,
          origemId: voucher.id,
          criadoPorId: sessao.id,
        },
      });
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { utilizacao: d.utilizacao, status: StatusVoucher.UTILIZADO, tituloId: titulo.id },
      });
    });

    revalidatePath("/vouchers");
    revalidatePath("/receber");
    return {
      erro: null,
      ok: "Voucher marcado como utilizado e título a receber criado. O caixa só muda quando o repasse for baixado.",
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function cancelarVoucher(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_FINANCEIRO);
    const d = z
      .object({ id: z.string().min(1), motivo: z.string().trim().min(5, "Escreva o motivo") })
      .parse({ id: dados.get("id"), motivo: dados.get("motivo") });

    const voucher = await db.voucher.findUnique({ where: { id: d.id }, include: { titulo: { include: { baixas: true } } } });
    if (!voucher) aviso("Voucher não encontrado.");
    if (voucher.titulo?.baixas.length) {
      aviso("O repasse deste voucher já foi recebido. Estorne a baixa antes de cancelar.");
    }

    await db.$transaction(async (tx) => {
      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          status: StatusVoucher.CANCELADO,
          observacoes: [voucher.observacoes, `Cancelado: ${d.motivo}`].filter(Boolean).join("\n"),
        },
      });
      if (voucher.tituloId) {
        await tx.titulo.update({
          where: { id: voucher.tituloId },
          data: { canceladoEm: new Date(), motivoCancelamento: d.motivo },
        });
      }
    });

    revalidatePath("/vouchers");
    revalidatePath("/receber");
    return { erro: null, ok: "Voucher cancelado, com o motivo registrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}
