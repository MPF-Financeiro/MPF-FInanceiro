import Link from "next/link";
import { margemPorUnidade } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { ultimosMeses } from "@/lib/indicadores";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import { Conferencia, SeletorDeMes, mesCurto, pct } from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

export default async function MargemPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos, nomeDaUnidade, unidades } = await carregarRelatorios();
  const m = margemPorUnidade(lancamentos, mes);
  const somaMargens = m.unidades.reduce((a, u) => a + u.margem, 0);
  const meses = ultimosMeses(mes, 6);
  const historico = meses.map((x) => margemPorUnidade(lancamentos, x).consolidado);
  const maiorVenda = Math.max(...m.unidades.map((u) => u.vendas), 1);
  const semBu = m.unidades.find((u) => u.unidadeId === null);

  return (
    <>
      <Cabecalho
        titulo="Margem de contribuição por BU"
        descricao="Quanto sobra de cada venda depois dos gastos variáveis dela, por unidade de negócio. Gasto fixo não é rateado entre as BUs: ele entra só no resultado."
        acao={<SeletorDeMes caminho="/relatorios/margem" mes={mes} />}
      />

      <section className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
        <Numero rotulo="Vendas" valor={m.consolidado.vendas} nota="competência do mês" />
        <Numero rotulo="Gastos variáveis" valor={m.consolidado.variaveis} tom="ruim" />
        <Numero rotulo="Margem de contribuição" valor={m.consolidado.margem} tom={m.consolidado.margem < 0 ? "ruim" : "bom"} />
        <div className="min-w-0 border-t-2 border-foreground pt-3">
          <p className="rotulo">Taxa de margem</p>
          <p className="num mt-2 text-[17px] font-medium leading-none sm:text-[22px] xl:text-[24px]">{pct(m.consolidado.taxaBps)}</p>
          <p className="mt-2 text-xs text-muted-foreground">margem ÷ vendas</p>
        </div>
      </section>

      {unidades.length === 0 ? (
        <p className="mt-5 rounded-[4px] border border-dashed border-input bg-card/60 px-4 py-3 text-[13px] text-muted-foreground">
          Nenhuma unidade de negócio cadastrada: tudo aparece como “Sem BU”. Cadastre as BUs em{" "}
          <Link href="/cadastros" className="text-brand underline underline-offset-4">Cadastros</Link> e
          classifique as vendas.
        </p>
      ) : null}

      <Card className="mt-9">
        <CardHeader>
          <CardTitle>Por unidade de negócio</CardTitle>
          <span className="text-xs text-muted-foreground">a barra é a venda; a parte escura é o que sobra</span>
        </CardHeader>
        <CardBody>
          <div className="relative -mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[480px] sm:min-w-[720px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {["Unidade", "", "Vendas", "Variáveis", "Margem", "Taxa"].map((h, i) => (
                    <th key={i} scope="col" className={cn("rotulo border-b border-foreground/80 pb-2 pe-4", i >= 2 ? "text-end" : "text-start", i === 1 && "hidden w-[34%] sm:table-cell")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.unidades.map((u) => {
                  const larg = (u.vendas / maiorVenda) * 100;
                  const parteMargem = u.vendas > 0 ? Math.max(0, (u.margem / u.vendas) * 100) : 0;
                  return (
                    <tr key={u.unidadeId ?? "sem"}>
                      <th scope="row" className={cn("border-b border-[hsl(var(--rule-soft))] py-3 pe-4 text-start font-medium", u.unidadeId === null && "font-normal italic text-muted-foreground")}>
                        {nomeDaUnidade(u.unidadeId)}
                      </th>
                      <td className="hidden border-b border-[hsl(var(--rule-soft))] pe-4 sm:table-cell" aria-hidden>
                        <div className="h-3 rounded-[2px] bg-[hsl(var(--rule-soft))]" style={{ width: `${larg}%` }}>
                          <div className="h-full rounded-[2px] bg-foreground" style={{ width: `${parteMargem}%` }} />
                        </div>
                      </td>
                      <td className="num border-b border-[hsl(var(--rule-soft))] pe-4 text-end">{formatBRL(u.vendas)}</td>
                      <td className="num border-b border-[hsl(var(--rule-soft))] pe-4 text-end text-destructive">− {formatBRL(u.variaveis)}</td>
                      <td className={cn("num border-b border-[hsl(var(--rule-soft))] pe-4 text-end font-semibold", u.margem < 0 && "text-destructive")}>{formatBRL(u.margem)}</td>
                      <td className="num border-b border-[hsl(var(--rule-soft))] text-end">{pct(u.taxaBps)}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <th scope="row" className="border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground py-3 text-start">Consolidado</th>
                  <td className="hidden border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground sm:table-cell" />
                  <td className="num border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground pe-4 text-end">{formatBRL(m.consolidado.vendas)}</td>
                  <td className="num border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground pe-4 text-end text-destructive">− {formatBRL(m.consolidado.variaveis)}</td>
                  <td className="num border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground pe-4 text-end">{formatBRL(m.consolidado.margem)}</td>
                  <td className="num border-b-[3px] border-t-2 border-double border-b-foreground border-t-foreground text-end">{pct(m.consolidado.taxaBps)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Conferencia ok={somaMargens === m.consolidado.margem}>
            A soma das margens das BUs ({formatBRL(somaMargens)}) é a margem consolidada.
          </Conferencia>
          {semBu && semBu.vendas > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatBRL(semBu.vendas)} em vendas ainda sem BU. Abra o lançamento e escolha a unidade em
              “Classificação para os relatórios”.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Taxa de margem, últimos 6 meses</CardTitle>
          <span className="text-xs text-muted-foreground">consolidado</span>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0,1fr))` }}>
            {historico.map((h, i) => {
              const t = h.taxaBps ?? 0;
              return (
                <div key={meses[i].toISOString()} className="flex flex-col items-center" title={`${mesCurto(meses[i])}: ${pct(h.taxaBps)}`}>
                  <span className="num mb-1 text-[12px]">{pct(h.taxaBps)}</span>
                  <div className="flex h-24 w-full items-end justify-center">
                    <div className="w-[40%] max-w-8 rounded-t-[3px] bg-foreground" style={{ height: `${Math.max(0, Math.min(100, t / 100))}%` }} />
                  </div>
                  <div className="h-px w-full bg-foreground/70" />
                  <span className={cn("mt-1 text-[11px]", i === meses.length - 1 ? "font-semibold" : "text-muted-foreground")}>{mesCurto(meses[i])}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
