import Link from "next/link";
import { GRUPO, GRUPOS } from "@/lib/classificacao";
import { gastosFixosDoMes } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { ultimosMeses } from "@/lib/indicadores";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import { BarrasHorizontais, emMil } from "@/components/financeiro/graficos";
import { Conferencia, SeletorDeMes, mesCurto, mesLongo } from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

export default async function GastosFixosPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos } = await carregarRelatorios();
  const meses = ultimosMeses(mes, 6);
  const serie = meses.map((m) => gastosFixosDoMes(lancamentos, m));
  const atual = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const media = Math.round(serie.slice(0, -1).reduce((a, s) => a + s.total, 0) / Math.max(1, serie.length - 1));
  const variacao = anterior.total ? Math.round(((atual.total - anterior.total) / anterior.total) * 100) : null;
  const usados = GRUPOS.filter((g) => serie.some((s) => s.porGrupo[g] > 0));
  const somaGrupos = Object.values(atual.porGrupo).reduce((a, v) => a + v, 0);
  const maiorCelula = Math.max(...serie.flatMap((s) => usados.map((g) => s.porGrupo[g])), 1);

  return (
    <>
      <Cabecalho
        titulo="Gastos fixos"
        descricao="Regime de competência: o gasto fixo pertence ao mês em que foi lançado, pago ou não. Custo de pessoal vai sempre para Pessoal."
        acao={<SeletorDeMes caminho="/relatorios/gastos-fixos" mes={mes} />}
      />

      <section className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
        <Numero rotulo={`Gasto fixo de ${mesCurto(mes)}`} valor={atual.total} />
        <Numero
          rotulo="Contra o mês anterior"
          valor={atual.total - anterior.total}
          sinal
          tom={atual.total > anterior.total ? "ruim" : "neutro"}
          nota={variacao === null ? "sem mês anterior" : `${variacao >= 0 ? "▲" : "▼"} ${Math.abs(variacao)}%`}
        />
        <Numero rotulo="Média dos 5 meses antes" valor={media} />
        <Numero rotulo="Maior grupo" valor={Math.max(...Object.values(atual.porGrupo))} nota={GRUPO[GRUPOS.reduce((a, g) => (atual.porGrupo[g] > atual.porGrupo[a] ? g : a), GRUPOS[0])]} />
      </section>

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{mesLongo(mes)}, por grupo</CardTitle>
            <span className="text-xs text-muted-foreground">os 10 grupos da diretoria</span>
          </CardHeader>
          <CardBody>
            {atual.total === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nenhum gasto fixo lançado neste mês.</p>
            ) : (
              <BarrasHorizontais
                total={atual.total}
                linhas={GRUPOS.filter((g) => atual.porGrupo[g] > 0)
                  .sort((a, b) => atual.porGrupo[b] - atual.porGrupo[a])
                  .map((g) => ({ rotulo: GRUPO[g], valor: atual.porGrupo[g] }))}
              />
            )}
            <div className="mt-4 flex items-baseline justify-between border-t-2 border-foreground pt-2.5 text-[13px] font-semibold">
              <span>Total</span>
              <span className="num">{formatBRL(atual.total)}</span>
            </div>
            <Conferencia ok={somaGrupos === atual.total}>
              A soma dos grupos ({formatBRL(somaGrupos)}) é o total de gastos fixos do mês.
            </Conferencia>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação mês a mês</CardTitle>
            <span className="text-xs text-muted-foreground">quanto mais escura a casa, maior o gasto</span>
          </CardHeader>
          <CardBody>
            <div className="relative -mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th scope="col" className="rotulo border-b border-foreground/80 pb-2 text-start">Grupo · R$ mil</th>
                    {meses.map((m, i) => (
                      <th key={m.toISOString()} scope="col" className={cn("rotulo border-b border-foreground/80 pb-2 text-end", i === meses.length - 1 && "text-foreground")}>
                        {mesCurto(m)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usados.map((g) => (
                    <tr key={g}>
                      <th scope="row" className="border-b border-[hsl(var(--rule-soft))] py-1.5 pe-3 text-start font-normal">{GRUPO[g]}</th>
                      {serie.map((s) => {
                        const v = s.porGrupo[g];
                        const forca = v / maiorCelula;
                        return (
                          <td
                            key={s.mes.toISOString()}
                            title={`${GRUPO[g]}, ${mesCurto(s.mes)}: ${formatBRL(v)}`}
                            className="num whitespace-nowrap border-b border-s-2 border-[hsl(var(--rule-soft))] border-s-card px-2 py-1.5 text-end"
                            style={{
                              background: v ? `hsl(var(--brand) / ${0.06 + forca * 0.5})` : undefined,
                              color: forca > 0.55 ? "white" : undefined,
                            }}
                          >
                            {v ? emMil(v) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <th scope="row" className="border-t-2 border-foreground py-2 text-start">Total</th>
                    {serie.map((s) => (
                      <td key={s.mes.toISOString()} className="num whitespace-nowrap border-t-2 border-foreground px-2 py-2 text-end">
                        {emMil(s.total)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Os lançamentos de cada grupo</CardTitle>
          <span className="text-xs text-muted-foreground">clique para abrir</span>
        </CardHeader>
        <CardBody className="divide-y divide-[hsl(var(--rule-soft))] py-0">
          {GRUPOS.filter((g) => atual.porGrupo[g] > 0).map((g) => {
            const itens = atual.lancamentos.filter((l) => l.grupo === g);
            return (
              <details key={g} className="group py-3">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-1 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span>
                    <span aria-hidden className="me-2 inline-block w-3 text-muted-foreground transition-transform group-open:rotate-90">›</span>
                    {GRUPO[g]}
                    <span className="ms-2 text-xs font-normal text-muted-foreground">{itens.length} {itens.length === 1 ? "lançamento" : "lançamentos"}</span>
                  </span>
                  <span className="num whitespace-nowrap">{formatBRL(atual.porGrupo[g])}</span>
                </summary>
                <ul className="mt-2 ps-5">
                  {itens.map((l) => (
                    <li key={l.id} className="border-b border-[hsl(var(--rule-soft))] last:border-b-0">
                      <Link href={`/pagar/${l.id}`} className="flex items-baseline gap-4 py-2 text-[13px] hover:bg-muted/60">
                        <span className="min-w-0 flex-1 truncate">
                          {l.quem ? <span className="font-medium">{l.quem} · </span> : null}
                          {l.descricao}
                        </span>
                        <span className="num shrink-0">{formatBRL(l.valor)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}
