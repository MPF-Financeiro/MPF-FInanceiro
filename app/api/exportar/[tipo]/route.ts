import { NextResponse } from "next/server";
import { Direcao } from "@prisma/client";
import { db } from "@/lib/db";
import { listarTitulos } from "@/lib/consultas";
import { podeLancar, podeVerRemuneracao, sessaoAtual } from "@/lib/permissoes";
import { competenciaDe, fimDoMes, inicioDoMes } from "@/lib/mes";
import { CATEGORIA, FORMA, ORIGEM } from "@/lib/rotulos";
import { dataCSV, montarCSV, reaisCSV } from "@/lib/csv";

const STATUS: Record<string, string> = {
  ABERTO: "Em aberto",
  PARCIAL: "Parcial",
  QUITADO: "Quitado",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
};

/**
 * Exportação em CSV. CPF, laudo e documento de colaborador não saem daqui:
 * planilha exportada circula por e-mail, e dado sensível não deve circular.
 */
export async function GET(
  pedido: Request,
  { params }: { params: { tipo: string } }
) {
  const sessao = await sessaoAtual();
  if (!sessao) return new NextResponse("Entre para exportar.", { status: 401 });

  const url = new URL(pedido.url);
  const competencia = url.searchParams.get("competencia")
    ? competenciaDe(url.searchParams.get("competencia") as string)
    : null;

  let nome = "";
  let csv = "";

  if (params.tipo === "receber" || params.tipo === "pagar") {
    if (!podeLancar(sessao.papel) && sessao.papel !== "LEITURA") {
      return new NextResponse("Seu acesso não permite esta exportação.", { status: 403 });
    }
    const direcao = params.tipo === "receber" ? Direcao.RECEBER : Direcao.PAGAR;
    const titulos = await listarTitulos(direcao, { competencia });
    nome = `contas-a-${params.tipo}`;
    csv = montarCSV(
      [
        "Competência",
        "Vencimento",
        direcao === Direcao.RECEBER ? "Cliente" : "Fornecedor",
        "Descrição",
        "Categoria",
        "Origem",
        "Forma",
        "Valor",
        direcao === Direcao.RECEBER ? "Recebido" : "Pago",
        "Pendente",
        "Status",
      ],
      titulos.map((t) => [
        `${String(t.competencia.getUTCMonth() + 1).padStart(2, "0")}/${t.competencia.getUTCFullYear()}`,
        dataCSV(t.vencimento),
        direcao === Direcao.RECEBER ? (t.cliente?.nome ?? "") : (t.fornecedor?.nome ?? ""),
        t.descricao,
        CATEGORIA[t.categoria],
        ORIGEM[t.origem],
        t.forma ? FORMA[t.forma] : "",
        reaisCSV(t.valor),
        reaisCSV(t.recebido),
        reaisCSV(t.pendente),
        STATUS[t.status],
      ])
    );
  } else if (params.tipo === "vendas") {
    if (!podeLancar(sessao.papel) && sessao.papel !== "LEITURA") {
      return new NextResponse("Seu acesso não permite esta exportação.", { status: 403 });
    }
    const vendas = await db.vendaSite.findMany({
      where: competencia
        ? { data: { gte: inicioDoMes(competencia), lt: fimDoMes(competencia) } }
        : {},
      include: { curso: true, cupom: true },
      orderBy: { data: "asc" },
    });
    nome = "vendas-do-site";
    csv = montarCSV(
      [
        "Data",
        "Aluno",
        "Curso",
        "Meio",
        "Parcelas",
        "Bruto",
        "Cupom",
        "Desconto",
        "Nota fiscal",
        "Taxa",
        "Líquido",
      ],
      vendas.map((v) => [
        dataCSV(v.data),
        v.aluno,
        v.curso?.nome ?? v.descricao ?? "",
        v.meio === "PIX" ? "PIX" : "Cartão",
        v.parcelas,
        reaisCSV(v.bruto),
        v.cupom?.codigo ?? "",
        reaisCSV(v.descontoCupom),
        reaisCSV(v.nota),
        reaisCSV(v.taxa),
        reaisCSV(v.liquido),
      ])
    );
  } else if (params.tipo === "folha") {
    if (!podeVerRemuneracao(sessao.papel)) {
      return new NextResponse("Seu acesso não permite esta exportação.", { status: 403 });
    }
    if (!competencia) {
      return new NextResponse("Informe a competência da folha.", { status: 400 });
    }
    const folha = await db.folha.findUnique({
      where: { competencia },
      include: { itens: { include: { colaborador: true } } },
    });
    if (!folha) return new NextResponse("Não existe folha nessa competência.", { status: 404 });
    nome = `folha-${competencia.getUTCFullYear()}-${String(competencia.getUTCMonth() + 1).padStart(2, "0")}`;
    csv = montarCSV(
      [
        "Colaborador",
        "Cargo",
        "Salário bruto",
        "Horas extras",
        "Bonificações",
        "INSS",
        "IRRF",
        "Adiantamentos",
        "Outros descontos",
        "Vale-alimentação",
        "Vale-transporte",
        "Líquido",
      ],
      folha.itens.map((i) => [
        i.colaborador.nome,
        i.colaborador.cargo,
        reaisCSV(i.salarioBruto),
        reaisCSV(i.horasExtras),
        reaisCSV(i.bonificacoes),
        reaisCSV(i.inss),
        reaisCSV(i.irrf),
        reaisCSV(i.adiantamentos),
        reaisCSV(i.outrosDescontos),
        reaisCSV(i.valeAlimentacao),
        reaisCSV(i.valeTransporte),
        reaisCSV(i.liquido),
      ])
    );
  } else {
    return new NextResponse("Exportação desconhecida.", { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
