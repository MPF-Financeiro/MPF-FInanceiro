import { redirect } from "next/navigation";
import { Direcao } from "@prisma/client";
import { db } from "@/lib/db";
import { podeAdministrar, podeLancar, sessaoAtual } from "@/lib/permissoes";
import { competenciaDe, fimDoMes, hojeUTC, inicioDoMes, paraInputMonth } from "@/lib/mes";
import { conferirMes } from "@/lib/acoes/banco";
import { sugerirBaixa } from "@/lib/extrato";
import { formatBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Conciliacao, Fechamento, ImportarExtrato } from "@/components/financeiro/banco-ui";

export const dynamic = "force-dynamic";

export default async function BancoPage({
  searchParams,
}: {
  searchParams: { conta?: string; competencia?: string };
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel)) redirect("/");

  const contas = await db.contaBancaria.findMany({
    where: { ativa: true },
    orderBy: { apelido: "asc" },
    include: { empresa: true },
  });
  if (contas.length === 0) {
    return (
      <>
        <Cabecalho
          titulo="Banco e fechamento"
          descricao="Cadastre uma conta bancária em Cadastros para importar extrato e fechar o mês."
        />
      </>
    );
  }

  const conta = contas.find((c) => c.id === searchParams.conta) ?? contas[0];
  const competencia = searchParams.competencia
    ? (competenciaDe(searchParams.competencia) ?? inicioDoMes(hojeUTC()))
    : inicioDoMes(hojeUTC());

  const [movimentos, baixasDoMes, conferencia] = await Promise.all([
    db.movimentoExtrato.findMany({
      where: {
        contaId: conta.id,
        data: { gte: inicioDoMes(competencia), lt: fimDoMes(competencia) },
      },
      orderBy: { data: "asc" },
      include: { baixa: { include: { titulo: true } } },
    }),
    db.baixa.findMany({
      where: {
        contaId: conta.id,
        data: { gte: inicioDoMes(competencia), lt: fimDoMes(competencia) },
        movimento: null,
      },
      orderBy: { data: "asc" },
      include: { titulo: { select: { descricao: true, direcao: true } } },
    }),
    conferirMes(conta.id, competencia),
  ]);

  const opcoesBaixa = baixasDoMes.map((b) => ({
    id: b.id,
    valor: b.valor,
    data: b.data,
    rotulo: `${String(b.data.getUTCDate()).padStart(2, "0")}/${String(b.data.getUTCMonth() + 1).padStart(2, "0")} · ${
      b.titulo.direcao === Direcao.RECEBER ? "recebido" : "pago"
    } · ${formatBRL(b.valor)} · ${b.titulo.descricao}`,
  }));

  return (
    <>
      <Cabecalho
        titulo="Banco e fechamento"
        descricao="O extrato importado, a conciliação com as baixas e o fechamento da competência."
        acao={
          <form method="get" action="/financeiro/banco" className="flex flex-wrap items-end gap-2">
            <Select name="conta" defaultValue={conta.id} aria-label="Conta" className="w-52">
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido} ({c.banco})
                </option>
              ))}
            </Select>
            <Input
              type="month"
              name="competencia"
              defaultValue={paraInputMonth(competencia)}
              aria-label="Competência"
              className="w-40"
            />
            <Button type="submit" variant="outline">
              Ver
            </Button>
          </form>
        }
      />
      <div className="space-y-6">
        <Fechamento
          conta={`${conta.apelido} (${conta.banco})`}
          contaId={conta.id}
          competencia={paraInputMonth(competencia)}
          saldoInicial={conferencia.fechamento?.saldoInicial ?? 0}
          entradas={conferencia.entradas}
          saidas={conferencia.saidas}
          saldoFinal={conferencia.saldoFinal}
          saldoFinalExtrato={conferencia.fechamento?.saldoFinalExtrato ?? null}
          fechadoEm={conferencia.fechamento?.fechadoEm ?? null}
          fechamentoId={conferencia.fechamento?.id ?? null}
          naoConciliados={conferencia.naoConciliados}
          podeAdministrar={podeAdministrar(sessao.papel)}
        />
        <Conciliacao
          movimentos={movimentos.map((m) => {
            const sugestao = m.baixaId ? null : sugerirBaixa(m, opcoesBaixa);
            return {
              id: m.id,
              data: m.data,
              descricao: m.descricao,
              valor: m.valor,
              conciliado: Boolean(m.baixaId),
              baixaConciliada: m.baixa
                ? `${formatBRL(m.baixa.valor)} · ${m.baixa.titulo.descricao}`
                : null,
              sugestao: sugestao ? { id: sugestao.id, rotulo: sugestao.rotulo } : null,
            };
          })}
          baixas={opcoesBaixa.map((b) => ({ id: b.id, rotulo: b.rotulo }))}
        />
        <ImportarExtrato
          contas={contas.map((c) => ({ id: c.id, nome: `${c.apelido} (${c.banco})` }))}
        />
      </div>
    </>
  );
}
