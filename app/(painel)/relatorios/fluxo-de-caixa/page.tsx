import Link from "next/link";
import { ATIVIDADE, ATIVIDADE_EXPLICA } from "@/lib/classificacao";
import { fluxoDoMes } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { ultimosMeses } from "@/lib/indicadores";
import { formatBRL } from "@/lib/money";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import {
  BarrasComSinal,
  Conferencia,
  LinhaDoDemonstrativo,
  SeletorDeMes,
  comSinal,
  mesLongo,
} from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

const DE = { OPERACIONAL: "da operação", INVESTIMENTO: "de investimento", FINANCIAMENTO: "de financiamento" } as const;
const CAIXA = { OPERACIONAL: "das operações", INVESTIMENTO: "dos investimentos", FINANCIAMENTO: "dos financiamentos" } as const;

export default async function FluxoDeCaixaPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos, contasParaSaldo, contas } = await carregarRelatorios();
  const f = fluxoDoMes(lancamentos, mes, contasParaSaldo);
  const meses = ultimosMeses(mes, 6);
  const historico = meses.map((m) => fluxoDoMes(lancamentos, m, contasParaSaldo));
  const somaAtividades = f.atividades.reduce((a, l) => a + l.liquido, 0);
  const semSaldoInicial = contas.every((c) => !c.saldoInicialEm && c.saldoInicial === 0);

  return (
    <>
      <Cabecalho
        titulo="Fluxo de caixa"
        descricao="Regime de caixa: o que andou na conta no mês, pela data do pagamento ou do recebimento, separado pela atividade que gerou o dinheiro."
        acao={<SeletorDeMes caminho="/relatorios/fluxo-de-caixa" mes={mes} />}
      />

      <section className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
        <Numero rotulo="Saldo inicial" valor={f.saldoInicial} nota={`em 1º de ${mesLongo(mes).toLowerCase()}`} />
        <Numero rotulo="Entradas" valor={f.entradas} tom="bom" />
        <Numero rotulo="Saídas" valor={f.saidas} tom="ruim" />
        <Numero rotulo="Saldo final" valor={f.saldoFinal} tom={f.saldoFinal < 0 ? "ruim" : "neutro"} nota="inicial + entradas − saídas" />
      </section>

      {semSaldoInicial ? (
        <p className="mt-5 rounded-[4px] border border-dashed border-input bg-card/60 px-4 py-3 text-[13px] text-muted-foreground">
          Nenhuma conta tem saldo inicial cadastrado, então o saldo parte de zero e mostra só o que o
          sistema movimentou. Cadastre o saldo de cada conta em{" "}
          <Link href="/cadastros" className="text-brand underline underline-offset-4">Cadastros</Link>.
        </p>
      ) : null}

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo do mês</CardTitle>
            <span className="text-xs text-muted-foreground">{mesLongo(mes)}</span>
          </CardHeader>
          <CardBody>
            <LinhaDoDemonstrativo rotulo="Saldo inicial" valor={f.saldoInicial} tipo="subtotal" />
            {f.atividades.map((a) => (
              <div key={a.atividade} className="mt-3">
                <LinhaDoDemonstrativo rotulo={`Entradas ${DE[a.atividade]}`} valor={a.entradas} nivel={1} />
                <LinhaDoDemonstrativo rotulo={`Saídas ${DE[a.atividade]}`} valor={a.saidas} sinal="menos" nivel={1} />
                <LinhaDoDemonstrativo
                  rotulo={`Caixa ${CAIXA[a.atividade]}`}
                  nota={ATIVIDADE_EXPLICA[a.atividade]}
                  valor={a.liquido}
                  sinal="mais"
                  tipo="subtotal"
                />
              </div>
            ))}
            <div className="mt-3">
              <LinhaDoDemonstrativo rotulo="Variação do caixa" valor={f.variacao} sinal="mais" />
              <LinhaDoDemonstrativo rotulo="Saldo final" valor={f.saldoFinal} tipo="total" />
            </div>
            <Conferencia ok={somaAtividades === f.variacao && f.saldoFinal === f.saldoInicial + f.variacao}>
              Operacional + investimento + financiamento = {comSinal(somaAtividades)}, igual à variação
              do caixa. Saldo final = inicial + entradas − saídas.
            </Conferencia>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação, últimos 6 meses</CardTitle>
            <span className="text-xs text-muted-foreground">caixa líquido por atividade</span>
          </CardHeader>
          <CardBody className="space-y-6">
            {f.atividades.map((a) => {
              const valores = historico.map((h) => h.atividades.find((x) => x.atividade === a.atividade)!.liquido);
              return (
                <div key={a.atividade}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-[13px] font-semibold">{ATIVIDADE[a.atividade]}</p>
                    <p className="num text-xs text-muted-foreground">
                      soma {comSinal(valores.reduce((x, y) => x + y, 0))}
                    </p>
                  </div>
                  <BarrasComSinal meses={meses} valores={valores} />
                </div>
              );
            })}
            <div>
              <div className="mb-2 flex items-baseline justify-between border-t-2 border-foreground pt-3">
                <p className="text-[13px] font-semibold">Consolidado</p>
                <p className="num text-xs text-muted-foreground">variação do caixa</p>
              </div>
              <BarrasComSinal meses={meses} valores={historico.map((h) => h.variacao)} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>De onde veio cada número</CardTitle>
          <span className="text-xs text-muted-foreground">clique para abrir o lançamento</span>
        </CardHeader>
        <CardBody className="divide-y divide-[hsl(var(--rule-soft))] py-0">
          {f.atividades.map((a) => (
            <details key={a.atividade} className="group py-3">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 rounded-[3px] py-1 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>
                  <span aria-hidden className="me-2 inline-block w-3 text-muted-foreground transition-transform group-open:rotate-90">›</span>
                  {ATIVIDADE[a.atividade]}
                  <span className="ms-2 text-xs font-normal text-muted-foreground">{a.lancamentos.length} {a.lancamentos.length === 1 ? "movimento" : "movimentos"}</span>
                </span>
                <span className={`num whitespace-nowrap ${a.liquido < 0 ? "text-destructive" : ""}`}>{comSinal(a.liquido)}</span>
              </summary>
              {a.lancamentos.length === 0 ? (
                <p className="py-2 ps-5 text-[13px] text-muted-foreground">Nada andou nesta atividade no mês.</p>
              ) : (
                <ul className="mt-2 ps-5">
                  {a.lancamentos.map((l, i) => (
                    <li key={l.id + i} className="border-b border-[hsl(var(--rule-soft))] last:border-b-0">
                      <Link
                        href={`/${l.direcao === "RECEBER" ? "receber" : "pagar"}/${l.id}`}
                        className="flex items-baseline gap-4 py-2 text-[13px] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="num w-11 shrink-0 text-muted-foreground">{dataCurta(l.data)}</span>
                        <span className="min-w-0 flex-1 truncate">
                          {l.quem ? <span className="font-medium">{l.quem} · </span> : null}
                          {l.descricao}
                        </span>
                        <span className={`num shrink-0 ${l.valor < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                          {l.valor < 0 ? "− " : "+ "}
                          {formatBRL(Math.abs(l.valor))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
