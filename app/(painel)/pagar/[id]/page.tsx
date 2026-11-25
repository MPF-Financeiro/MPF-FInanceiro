import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { buscarTitulo, opcoesDeLancamento } from "@/lib/consultas";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, paraInputDate } from "@/lib/mes";
import { competenciaFechada } from "@/lib/fechamento";
import { Cabecalho } from "@/components/financeiro/pagina";
import { DetalheTitulo } from "@/components/financeiro/detalhe-titulo";
import { ClassificacaoDoTitulo } from "@/components/financeiro/classificacao-titulo";
import { classificar } from "@/lib/classificacao";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TituloPagarPage({ params }: { params: { id: string } }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const titulo = await buscarTitulo(params.id);
  if (!titulo || titulo.direcao !== "PAGAR") notFound();

  const [opcoes, fechado] = await Promise.all([
    opcoesDeLancamento(),
    competenciaFechada(titulo.competencia),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Conta a pagar"
        descricao={
          fechado
            ? "A competência deste título está fechada: para corrigir, lance um estorno no mês aberto."
            : undefined
        }
        acao={
          <Button asChild variant="outline">
            <Link href="/pagar">Voltar para a lista</Link>
          </Button>
        }
      />
      <DetalheTitulo
        titulo={titulo}
        contas={opcoes.contas}
        hoje={paraInputDate(hojeUTC())}
        podeEscrever={podeLancar(sessao.papel) && !fechado}
      />
      <div className="mt-6">
        <ClassificacaoDoTitulo
          id={titulo.id}
          direcao={titulo.direcao}
          escolhido={{
            atividade: titulo.atividade,
            natureza: titulo.natureza,
            grupo: titulo.grupo,
            unidadeId: titulo.unidadeId,
            naoOperacional: titulo.naoOperacional,
          }}
          efetivo={classificar(titulo)}
          nomeDaUnidade={opcoes.unidades.find((u) => u.id === titulo.unidadeId)?.nome ?? "Sem BU"}
          unidades={opcoes.unidades}
          podeEditar={podeLancar(sessao.papel)}
        />
      </div>
    </>
  );
}
