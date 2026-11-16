"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  Categoria,
  Direcao,
  Origem,
  StatusColaborador,
  StatusFerias,
  TipoBeneficio,
  TipoExame,
} from "@prisma/client";
import { db } from "@/lib/db";
import { exigir, PAPEIS_RH } from "@/lib/permissoes";
import { exigirMesAberto } from "@/lib/fechamento";
import { inicioDoMes } from "@/lib/mes";
import { calcularItemFolha, conferirFerias } from "@/lib/folha";
import {
  competencia as competenciaZ,
  dataObrigatoria,
  dataOpcional,
  dinheiro,
  dinheiroPositivo,
  parseCentavos,
  textoOpcional,
} from "@/lib/validacao";
import { aviso, ehRedirect, falha, type Estado } from "@/lib/acoes/comum";
import { registrarToken } from "@/lib/idempotencia";

const opcional = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};
const centavos = (v: FormDataEntryValue | null) => parseCentavos(v) ?? 0;

/** A categoria do título de cada tipo de benefício. */
const CATEGORIA_BENEFICIO: Record<TipoBeneficio, Categoria> = {
  VALE_ALIMENTACAO: Categoria.VALE_ALIMENTACAO,
  VALE_TRANSPORTE: Categoria.VALE_TRANSPORTE,
  PLANO_SAUDE: Categoria.SERVICOS_ASSINATURAS,
  OUTRO: Categoria.OUTROS,
};

async function empresaPadrao(): Promise<string> {
  const empresa = await db.empresa.findFirst({
    where: { ativa: true },
    orderBy: { nome: "asc" },
  });
  if (!empresa) aviso("Cadastre uma empresa antes de gerar títulos.");
  return empresa.id;
}

/** Salário cai no dia 5 do mês seguinte à competência. */
function vencimentoDaFolha(competencia: Date): Date {
  return new Date(Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 5));
}

export async function salvarColaborador(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        id: z.string().optional(),
        nome: z.string().trim().min(3, "Escreva o nome").max(120),
        cargo: z.string().trim().min(2, "Escreva o cargo").max(80),
        setor: z.string().trim().max(80).optional(),
        admissao: dataObrigatoria,
        salario: dinheiroPositivo,
        cpf: z
          .string()
          .trim()
          .optional()
          .transform((v) => (v ? v.replace(/\D/g, "") : undefined)),
        email: z.string().trim().max(120).optional(),
        status: z.nativeEnum(StatusColaborador),
      })
      .parse({
        id: opcional(dados.get("id")),
        nome: dados.get("nome"),
        cargo: dados.get("cargo"),
        setor: opcional(dados.get("setor")),
        admissao: dados.get("admissao"),
        salario: String(dados.get("salario") ?? ""),
        cpf: opcional(dados.get("cpf")),
        email: opcional(dados.get("email")),
        status: dados.get("status"),
      });

    const payload = {
      nome: d.nome,
      cargo: d.cargo,
      setor: d.setor ?? null,
      admissao: d.admissao,
      salario: d.salario,
      cpf: d.cpf ?? null,
      email: d.email ?? null,
      status: d.status,
    };
    if (d.id) await db.colaborador.update({ where: { id: d.id }, data: payload });
    else await db.colaborador.create({ data: payload });

    revalidatePath("/rh");
    return { erro: null, ok: "Colaborador salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Benefício do mês. A chave única por colaborador, tipo e competência faz o
 * reenvio atualizar em vez de duplicar.
 */
export async function salvarBeneficio(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1, "Escolha o colaborador"),
        tipo: z.nativeEnum(TipoBeneficio),
        competencia: competenciaZ,
        previsto: dinheiroPositivo,
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        tipo: dados.get("tipo"),
        competencia: dados.get("competencia"),
        previsto: String(dados.get("previsto") ?? ""),
      });

    await exigirMesAberto(d.competencia);
    await db.beneficioMensal.upsert({
      where: {
        colaboradorId_tipo_competencia: {
          colaboradorId: d.colaboradorId,
          tipo: d.tipo,
          competencia: d.competencia,
        },
      },
      update: { previsto: d.previsto },
      create: {
        colaboradorId: d.colaboradorId,
        tipo: d.tipo,
        competencia: d.competencia,
        previsto: d.previsto,
      },
    });

    revalidatePath("/rh");
    return { erro: null, ok: "Benefício salvo." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Gera um título a pagar por benefício do mês, sem duplicar. */
export async function gerarTitulosDeBeneficios(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_RH);
    const d = z.object({ competencia: competenciaZ, vencimento: dataObrigatoria }).parse({
      competencia: dados.get("competencia"),
      vencimento: dados.get("vencimento"),
    });

    await exigirMesAberto(d.competencia);
    const empresaId = await empresaPadrao();
    const beneficios = await db.beneficioMensal.findMany({
      where: { competencia: d.competencia },
      include: { colaborador: true },
    });
    if (beneficios.length === 0) aviso("Nenhum benefício lançado nessa competência.");

    let criados = 0;
    let atualizados = 0;
    for (const b of beneficios) {
      const existente = await db.titulo.findUnique({
        where: {
          origem_origemId: { origem: Origem.BENEFICIO, origemId: b.id },
        },
        include: { baixas: true },
      });
      const base = {
        empresaId,
        direcao: Direcao.PAGAR,
        categoria: CATEGORIA_BENEFICIO[b.tipo],
        descricao: `${b.tipo === "VALE_ALIMENTACAO" ? "Vale-alimentação" : b.tipo === "VALE_TRANSPORTE" ? "Vale-transporte" : b.tipo === "PLANO_SAUDE" ? "Plano de saúde" : "Benefício"} — ${b.colaborador.nome}`,
        valor: b.previsto,
        competencia: b.competencia,
        vencimento: d.vencimento,
        colaboradorId: b.colaboradorId,
      };
      if (existente) {
        if (existente.baixas.length > 0) continue;
        await db.titulo.update({ where: { id: existente.id }, data: base });
        atualizados += 1;
      } else {
        await db.titulo.create({
          data: {
            ...base,
            origem: Origem.BENEFICIO,
            origemId: b.id,
            criadoPorId: sessao.id,
          },
        });
        criados += 1;
      }
    }

    revalidatePath("/rh");
    revalidatePath("/pagar");
    return {
      erro: null,
      ok: `${criados} títulos criados${atualizados ? `, ${atualizados} atualizados` : ""}. Benefício já pago não foi mexido.`,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/** Abre a folha de uma competência e traz todo mundo que está ativo. */
export async function abrirFolha(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z.object({ competencia: competenciaZ }).parse({
      competencia: dados.get("competencia"),
    });
    await exigirMesAberto(d.competencia);

    const existente = await db.folha.findUnique({
      where: { competencia: d.competencia },
    });
    if (existente) aviso("Já existe folha nessa competência.");

    const ativos = await db.colaborador.findMany({
      where: { status: StatusColaborador.ATIVO },
    });
    if (ativos.length === 0) aviso("Nenhum colaborador ativo para montar a folha.");

    const beneficios = await db.beneficioMensal.findMany({
      where: { competencia: d.competencia },
    });
    const bonificacoes = await db.bonificacao.findMany({
      where: { competencia: d.competencia, naFolha: true },
    });

    await db.folha.create({
      data: {
        competencia: d.competencia,
        itens: {
          create: ativos.map((c) => {
            const bonus = bonificacoes
              .filter((b) => b.colaboradorId === c.id)
              .reduce((a, b) => a + b.valor, 0);
            const va = beneficios
              .filter((b) => b.colaboradorId === c.id && b.tipo === "VALE_ALIMENTACAO")
              .reduce((a, b) => a + b.previsto, 0);
            const vt = beneficios
              .filter((b) => b.colaboradorId === c.id && b.tipo === "VALE_TRANSPORTE")
              .reduce((a, b) => a + b.previsto, 0);
            return {
              colaboradorId: c.id,
              salarioBruto: c.salario,
              bonificacoes: bonus,
              valeAlimentacao: va,
              valeTransporte: vt,
              liquido: calcularItemFolha({
                salarioBruto: c.salario,
                bonificacoes: bonus,
              }).liquido,
            };
          }),
        },
      },
    });

    revalidatePath("/rh/folha");
    return { erro: null, ok: "Folha aberta com os colaboradores ativos." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarItemFolha(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const id = String(dados.get("id") ?? "");
    if (!id) aviso("Item da folha não informado.");

    const item = await db.itemFolha.findUnique({
      where: { id },
      include: { folha: true },
    });
    if (!item) aviso("Item da folha não encontrado.");
    if (item.folha.fechadaEm) aviso("Esta folha está fechada. Reabra antes de mudar valores.");
    await exigirMesAberto(item.folha.competencia);

    const entrada = {
      salarioBruto: centavos(dados.get("salarioBruto")),
      bonificacoes: centavos(dados.get("bonificacoes")),
      horasExtras: centavos(dados.get("horasExtras")),
      adiantamentos: centavos(dados.get("adiantamentos")),
      inss: centavos(dados.get("inss")),
      irrf: centavos(dados.get("irrf")),
      outrosDescontos: centavos(dados.get("outrosDescontos")),
    };
    if (entrada.salarioBruto <= 0) aviso("O salário bruto tem de ser maior que zero.");
    const conta = calcularItemFolha(entrada);
    if (conta.liquido < 0) {
      aviso("Os descontos passam dos proventos: o líquido ficaria negativo.");
    }

    await db.itemFolha.update({
      where: { id },
      data: {
        ...entrada,
        valeAlimentacao: centavos(dados.get("valeAlimentacao")),
        valeTransporte: centavos(dados.get("valeTransporte")),
        liquido: conta.liquido,
      },
    });

    revalidatePath("/rh/folha");
    return { erro: null, ok: "Item da folha atualizado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function fecharFolha(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const id = String(dados.get("id") ?? "");
    const folha = await db.folha.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!folha) aviso("Folha não encontrada.");
    if (folha.itens.length === 0) aviso("Folha sem itens.");
    await db.folha.update({
      where: { id },
      data: { fechadaEm: folha.fechadaEm ? null : new Date() },
    });
    revalidatePath("/rh/folha");
    return {
      erro: null,
      ok: folha.fechadaEm ? "Folha reaberta." : "Folha fechada.",
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Manda a folha para o Financeiro: um título a pagar por colaborador, com
 * origem FOLHA e origemId do item. Reenviar a folha corrigida atualiza o
 * mesmo título — é esta chave que impede o salário lançado duas vezes, que
 * foi a preocupação da cliente.
 */
export async function enviarFolha(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_RH);
    const id = String(dados.get("id") ?? "");
    const folha = await db.folha.findUnique({
      where: { id },
      include: { itens: { include: { colaborador: true } } },
    });
    if (!folha) aviso("Folha não encontrada.");
    if (!folha.fechadaEm) aviso("Feche a folha antes de mandar para o Financeiro.");
    await exigirMesAberto(folha.competencia);

    const empresaId = await empresaPadrao();
    const vencimento = vencimentoDaFolha(folha.competencia);
    let criados = 0;
    let atualizados = 0;

    for (const item of folha.itens) {
      const existente = await db.titulo.findUnique({
        where: { origem_origemId: { origem: Origem.FOLHA, origemId: item.id } },
        include: { baixas: true },
      });
      const base = {
        empresaId,
        direcao: Direcao.PAGAR,
        categoria: Categoria.SALARIOS,
        descricao: `Salário — ${item.colaborador.nome}`,
        valor: item.liquido,
        competencia: folha.competencia,
        vencimento,
        colaboradorId: item.colaboradorId,
      };
      if (existente) {
        if (existente.baixas.length > 0) continue;
        await db.titulo.update({ where: { id: existente.id }, data: base });
        atualizados += 1;
      } else {
        await db.titulo.create({
          data: {
            ...base,
            origem: Origem.FOLHA,
            origemId: item.id,
            criadoPorId: sessao.id,
          },
        });
        criados += 1;
      }
    }

    await db.folha.update({ where: { id }, data: { enviadaEm: new Date() } });
    revalidatePath("/rh/folha");
    revalidatePath("/pagar");
    revalidatePath("/");
    return {
      erro: null,
      ok: `${criados} títulos criados${atualizados ? `, ${atualizados} atualizados` : ""}. Salário já pago não foi mexido.`,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarBonificacao(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1, "Escolha o colaborador"),
        referencia: z.string().trim().min(2, "Diga de onde vem a bonificação").max(160),
        valorConta: dinheiro,
        valor: dinheiroPositivo,
        competencia: competenciaZ,
        naFolha: z.boolean(),
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        referencia: dados.get("referencia"),
        valorConta: String(dados.get("valorConta") ?? "0"),
        valor: String(dados.get("valor") ?? ""),
        competencia: dados.get("competencia"),
        naFolha: dados.get("naFolha") === "on" || dados.get("naFolha") === "true",
      });

    await exigirMesAberto(d.competencia);

    // Bonificação "na folha" só entra no líquido porque `abrirFolha` a soma ao
    // montar os itens. Lançada depois que a folha já abriu, ela não entrava em
    // lugar nenhum: nem no item, nem como título — a pessoa ficava sem receber.
    const folha = await db.folha.findUnique({
      where: { competencia: d.competencia },
      include: { itens: { where: { colaboradorId: d.colaboradorId } } },
    });
    if (d.naFolha && folha?.fechadaEm) {
      aviso(
        'A folha desta competência já está fechada. Reabra a folha, ou desmarque "entra na folha" para a bonificação virar um título a pagar próprio.'
      );
    }
    const itemDaFolha = d.naFolha ? (folha?.itens[0] ?? null) : null;
    if (d.naFolha && folha && !itemDaFolha) {
      aviso(
        'A folha desta competência já abriu e este colaborador não está nela. Desmarque "entra na folha" para a bonificação virar um título a pagar próprio.'
      );
    }

    const token = opcional(dados.get("token"));
    await db.$transaction(async (tx) => {
      await registrarToken(tx, token, "salvarBonificacao");

      const criada = await tx.bonificacao.create({
        data: {
          colaboradorId: d.colaboradorId,
          referencia: d.referencia,
          valorConta: d.valorConta,
          valor: d.valor,
          competencia: d.competencia,
          naFolha: d.naFolha,
        },
        include: { colaborador: true },
      });

      // Fora da folha, a bonificação é um título a pagar próprio. Dentro da
      // folha, ela entra no item e sai no líquido: nunca nos dois.
      if (!d.naFolha) {
        await tx.titulo.create({
          data: {
            empresaId: await empresaPadrao(),
            direcao: Direcao.PAGAR,
            categoria: Categoria.BONIFICACOES,
            descricao: `Bonificação — ${criada.colaborador.nome} (${d.referencia})`,
            valor: d.valor,
            competencia: d.competencia,
            vencimento: vencimentoDaFolha(d.competencia),
            colaboradorId: d.colaboradorId,
            origem: Origem.BONIFICACAO,
            origemId: criada.id,
            criadoPorId: sessao.id,
          },
        });
      } else if (itemDaFolha) {
        // Folha já aberta: a bonificação entra no item que existe, e o líquido
        // é recalculado na hora, pela mesma conta de `abrirFolha`.
        const bonificacoes = itemDaFolha.bonificacoes + d.valor;
        const conta = calcularItemFolha({
          salarioBruto: itemDaFolha.salarioBruto,
          bonificacoes,
          horasExtras: itemDaFolha.horasExtras,
          adiantamentos: itemDaFolha.adiantamentos,
          inss: itemDaFolha.inss,
          irrf: itemDaFolha.irrf,
          outrosDescontos: itemDaFolha.outrosDescontos,
        });
        await tx.itemFolha.update({
          where: { id: itemDaFolha.id },
          data: { bonificacoes, liquido: conta.liquido },
        });
      }
    });

    revalidatePath("/rh");
    revalidatePath("/rh/folha");
    revalidatePath("/pagar");
    return {
      erro: null,
      ok: d.naFolha
        ? itemDaFolha
          ? "Bonificação registrada e somada ao item desta pessoa na folha aberta."
          : "Bonificação registrada: entra no líquido da folha desta competência."
        : "Bonificação registrada e título a pagar criado.",
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarFerias(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        id: z.string().optional(),
        colaboradorId: z.string().min(1, "Escolha o colaborador"),
        periodoAquisitivoInicio: dataObrigatoria,
        periodoAquisitivoFim: dataObrigatoria,
        inicio: dataObrigatoria,
        fim: dataObrigatoria,
        diasVendidos: z.coerce.number().int().min(0).max(10),
        abonoPecuniario: z.boolean(),
        status: z.nativeEnum(StatusFerias),
        observacoes: textoOpcional,
      })
      .parse({
        id: opcional(dados.get("id")),
        colaboradorId: dados.get("colaboradorId"),
        periodoAquisitivoInicio: dados.get("periodoAquisitivoInicio"),
        periodoAquisitivoFim: dados.get("periodoAquisitivoFim"),
        inicio: dados.get("inicio"),
        fim: dados.get("fim"),
        diasVendidos: opcional(dados.get("diasVendidos")) ?? 0,
        abonoPecuniario:
          dados.get("abonoPecuniario") === "on" || dados.get("abonoPecuniario") === "true",
        status: dados.get("status"),
      });

    const conferencia = conferirFerias({
      inicio: d.inicio,
      fim: d.fim,
      diasVendidos: d.diasVendidos,
    });
    if (conferencia.aviso) aviso(conferencia.aviso);

    const payload = {
      colaboradorId: d.colaboradorId,
      periodoAquisitivoInicio: d.periodoAquisitivoInicio,
      periodoAquisitivoFim: d.periodoAquisitivoFim,
      inicio: d.inicio,
      fim: d.fim,
      diasVendidos: d.diasVendidos,
      abonoPecuniario: d.abonoPecuniario,
      status: d.status,
      observacoes: d.observacoes,
    };
    if (d.id) await db.ferias.update({ where: { id: d.id }, data: payload });
    else await db.ferias.create({ data: payload });

    revalidatePath(`/rh/${d.colaboradorId}`);
    revalidatePath("/rh");
    return {
      erro: null,
      ok: `Férias salvas: ${conferencia.diasGozo} dias de gozo${
        d.diasVendidos ? ` e ${d.diasVendidos} vendidos` : ""
      }.`,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarExame(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1, "Escolha o colaborador"),
        tipo: z.nativeEnum(TipoExame),
        realizado: dataObrigatoria,
        proximo: dataOpcional,
        clinica: z.string().trim().max(120).optional(),
        apto: z.boolean(),
        laudo: z.string().trim().max(300).optional(),
        custo: z.string().optional(),
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        tipo: dados.get("tipo"),
        realizado: dados.get("realizado"),
        proximo: String(dados.get("proximo") ?? ""),
        clinica: opcional(dados.get("clinica")),
        apto: dados.get("apto") === "on" || dados.get("apto") === "true",
        laudo: opcional(dados.get("laudo")),
        custo: opcional(dados.get("custo")),
      });

    await db.exameOcupacional.create({
      data: {
        colaboradorId: d.colaboradorId,
        tipo: d.tipo,
        realizado: d.realizado,
        proximo: d.proximo,
        clinica: d.clinica ?? null,
        apto: d.apto,
        laudo: d.laudo ?? null,
        custo: d.custo ? (parseCentavos(d.custo) ?? 0) : 0,
      },
    });

    revalidatePath(`/rh/${d.colaboradorId}`);
    return {
      erro: null,
      ok: "Exame registrado. O laudo é dado de saúde: quem abrir fica registrado.",
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Abrir laudo deixa rastro. É o que separa "o RH precisou ver" de "alguém
 * passeou pelos exames da equipe".
 */
export async function abrirLaudo(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_RH);
    const id = String(dados.get("exameId") ?? "");
    const exame = await db.exameOcupacional.findUnique({ where: { id } });
    if (!exame) aviso("Exame não encontrado.");
    if (!exame.laudo) aviso("Este exame não tem laudo anexado.");

    await db.acessoDocumento.create({
      data: {
        usuarioId: sessao.id,
        documento: exame.laudo,
        entidade: "ExameOcupacional",
        entidadeId: exame.id,
      },
    });

    revalidatePath(`/rh/${exame.colaboradorId}`);
    return { erro: null, ok: `Acesso registrado. Laudo: ${exame.laudo}` };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarDocumentoRH(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1),
        tipo: z.string().trim().min(2, "Diga que documento é").max(80),
        arquivo: z.string().trim().max(300).optional(),
        emitidoEm: dataOpcional,
        venceEm: dataOpcional,
        restrito: z.boolean(),
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        tipo: dados.get("tipo"),
        arquivo: opcional(dados.get("arquivo")),
        emitidoEm: String(dados.get("emitidoEm") ?? ""),
        venceEm: String(dados.get("venceEm") ?? ""),
        restrito: dados.get("restrito") === "on" || dados.get("restrito") === "true",
      });

    await db.documentoRH.create({
      data: {
        colaboradorId: d.colaboradorId,
        tipo: d.tipo,
        arquivo: d.arquivo ?? null,
        emitidoEm: d.emitidoEm,
        venceEm: d.venceEm,
        restrito: d.restrito,
      },
    });

    revalidatePath(`/rh/${d.colaboradorId}`);
    return { erro: null, ok: "Documento registrado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

export async function salvarContracheque(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1),
        competencia: competenciaZ,
        arquivo: z.string().trim().max(300).optional(),
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        competencia: dados.get("competencia"),
        arquivo: opcional(dados.get("arquivo")),
      });

    await db.contracheque.upsert({
      where: {
        colaboradorId_competencia: {
          colaboradorId: d.colaboradorId,
          competencia: d.competencia,
        },
      },
      update: { arquivo: d.arquivo ?? null, disponibilizadoEm: new Date() },
      create: {
        colaboradorId: d.colaboradorId,
        competencia: d.competencia,
        arquivo: d.arquivo ?? null,
        disponibilizadoEm: new Date(),
      },
    });

    revalidatePath(`/rh/${d.colaboradorId}`);
    return { erro: null, ok: "Contracheque disponibilizado." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}

/**
 * Rescisão é dado sensível e mexe no Financeiro: fica com o administrador e
 * com o RH, e o valor entra como título a pagar quando homologada.
 */
export async function salvarRescisao(_estado: Estado, dados: FormData): Promise<Estado> {
  try {
    const sessao = await exigir(PAPEIS_RH);
    const d = z
      .object({
        colaboradorId: z.string().min(1),
        motivo: z.string().trim().min(3, "Escreva o motivo").max(160),
        aviso: z.string().trim().max(60).optional(),
        dataDesligamento: dataObrigatoria,
        valorTotal: dinheiro,
        documento: z.string().trim().max(300).optional(),
        homologada: z.boolean(),
      })
      .parse({
        colaboradorId: dados.get("colaboradorId"),
        motivo: dados.get("motivo"),
        aviso: opcional(dados.get("aviso")),
        dataDesligamento: dados.get("dataDesligamento"),
        valorTotal: String(dados.get("valorTotal") ?? "0"),
        documento: opcional(dados.get("documento")),
        homologada: dados.get("homologada") === "on" || dados.get("homologada") === "true",
      });

    const colaborador = await db.colaborador.findUnique({
      where: { id: d.colaboradorId },
    });
    if (!colaborador) aviso("Colaborador não encontrado.");
    await exigirMesAberto(d.dataDesligamento);

    const rescisao = await db.rescisao.upsert({
      where: { colaboradorId: d.colaboradorId },
      update: {
        motivo: d.motivo,
        aviso: d.aviso ?? null,
        dataDesligamento: d.dataDesligamento,
        valorTotal: d.valorTotal,
        documento: d.documento ?? null,
        homologadaEm: d.homologada ? new Date() : null,
      },
      create: {
        colaboradorId: d.colaboradorId,
        motivo: d.motivo,
        aviso: d.aviso ?? null,
        dataDesligamento: d.dataDesligamento,
        valorTotal: d.valorTotal,
        documento: d.documento ?? null,
        homologadaEm: d.homologada ? new Date() : null,
      },
    });

    await db.colaborador.update({
      where: { id: d.colaboradorId },
      data: {
        status: StatusColaborador.DESLIGADO,
        desligamento: d.dataDesligamento,
      },
    });

    if (d.valorTotal > 0) {
      const existente = await db.titulo.findUnique({
        where: {
          origem_origemId: { origem: Origem.ACERTO, origemId: rescisao.id },
        },
        include: { baixas: true },
      });
      const base = {
        empresaId: await empresaPadrao(),
        direcao: Direcao.PAGAR,
        categoria: Categoria.SALARIOS,
        descricao: `Rescisão — ${colaborador.nome}`,
        valor: d.valorTotal,
        competencia: inicioDoMes(d.dataDesligamento),
        vencimento: new Date(d.dataDesligamento.getTime() + 10 * 24 * 60 * 60 * 1000),
        colaboradorId: d.colaboradorId,
      };
      if (existente) {
        if (existente.baixas.length === 0) {
          await db.titulo.update({ where: { id: existente.id }, data: base });
        }
      } else {
        await db.titulo.create({
          data: {
            ...base,
            origem: Origem.ACERTO,
            origemId: rescisao.id,
            criadoPorId: sessao.id,
          },
        });
      }
    }

    revalidatePath(`/rh/${d.colaboradorId}`);
    revalidatePath("/rh");
    revalidatePath("/pagar");
    return {
      erro: null,
      ok: "Rescisão salva. O colaborador ficou como desligado e o valor virou título a pagar.",
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha(e);
  }
}
