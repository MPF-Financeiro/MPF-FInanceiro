import Link from "next/link";
import { resumoDaOperacao, type Pendencia } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { formatBRL } from "@/lib/money";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho } from "@/components/financeiro/pagina";
import { BarraDeRealizacao } from "@/components/financeiro/graficos";
import { SeletorDeMes, mesLongo } from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

function ListaDePendencias({ itens, href, vazio }: { itens: Pendencia[]; href: string; vazio: string }) {
  if (itens.length === 0) return <p className="py-4 text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul>
      {itens.map((p) => (
        <li key={p.id} className="border-b border-[hsl(var(--rule-soft))] last:border-b-0">
          <Link href={`${href}/${p.id}`} className="flex items-baseline gap-4 py-2.5 text-[13px] hover:bg-muted/60">
            <span className="num w-11 shrink-0 text-muted-foreground">{dataCurta(p.vencimento)}</span>
            <span className="min-w-0 flex-1 truncate">
              {p.quem ? <span className="font-medium">{p.quem} · </span> : null}
              {p.descricao}
            </span>
            <span className="num shrink-0">{formatBRL(p.pendente)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ResumoPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos } = await carregarRelatorios();
  const r = resumoDaOperacao(lancamentos, mes);

  return (
    <>
      <Cabecalho
        titulo="Resumo da operação"
        descricao="Competência contra caixa: o que foi vendido e gasto no mês, ao lado do que de fato entrou e saiu da conta. A diferença é o que ficou para receber e para pagar."
        acao={<SeletorDeMes caminho="/relatorios/resumo" mes={mes} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            {
              titulo: "Vendas × recebimentos",
              comp: r.vendas,
              caixa: r.recebimentos,
              rotComp: "Vendido no mês",
              rotCaixa: "Recebido no mês",
              pendTitulo: "Não recebido",
              pend: r.naoRecebidos,
              total: r.totalNaoRecebido,
              href: "/receber",
              vazio: "Tudo o que foi vendido no mês já foi recebido.",
            },
            {
              titulo: "Gastos × pagamentos",
              comp: r.gastos,
              caixa: r.pagamentos,
              rotComp: "Gasto no mês",
              rotCaixa: "Pago no mês",
              pendTitulo: "Não pago",
              pend: r.naoPagos,
              total: r.totalNaoPago,
              href: "/pagar",
              vazio: "Tudo o que foi gasto no mês já foi pago.",
            },
          ] as const
        ).map((b) => (
          <Card key={b.titulo}>
            <CardHeader>
              <CardTitle>{b.titulo}</CardTitle>
              <span className="text-xs text-muted-foreground">{mesLongo(mes)}</span>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-6">
                <div className="border-t-2 border-foreground pt-3">
                  <dt className="rotulo">{b.rotComp}</dt>
                  <dd className="num mt-2 text-[20px] font-medium leading-none">{formatBRL(b.comp)}</dd>
                  <dd className="mt-1.5 text-xs text-muted-foreground">competência</dd>
                </div>
                <div className="border-t-2 border-foreground pt-3">
                  <dt className="rotulo">{b.rotCaixa}</dt>
                  <dd className="num mt-2 text-[20px] font-medium leading-none">{formatBRL(b.caixa)}</dd>
                  <dd className="mt-1.5 text-xs text-muted-foreground">caixa, de qualquer mês</dd>
                </div>
              </dl>
              <div className="mt-6">
                <BarraDeRealizacao
                  rotulo={`Do que é de ${mesLongo(mes).split(" ")[0].toLowerCase()}`}
                  total={b.comp}
                  realizado={b.comp - b.total}
                  realizadoRotulo="já andou"
                  faltaRotulo={b.pendTitulo.toLowerCase()}
                />
              </div>
              <div className="mt-6 flex items-baseline justify-between border-b border-foreground/80 pb-2">
                <p className="text-[13px] font-semibold">{b.pendTitulo}, por vencimento</p>
                <p className="num text-[13px] font-semibold text-destructive">{formatBRL(b.total)}</p>
              </div>
              <ListaDePendencias itens={b.pend} href={b.href} vazio={b.vazio} />
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
