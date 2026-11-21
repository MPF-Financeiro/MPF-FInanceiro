import Link from "next/link";
import { alertas, resumoDoPainel } from "@/lib/consultas";
import { visaoExecutiva } from "@/lib/indicadores";
import { CATEGORIA } from "@/lib/rotulos";
import { cn, competenciaLonga, dataCurta } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipStatus } from "@/components/financeiro/chip";
import { Numero } from "@/components/financeiro/pagina";
import { BarraDeRealizacao, BarrasHorizontais, GraficoCaixa } from "@/components/financeiro/graficos";

export const dynamic = "force-dynamic";

function Variacao({ agora, antes }: { agora: number; antes: number }) {
  if (!antes) return <>sem mês anterior para comparar</>;
  const pct = Math.round(((agora - antes) / antes) * 100);
  return (
    <>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% contra o mês passado
    </>
  );
}

const linkDaFolha = "text-[13px] text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand";

export default async function VisaoExecutivaPage() {
  const hoje = new Date();
  const [v, site, avisos] = await Promise.all([
    visaoExecutiva(hoje),
    resumoDoPainel(hoje),
    alertas(hoje),
  ]);

  const sobra = v.atual.entradas - v.atual.saidas;
  const saldoTotal = v.saldos.reduce((a, c) => a + c.saldo, 0);
  const totalGastos = v.gastos.reduce((a, g) => a + g.valor, 0);
  const mes = competenciaLonga(hoje);
  const Mes = mes.charAt(0).toUpperCase() + mes.slice(1);

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-foreground pb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {Mes} · mês aberto
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Visão executiva
          </h1>
        </div>
        <p className="max-w-md text-pretty text-[13px] text-muted-foreground">
          <strong className="font-semibold text-foreground">Caixa</strong> é o dinheiro que andou na
          conta. <strong className="font-semibold text-foreground">Competência</strong> é o mês a que
          a venda ou o gasto pertence. Os dois nunca se somam.
        </p>
      </header>

      <section aria-label="Caixa do mês" className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-4">
        <Numero
          rotulo="Entrou no mês"
          valor={v.atual.entradas}
          tom="bom"
          nota={<Variacao agora={v.atual.entradas} antes={v.anterior?.entradas ?? 0} />}
        />
        <Numero
          rotulo="Saiu no mês"
          valor={v.atual.saidas}
          tom="ruim"
          nota={<Variacao agora={v.atual.saidas} antes={v.anterior?.saidas ?? 0} />}
        />
        <Numero
          rotulo="Sobra de caixa"
          valor={sobra}
          sinal
          tom={sobra < 0 ? "ruim" : "neutro"}
          nota="entrou menos saiu"
        />
        <Numero
          rotulo="Saldo em contas"
          valor={saldoTotal}
          nota={`${v.saldos.length} ${v.saldos.length === 1 ? "conta" : "contas"} · pelo que foi baixado`}
        />
      </section>

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de caixa, últimos 6 meses</CardTitle>
            <span className="text-xs text-muted-foreground">regime de caixa</span>
          </CardHeader>
          <CardBody className="pb-5">
            <GraficoCaixa meses={v.caixa} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precisa de você</CardTitle>
            <span className="num text-xs text-muted-foreground">{avisos.length}</span>
          </CardHeader>
          <CardBody className="py-2">
            {avisos.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nada esperando ninguém. Conta vencida, repasse atrasado e extrato sem par aparecem aqui.
              </p>
            ) : (
              <ul>
                {avisos.map((a) => (
                  <li
                    key={a.href + a.texto}
                    className="border-b border-[hsl(var(--rule-soft))] last:border-b-0"
                  >
                    <Link
                      href={a.href}
                      className="group flex items-start gap-3 py-3 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* A urgência muda de forma, não só de cor: cheio, contorno, traço. */}
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[5px] size-2.5 shrink-0 rounded-[2px] border-[1.5px]",
                          a.tom === "ruim" && "border-destructive bg-destructive",
                          a.tom === "atencao" && "border-[hsl(var(--warning))]",
                          a.tom === "neutro" && "h-[2px] rounded-none border-0 bg-muted-foreground/60 mt-[9px]"
                        )}
                      />
                      <span className="group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
                        <span className="sr-only">
                          {a.tom === "ruim" ? "Urgente: " : a.tom === "atencao" ? "Atenção: " : "Para conferir: "}
                        </span>
                        {a.texto}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Para onde foi o dinheiro</CardTitle>
            <span className="text-xs text-muted-foreground">
              gastos de {mes.split(" ")[0]}, por competência
            </span>
          </CardHeader>
          <CardBody>
            {v.gastos.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Nenhum gasto lançado neste mês.</p>
            ) : (
              <>
                <BarrasHorizontais
                  total={totalGastos}
                  linhas={v.gastos.map((g) => ({ rotulo: CATEGORIA[g.categoria], valor: g.valor }))}
                />
                <div className="mt-4 flex items-baseline justify-between border-t-2 border-foreground pt-2.5 text-[13px] font-semibold">
                  <span>Total do mês</span>
                  <span className="num">{formatBRL(totalGastos)}</span>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendido × recebido</CardTitle>
            <span className="text-xs text-muted-foreground">competência contra caixa</span>
          </CardHeader>
          <CardBody className="space-y-6">
            <BarraDeRealizacao
              rotulo="Faturado no mês"
              total={v.faturado}
              realizado={v.faturadoRecebido}
              realizadoRotulo="já recebido"
              faltaRotulo="não recebido"
            />
            <BarraDeRealizacao
              rotulo="Gasto no mês"
              total={v.gasto}
              realizado={v.gastoPago}
              realizadoRotulo="já pago"
              faltaRotulo="não pago"
            />
            <div className="border-t border-[hsl(var(--rule-soft))] pt-4">
              <p className="rotulo mb-3">Site do Giovanni, este mês</p>
              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt>Pago pelos alunos, menos nota e taxas</dt>
                  <dd className="num font-semibold text-[hsl(var(--success))]">{formatBRL(site.liquidoDoSite)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Nota fiscal e Paga-me</dt>
                  <dd className="num">− {formatBRL(site.taxasDoSite)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Cartão ainda por cair</dt>
                  <dd className="num">{formatBRL(site.aReceberDoSite)}</dd>
                </div>
              </dl>
              <Link href="/vendas" className={cn(linkDaFolha, "mt-3 inline-block")}>
                Abrir as vendas
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {(
          [
            ["A receber, por vencimento", v.proximosReceber, "/receber", "receber", v.aReceber],
            ["A pagar, por vencimento", v.proximosPagar, "/pagar", "pagar", v.aPagar],
          ] as const
        ).map(([titulo, lista, href, tipo, total]) => (
          <Card key={href}>
            <CardHeader>
              <CardTitle>{titulo}</CardTitle>
              <span className="num text-xs text-muted-foreground">{formatBRL(total)} em aberto</span>
            </CardHeader>
            <CardBody className="py-1">
              {lista.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Nada em aberto.</p>
              ) : (
                <ul>
                  {lista.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-4 border-b border-[hsl(var(--rule-soft))] py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${href}/${t.id}`}
                          className="block truncate text-[13.5px] font-medium hover:underline hover:decoration-border hover:underline-offset-4"
                        >
                          {t.cliente?.nome ?? t.fornecedor?.nome ?? t.descricao}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.descricao} · vence {dataCurta(t.vencimento)}
                        </p>
                      </div>
                      <span className="num shrink-0 text-[13px]">{formatBRL(t.pendente)}</span>
                      <span className="w-[86px] shrink-0 text-end">
                        <ChipStatus status={t.status} rotulo={tipo === "pagar" && t.status === "QUITADO" ? "Pago" : undefined} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={href} className={cn(linkDaFolha, "my-3 inline-block")}>
                Ver tudo
              </Link>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
