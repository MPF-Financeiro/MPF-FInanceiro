import Link from "next/link";
import { Direcao } from "@prisma/client";
import { listarTitulos, type FiltroTitulos } from "@/lib/consultas";
import { competenciaDe } from "@/lib/mes";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { Button } from "@/components/ui/button";
import { Cabecalho } from "@/components/financeiro/pagina";
import { FiltroTitulos as Filtro, ListaTitulos } from "@/components/financeiro/lista-titulos";

export const dynamic = "force-dynamic";

export default async function PagarPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; competencia?: string };
}) {
  const sessao = await sessaoAtual();
  const filtro: FiltroTitulos = {
    q: searchParams.q,
    status: (searchParams.status as FiltroTitulos["status"]) ?? "TODOS",
    competencia: searchParams.competencia ? competenciaDe(searchParams.competencia) : null,
  };
  const titulos = await listarTitulos(Direcao.PAGAR, filtro);

  return (
    <>
      <Cabecalho
        titulo="Contas a pagar"
        descricao="Status não é digitado: sai do valor, das baixas e da data de vencimento. Um pagamento parcial deixa o título aberto pelo saldo."
        acao={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a
                href={`/financeiro/api/exportar/pagar${
                  searchParams.competencia ? `?competencia=${searchParams.competencia}` : ""
                }`}
              >
                Exportar CSV
              </a>
            </Button>
            {sessao && podeLancar(sessao.papel) ? (
              <Button asChild>
                <Link href="/pagar/novo">Lançar conta a pagar</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="mb-6">
        <Filtro
          base="/financeiro/pagar"
          q={searchParams.q}
          status={searchParams.status}
          competencia={searchParams.competencia}
        />
      </div>
      <ListaTitulos direcao={Direcao.PAGAR} titulos={titulos} base="/pagar" />
    </>
  );
}
