import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeRH, podeVerRemuneracao, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, inicioDoMes, paraInputDate, paraInputMonth } from "@/lib/mes";
import { formatBRL } from "@/lib/money";
import { STATUS_COLABORADOR } from "@/lib/rotulos";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho } from "@/components/financeiro/pagina";
import {
  DocumentosEContracheques,
  Exames,
  Ferias,
  RescisaoCard,
} from "@/components/financeiro/ficha-ui";

export const dynamic = "force-dynamic";

export default async function FichaPage({ params }: { params: { id: string } }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeRH(sessao.papel)) redirect("/");

  const colaborador = await db.colaborador.findUnique({
    where: { id: params.id },
    include: {
      ferias: { orderBy: { inicio: "desc" } },
      exames: { orderBy: { realizado: "desc" } },
      documentos: { orderBy: { emitidoEm: "desc" } },
      contracheques: { orderBy: { competencia: "desc" } },
      rescisao: true,
    },
  });
  if (!colaborador) notFound();

  const hoje = hojeUTC();
  const hojeTexto = paraInputDate(hoje);

  return (
    <>
      <Cabecalho
        titulo={colaborador.nome}
        descricao={`${colaborador.cargo}${colaborador.setor ? ` · ${colaborador.setor}` : ""} · ${STATUS_COLABORADOR[colaborador.status]}`}
        acao={
          <Button asChild variant="outline">
            <Link href="/rh">Voltar ao RH</Link>
          </Button>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do contrato</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Dado rotulo="Admissão">{paraInputDate(colaborador.admissao).split("-").reverse().join("/")}</Dado>
              <Dado rotulo="Desligamento">
                {colaborador.desligamento
                  ? paraInputDate(colaborador.desligamento).split("-").reverse().join("/")
                  : "—"}
              </Dado>
              {podeVerRemuneracao(sessao.papel) ? (
                <Dado rotulo="Salário">{formatBRL(colaborador.salario)}</Dado>
              ) : null}
              <Dado rotulo="E-mail">{colaborador.email ?? "—"}</Dado>
            </dl>
          </CardBody>
        </Card>

        <Ferias
          colaboradorId={colaborador.id}
          ferias={colaborador.ferias}
          hoje={hojeTexto}
          podeEscrever
        />

        <Exames
          colaboradorId={colaborador.id}
          exames={colaborador.exames.map((e) => ({
            id: e.id,
            tipo: e.tipo,
            realizado: e.realizado,
            proximo: e.proximo,
            clinica: e.clinica,
            apto: e.apto,
            temLaudo: Boolean(e.laudo),
            custo: e.custo,
            vencido: Boolean(e.proximo && e.proximo < hoje),
          }))}
          hoje={hojeTexto}
          podeEscrever
        />

        <DocumentosEContracheques
          colaboradorId={colaborador.id}
          documentos={colaborador.documentos.map((d) => ({
            id: d.id,
            tipo: d.tipo,
            arquivo: d.arquivo,
            emitidoEm: d.emitidoEm,
            venceEm: d.venceEm,
            restrito: d.restrito,
            vencido: Boolean(d.venceEm && d.venceEm < hoje),
          }))}
          contracheques={colaborador.contracheques}
          competencia={paraInputMonth(inicioDoMes(hoje))}
          podeEscrever
        />

        <RescisaoCard
          colaboradorId={colaborador.id}
          rescisao={
            colaborador.rescisao
              ? {
                  motivo: colaborador.rescisao.motivo,
                  aviso: colaborador.rescisao.aviso,
                  dataDesligamento: colaborador.rescisao.dataDesligamento,
                  homologadaEm: colaborador.rescisao.homologadaEm,
                  valorTotal: colaborador.rescisao.valorTotal,
                }
              : null
          }
          hoje={hojeTexto}
          podeEscrever={podeVerRemuneracao(sessao.papel)}
        />
      </div>
    </>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
