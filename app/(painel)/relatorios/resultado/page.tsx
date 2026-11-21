import { resultadoOperacional } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { ultimosMeses } from "@/lib/indicadores";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import {
  BarrasComSinal,
  Conferencia,
  LinhaDoDemonstrativo,
  SeletorDeMes,
  comSinal,
  mesLongo,
  pct,
} from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

export default async function ResultadoPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos, contasParaSaldo } = await carregarRelatorios();
  const r = resultadoOperacional(lancamentos, mes, contasParaSaldo);
  const meses = ultimosMeses(mes, 6);
  const serie = meses.map((m) => resultadoOperacional(lancamentos, m, contasParaSaldo));
  const pe = r.pontoDeEquilibrio;
  const escala = Math.max(r.faturamento, pe ?? 0, 1);

  return (
    <>
      <Cabecalho
        titulo="Resultado operacional"
        descricao="Competência: faturamento menos gastos variáveis dá a margem; menos os fixos dá o lucro da operação. Ao lado, quanto disso virou caixa."
        acao={<SeletorDeMes caminho="/relatorios/resultado" mes={mes} />}
      />

      <section className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
        <Numero rotulo="Lucro operacional" valor={r.lucroOperacional} sinal tom={r.lucroOperacional < 0 ? "ruim" : "bom"} nota="margem − gastos fixos" />
        <Numero rotulo="Ponto de equilíbrio" valor={pe ?? 0} nota={pe === null ? "não calculável: sem margem positiva" : "venda mínima para não ter prejuízo"} />
        <div className="min-w-0 border-t-2 border-foreground pt-3">
          <p className="rotulo">Margem de segurança</p>
          <p className={cn("num mt-2 text-[17px] font-medium leading-none sm:text-[22px] xl:text-[24px]", (r.margemDeSegurancaBps ?? 0) < 0 && "text-destructive")}>
            {pct(r.margemDeSegurancaBps)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">quanto a venda pode cair antes do prejuízo</p>
        </div>
        <Numero rotulo="Geração de caixa operacional" valor={r.caixaOperacional} sinal tom={r.caixaOperacional < 0 ? "ruim" : "neutro"} nota={`variação total do caixa: ${comSinal(r.caixaTotal)}`} />
      </section>

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo de {mesLongo(mes).toLowerCase()}</CardTitle>
            <span className="text-xs text-muted-foreground">gerencial</span>
          </CardHeader>
          <CardBody>
            <LinhaDoDemonstrativo rotulo="Faturamento" valor={r.faturamento} />
            <LinhaDoDemonstrativo rotulo="Gastos variáveis" valor={r.variaveis} sinal="menos" />
            <LinhaDoDemonstrativo rotulo="Margem de contribuição" nota={`taxa de ${pct(r.taxaBps)} sobre o faturamento`} valor={r.margem} tipo="subtotal" href="/relatorios/margem" />
            <LinhaDoDemonstrativo rotulo="Gastos fixos" valor={r.fixos} sinal="menos" href="/relatorios/gastos-fixos" />
            <LinhaDoDemonstrativo rotulo="Lucro operacional" valor={r.lucroOperacional} tipo="subtotal" />
            <LinhaDoDemonstrativo rotulo="Receita não operacional" valor={r.receitaNaoOperacional} sinal="mais" />
            <LinhaDoDemonstrativo rotulo="Resultado líquido" valor={r.resultadoLiquido} tipo="total" />
            <Conferencia ok={r.lucroOperacional === r.margem - r.fixos}>
              Lucro operacional = margem de contribuição − gastos fixos.
            </Conferencia>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Venda contra ponto de equilíbrio</CardTitle>
            </CardHeader>
            <CardBody>
              {pe === null ? (
                <p className="text-sm text-muted-foreground">
                  Não calculável: com margem de contribuição zero ou negativa, nenhuma venda cobre os gastos fixos.
                </p>
              ) : (
                <div className="space-y-4">
                  {[
                    ["Faturamento", r.faturamento, "bg-foreground"],
                    ["Ponto de equilíbrio", pe, "bg-[repeating-linear-gradient(135deg,hsl(var(--foreground))_0_2px,transparent_2px_5px)] ring-1 ring-inset ring-foreground"],
                  ].map(([rot, v, cls]) => (
                    <div key={rot as string}>
                      <div className="flex justify-between text-[13px]">
                        <span>{rot}</span>
                        <span className="num">{formatBRL(v as number)}</span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-[2px] bg-[hsl(var(--rule-soft))]">
                        <div className={cn("h-full rounded-[2px]", cls as string)} style={{ width: `${((v as number) / escala) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {r.faturamento >= pe
                      ? `A venda passou o ponto de equilíbrio em ${formatBRL(r.faturamento - pe)}.`
                      : `Faltaram ${formatBRL(pe - r.faturamento)} de venda para cobrir os gastos fixos.`}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lucro operacional, 6 meses</CardTitle>
            </CardHeader>
            <CardBody>
              <BarrasComSinal meses={meses} valores={serie.map((s) => s.lucroOperacional)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
