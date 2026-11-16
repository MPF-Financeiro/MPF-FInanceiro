import Link from "next/link";
import { redirect } from "next/navigation";
import { Origem } from "@prisma/client";
import { db } from "@/lib/db";
import { podeRH, podeVerRemuneracao, sessaoAtual } from "@/lib/permissoes";
import { competenciaDe, hojeUTC, inicioDoMes, paraInputDate, paraInputMonth } from "@/lib/mes";
import { Button } from "@/components/ui/button";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Beneficios, Bonificacoes, Colaboradores } from "@/components/financeiro/rh-ui";

export const dynamic = "force-dynamic";

export default async function RHPage({
  searchParams,
}: {
  searchParams: { competencia?: string };
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeRH(sessao.papel)) redirect("/");

  const competencia = searchParams.competencia
    ? (competenciaDe(searchParams.competencia) ?? inicioDoMes(hojeUTC()))
    : inicioDoMes(hojeUTC());

  const [colaboradores, beneficios, bonificacoes, titulosDeBeneficio] = await Promise.all([
    db.colaborador.findMany({ orderBy: [{ status: "asc" }, { nome: "asc" }] }),
    db.beneficioMensal.findMany({
      where: { competencia },
      orderBy: { tipo: "asc" },
      include: { colaborador: true },
    }),
    db.bonificacao.findMany({ where: { competencia }, include: { colaborador: true } }),
    db.titulo.findMany({
      where: { origem: Origem.BENEFICIO, competencia },
      select: { origemId: true, baixas: { select: { valor: true } } },
    }),
  ]);

  const porOrigem = new Map(titulosDeBeneficio.map((t) => [t.origemId, t]));
  const ativos = colaboradores
    .filter((c) => c.status !== "DESLIGADO")
    .map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <>
      <Cabecalho
        titulo="RH"
        descricao="Quem trabalha na Samps, os benefícios do mês e as bonificações por conta trazida."
        acao={
          <Button asChild variant="outline">
            <Link href="/rh/folha">Folha do mês</Link>
          </Button>
        }
      />
      <div className="space-y-6">
        <Colaboradores
          colaboradores={colaboradores.map((c) => ({
            id: c.id,
            nome: c.nome,
            cargo: c.cargo,
            setor: c.setor,
            admissao: c.admissao,
            salario: c.salario,
            status: c.status,
            cpf: c.cpf,
            email: c.email,
          }))}
          hoje={paraInputDate(hojeUTC())}
          podeVerRemuneracao={podeVerRemuneracao(sessao.papel)}
        />
        <Beneficios
          beneficios={beneficios.map((b) => {
            const titulo = porOrigem.get(b.id);
            return {
              id: b.id,
              colaborador: b.colaborador.nome,
              tipo: b.tipo,
              previsto: b.previsto,
              temTitulo: Boolean(titulo),
              pago: (titulo?.baixas.reduce((a, x) => a + x.valor, 0) ?? 0) >= b.previsto,
            };
          })}
          colaboradores={ativos}
          competencia={paraInputMonth(competencia)}
          hoje={paraInputDate(hojeUTC())}
        />
        <Bonificacoes
          bonificacoes={bonificacoes.map((b) => ({
            id: b.id,
            colaborador: b.colaborador.nome,
            referencia: b.referencia,
            valorConta: b.valorConta,
            valor: b.valor,
            naFolha: b.naFolha,
          }))}
          colaboradores={ativos}
          competencia={paraInputMonth(competencia)}
        />
      </div>
    </>
  );
}
