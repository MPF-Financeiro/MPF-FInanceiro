import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeRH, sessaoAtual } from "@/lib/permissoes";
import { competenciaDe, hojeUTC, inicioDoMes, paraInputMonth } from "@/lib/mes";
import { competenciaFechada } from "@/lib/fechamento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cabecalho } from "@/components/financeiro/pagina";
import { AbrirFolha, Folha } from "@/components/financeiro/folha-ui";

export const dynamic = "force-dynamic";

export default async function FolhaPage({
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

  const [folha, fechado] = await Promise.all([
    db.folha.findUnique({
      where: { competencia },
      include: { itens: { include: { colaborador: true }, orderBy: { colaborador: { nome: "asc" } } } },
    }),
    competenciaFechada(competencia),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Folha"
        descricao={
          fechado
            ? "Esta competência está fechada no Financeiro: a folha não pode mais ser mexida."
            : "A folha é montada aqui e vai para o Financeiro como uma conta a pagar por colaborador."
        }
        acao={
          <form method="get" action="/financeiro/rh/folha" className="flex items-end gap-2">
            <Input
              type="month"
              name="competencia"
              defaultValue={paraInputMonth(competencia)}
              className="w-40"
              aria-label="Competência"
            />
            <Button type="submit" variant="outline">
              Ver
            </Button>
            <Button asChild variant="ghost">
              <Link href="/rh">Voltar ao RH</Link>
            </Button>
          </form>
        }
      />
      {folha ? (
        <Folha
          folha={{
            id: folha.id,
            competencia: folha.competencia,
            fechadaEm: folha.fechadaEm,
            enviadaEm: folha.enviadaEm,
            itens: folha.itens.map((i) => ({
              id: i.id,
              colaborador: i.colaborador.nome,
              salarioBruto: i.salarioBruto,
              bonificacoes: i.bonificacoes,
              horasExtras: i.horasExtras,
              adiantamentos: i.adiantamentos,
              inss: i.inss,
              irrf: i.irrf,
              outrosDescontos: i.outrosDescontos,
              valeAlimentacao: i.valeAlimentacao,
              valeTransporte: i.valeTransporte,
              liquido: i.liquido,
            })),
          }}
          podeEscrever={!fechado}
        />
      ) : (
        <AbrirFolha competencia={paraInputMonth(competencia)} />
      )}
    </>
  );
}
