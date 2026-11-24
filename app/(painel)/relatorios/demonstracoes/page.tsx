import Link from "next/link";
import { balancoEm, fluxoDoMes, resultadoOperacional } from "@/lib/relatorios";
import { carregarRelatorios, mesDaPagina } from "@/lib/relatorios-db";
import { formatBRL } from "@/lib/money";
import { cn, dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Conferencia, LinhaDoDemonstrativo, SeletorDeMes, comSinal, mesLongo } from "@/components/financeiro/relatorio";

export const dynamic = "force-dynamic";

const ultimoDia = (mes: Date) => new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() + 1, 0));

export default async function DemonstracoesPage({ searchParams }: { searchParams: { mes?: string } }) {
  const mes = mesDaPagina(searchParams.mes);
  const { lancamentos, contasParaSaldo } = await carregarRelatorios();
  const b = balancoEm(lancamentos, contasParaSaldo, mes);
  const f = fluxoDoMes(lancamentos, mes, contasParaSaldo);

  const mesesDoAno = Array.from({ length: mes.getUTCMonth() + 1 }, (_, i) => new Date(Date.UTC(mes.getUTCFullYear(), i, 1)));
  const doMes = resultadoOperacional(lancamentos, mes, contasParaSaldo);
  const noAno = mesesDoAno
    .map((m) => resultadoOperacional(lancamentos, m, contasParaSaldo))
    .reduce(
      (a, r) => ({
        faturamento: a.faturamento + r.faturamento,
        variaveis: a.variaveis + r.variaveis,
        margem: a.margem + r.margem,
        fixos: a.fixos + r.fixos,
        lucroOperacional: a.lucroOperacional + r.lucroOperacional,
        receitaNaoOperacional: a.receitaNaoOperacional + r.receitaNaoOperacional,
        resultadoLiquido: a.resultadoLiquido + r.resultadoLiquido,
      }),
      { faturamento: 0, variaveis: 0, margem: 0, fixos: 0, lucroOperacional: 0, receitaNaoOperacional: 0, resultadoLiquido: 0 }
    );

  const linhasDre: Array<[string, keyof typeof noAno, "normal" | "subtotal" | "total", boolean]> = [
    ["Faturamento", "faturamento", "normal", false],
    ["(−) Gastos variáveis", "variaveis", "normal", true],
    ["Margem de contribuição", "margem", "subtotal", false],
    ["(−) Gastos fixos", "fixos", "normal", true],
    ["Lucro operacional", "lucroOperacional", "subtotal", false],
    ["(+) Receita não operacional", "receitaNaoOperacional", "normal", false],
    ["Resultado líquido", "resultadoLiquido", "total", false],
  ];

  return (
    <>
      <Cabecalho
        titulo="Demonstrações financeiras"
        descricao="Balanço e DRE gerenciais, montados dos próprios lançamentos: cada número vem de títulos e baixas que dá para abrir. Não substituem a contabilidade oficial."
        acao={<SeletorDeMes caminho="/relatorios/demonstracoes" mes={mes} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Balanço gerencial em {dataCurta(ultimoDia(mes))}/{mes.getUTCFullYear()}</CardTitle>
          <span className="text-xs text-muted-foreground">posição no fim do mês</span>
        </CardHeader>
        <CardBody>
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
            <div>
              <p className="rotulo border-b-2 border-foreground pb-2 text-foreground">Ativo</p>
              <LinhaDoDemonstrativo rotulo="Caixa e bancos" valor={b.ativo.caixa} href="/relatorios/fluxo-de-caixa" />
              <LinhaDoDemonstrativo rotulo="Contas a receber" valor={b.ativo.aReceber} href="/receber" />
              {b.ativo.pagoAdiantado ? <LinhaDoDemonstrativo rotulo="Pago adiantado" valor={b.ativo.pagoAdiantado} /> : null}
              <LinhaDoDemonstrativo rotulo="Ativo circulante" valor={b.ativo.circulante} tipo="subtotal" />
              <LinhaDoDemonstrativo rotulo="Equipamentos e investimentos" nota="o que foi comprado como investimento" valor={b.ativo.bens} />
              <LinhaDoDemonstrativo rotulo="Ativo não circulante" valor={b.ativo.bens} tipo="subtotal" />
              <LinhaDoDemonstrativo rotulo="Total do ativo" valor={b.ativo.total} tipo="total" />
            </div>
            <div>
              <p className="rotulo border-b-2 border-foreground pb-2 text-foreground">Passivo e patrimônio líquido</p>
              <LinhaDoDemonstrativo rotulo="Contas a pagar" valor={b.passivo.aPagar} href="/pagar" />
              {b.passivo.recebidoAdiantado ? <LinhaDoDemonstrativo rotulo="Recebido adiantado" valor={b.passivo.recebidoAdiantado} /> : null}
              <LinhaDoDemonstrativo rotulo="Empréstimos e acertos" nota="financiamentos recebidos menos devolvidos" valor={b.passivo.dividas} />
              <LinhaDoDemonstrativo rotulo="Passivo" valor={b.passivo.total} tipo="subtotal" />
              <LinhaDoDemonstrativo rotulo="Capital de abertura" nota="saldo inicial das contas" valor={b.pl.capital} />
              <LinhaDoDemonstrativo rotulo="Resultados de anos anteriores" valor={b.pl.resultadosAnteriores} />
              <LinhaDoDemonstrativo rotulo={`Resultado de ${mes.getUTCFullYear()} até ${mesLongo(mes).split(" ")[0].toLowerCase()}`} valor={b.pl.resultadoDoAno} sinal="mais" />
              <LinhaDoDemonstrativo rotulo="Patrimônio líquido" valor={b.pl.total} tipo="subtotal" />
              <LinhaDoDemonstrativo rotulo="Total do passivo e PL" valor={b.passivo.total + b.pl.total} tipo="total" />
            </div>
          </div>
          <Conferencia ok={b.fecha}>
            Ativo ({formatBRL(b.ativo.total)}) = passivo + patrimônio líquido ({formatBRL(b.passivo.total + b.pl.total)}).
          </Conferencia>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>DRE gerencial</CardTitle>
            <span className="text-xs text-muted-foreground">competência</span>
          </CardHeader>
          <CardBody>
            <div className="relative -mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[460px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th scope="col" className="rotulo border-b-2 border-foreground pb-2 text-start text-foreground">Linha</th>
                    <th scope="col" className="rotulo border-b-2 border-foreground pb-2 text-end text-foreground">{mesLongo(mes)}</th>
                    <th scope="col" className="rotulo border-b-2 border-foreground pb-2 ps-6 text-end text-foreground">No ano</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasDre.map(([rot, k, tipo, menos]) => {
                    const cls = cn(
                      "py-2.5",
                      tipo === "normal" && "border-b border-[hsl(var(--rule-soft))]",
                      tipo === "subtotal" && "border-b border-foreground/70 font-semibold",
                      tipo === "total" && "border-b-[3px] border-double border-foreground font-semibold"
                    );
                    const valor = (v: number) => (menos ? (v ? `− ${formatBRL(v)}` : formatBRL(0)) : formatBRL(v));
                    return (
                      <tr key={k}>
                        <th scope="row" className={cn(cls, "text-start font-normal", tipo !== "normal" && "font-semibold")}>{rot}</th>
                        <td className={cn(cls, "num text-end", menos && "text-destructive", !menos && doMes[k] < 0 && "text-destructive")}>{valor(doMes[k])}</td>
                        <td className={cn(cls, "num ps-6 text-end", menos && "text-destructive", !menos && noAno[k] < 0 && "text-destructive")}>{valor(noAno[k])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Conferencia ok={noAno.resultadoLiquido === b.pl.resultadoDoAno}>
              O resultado do ano na DRE é o mesmo que está no patrimônio líquido do balanço.
            </Conferencia>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo de caixa do mês</CardTitle>
            <Link href={`/relatorios/fluxo-de-caixa`} className="text-[13px] text-brand underline decoration-brand/30 underline-offset-4">Abrir</Link>
          </CardHeader>
          <CardBody>
            <LinhaDoDemonstrativo rotulo="Saldo inicial" valor={f.saldoInicial} />
            {f.atividades.map((a) => (
              <LinhaDoDemonstrativo
                key={a.atividade}
                rotulo={{ OPERACIONAL: "Das operações", INVESTIMENTO: "Dos investimentos", FINANCIAMENTO: "Dos financiamentos" }[a.atividade]}
                valor={a.liquido}
                sinal="mais"
                nivel={1}
              />
            ))}
            <LinhaDoDemonstrativo rotulo="Saldo final" valor={f.saldoFinal} tipo="total" />
            <p className="mt-3 text-xs text-muted-foreground">Variação do mês: {comSinal(f.variacao)}.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
