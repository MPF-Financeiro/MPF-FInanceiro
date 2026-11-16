import Link from "next/link";
import { Direcao } from "@prisma/client";
import { alertas, listarTitulos, resumoDoPainel } from "@/lib/consultas";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { competenciaLonga, dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipStatus } from "@/components/financeiro/chip";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const hoje = new Date();
  const [resumo, receber, avisos] = await Promise.all([
    resumoDoPainel(hoje),
    listarTitulos(Direcao.RECEBER),
    alertas(hoje),
  ]);

  const proximos = receber
    .filter((t) => t.status !== "QUITADO" && t.status !== "CANCELADO")
    .slice(0, 6);

  return (
    <>
      <Cabecalho
        titulo="Painel Financeiro"
        descricao={`Competência de ${competenciaLonga(hoje)}. "A receber" é saldo em aberto; "recebido" é dinheiro que bateu na conta.`}
      />

      {avisos.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Precisa de atenção</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2.5">
              {avisos.map((a) => (
                <li key={a.href + a.texto} className="flex items-start gap-2.5 text-sm">
                  {/*
                    A urgência não pode estar só na cor: quem não distingue
                    vermelho de amarelo, ou imprime a tela, tem de ver a
                    diferença. Então a bolinha também muda de forma — cheia,
                    vazada, traço — e a palavra vai no texto para o leitor de
                    tela.
                  */}
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full border-2",
                      a.tom === "ruim" && "border-destructive bg-destructive",
                      a.tom === "atencao" && "border-[hsl(var(--warning))] bg-transparent",
                      a.tom === "neutro" &&
                        "size-2 rounded-none border-0 border-b-2 border-muted-foreground/60 bg-transparent"
                    )}
                  />
                  <Link href={a.href} className="underline-offset-4 hover:underline">
                    <span className="sr-only">
                      {a.tom === "ruim"
                        ? "Urgente: "
                        : a.tom === "atencao"
                          ? "Atenção: "
                          : "Para conferir: "}
                    </span>
                    {a.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero
          rotulo="A receber"
          valor={resumo.aReceber}
          nota="saldo em aberto, todas as competências"
        />
        <Numero
          rotulo="Recebido no mês"
          valor={resumo.recebidoNoMes}
          tom="bom"
          nota="soma das baixas"
        />
        <Numero rotulo="A pagar no mês" valor={resumo.aPagar} nota="competência deste mês" />
        <Numero
          rotulo="Vencido"
          valor={resumo.vencidos.total}
          tom={resumo.vencidos.total > 0 ? "ruim" : "neutro"}
          nota={`${resumo.vencidos.quantidade} ${resumo.vencidos.quantidade === 1 ? "título" : "títulos"}`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Próximos recebimentos</CardTitle>
            <Link href="/receber" className="text-sm text-brand underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardBody>
            {proximos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nada em aberto no momento.
              </p>
            ) : (
              <Tabela minWidth={620}>
                <thead>
                  <tr>
                    <Th>Cliente</Th>
                    <Th>Descrição</Th>
                    <Th>Vence</Th>
                    <Th numero>Valor</Th>
                    <Th numero>Pendente</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map((t) => (
                    <tr key={t.id}>
                      <Td className="font-medium">{t.cliente?.nome ?? "—"}</Td>
                      <Td className="text-muted-foreground">{t.descricao}</Td>
                      <Td>{dataCurta(t.vencimento)}</Td>
                      <Td numero>{formatBRL(t.valor)}</Td>
                      <Td numero>{formatBRL(t.pendente)}</Td>
                      <Td>
                        <ChipStatus status={t.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site do Giovanni, este mês</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Numero rotulo="Líquido das vendas" valor={resumo.liquidoDoSite} tom="bom" />
            <Numero rotulo="Nota e taxas" valor={resumo.taxasDoSite} nota="10% da NF + Paga-me" />
            <Numero
              rotulo="A receber do cartão"
              valor={resumo.aReceberDoSite}
              nota="parcelas ainda não repassadas"
            />
            <Link
              href="/vendas"
              className="block pt-1 text-sm text-brand underline-offset-4 hover:underline"
            >
              Abrir as vendas
            </Link>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
