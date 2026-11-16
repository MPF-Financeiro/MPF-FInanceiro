"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { lancarVenda } from "@/lib/acoes/vendas";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { calcularCascata, dividirRepasses, formatBRL } from "@/lib/money";
import { parseCentavos } from "@/lib/validacao";
import { formatBps } from "@/lib/taxas";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Cascata } from "@/components/financeiro/cascata";
import {
  BotaoEnviar,
  Campo,
  Erro,
  Grade,
  LinhaDeAcoes,
  TokenDoFormulario,
} from "@/components/financeiro/formulario";

export type CursoOpcao = { id: string; nome: string; preco: number };
export type CupomOpcao = {
  id: string;
  codigo: string;
  cursoId: string | null;
  percentBps: number | null;
  valorFixo: number | null;
};

export function FormVenda({
  empresas,
  cursos,
  cupons,
  taxa,
  hoje,
}: {
  empresas: Array<{ id: string; nome: string }>;
  cursos: CursoOpcao[];
  cupons: CupomOpcao[];
  taxa: { notaBps: number; pixBps: number; cartaoBps: number; fixoPorVenda: number };
  hoje: string;
}) {
  const [estado, acao] = useFormState(lancarVenda, ESTADO_VAZIO);
  const [cursoId, setCursoId] = React.useState(cursos[0]?.id ?? "");
  const [valorCobrado, setValorCobrado] = React.useState("");
  const [cupomId, setCupomId] = React.useState("");
  const [meio, setMeio] = React.useState<"PIX" | "CARTAO">("PIX");
  const [parcelas, setParcelas] = React.useState(1);

  const curso = cursos.find((c) => c.id === cursoId);
  const cupom = cupons.find((c) => c.id === cupomId);
  const cuponsValidos = cupons.filter((c) => !c.cursoId || c.cursoId === cursoId);

  const bruto = parseCentavos(valorCobrado) ?? curso?.preco ?? 0;
  const desconto = cupom
    ? (cupom.valorFixo ?? Math.round((bruto * (cupom.percentBps ?? 0)) / 10_000))
    : 0;

  const conta =
    bruto > 0 && desconto <= bruto
      ? calcularCascata({
          bruto,
          cupom: desconto,
          notaBps: taxa.notaBps,
          gatewayBps: meio === "PIX" ? taxa.pixBps : taxa.cartaoBps,
          gatewayFixo: taxa.fixoPorVenda,
        })
      : null;
  const fatias =
    conta && !conta.negativo && parcelas > 1 ? dividirRepasses(conta.liquido, parcelas) : [];

  return (
    <form action={acao} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <TokenDoFormulario />
      <div className="space-y-6">
        <Erro>{estado.erro}</Erro>
        <Card>
          <CardHeader>
            <CardTitle>A venda</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Grade>
              <Campo rotulo="Data da venda" htmlFor="data">
                <Input id="data" name="data" type="date" required defaultValue={hoje} />
              </Campo>
              <Campo rotulo="Empresa" htmlFor="empresaId">
                <Select id="empresaId" name="empresaId" required defaultValue={empresas[0]?.id}>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
            </Grade>

            <Campo rotulo="Aluno" htmlFor="aluno">
              <Input id="aluno" name="aluno" required minLength={3} maxLength={120} />
            </Campo>

            <Grade>
              <Campo rotulo="Curso" htmlFor="cursoId" dica="Cadastrados em Cursos e taxas.">
                <Select
                  id="cursoId"
                  name="cursoId"
                  value={cursoId}
                  onChange={(e) => {
                    setCursoId(e.target.value);
                    setCupomId("");
                  }}
                >
                  <option value="">Não é curso cadastrado</option>
                  {cursos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} — {formatBRL(c.preco)}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Cupom" htmlFor="cupomId" opcional>
                <Select
                  id="cupomId"
                  name="cupomId"
                  value={cupomId}
                  onChange={(e) => setCupomId(e.target.value)}
                >
                  <option value="">Sem cupom</option>
                  {cuponsValidos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo}
                      {c.valorFixo
                        ? ` — ${formatBRL(c.valorFixo)}`
                        : c.percentBps
                          ? ` — ${formatBps(c.percentBps)}`
                          : ""}
                    </option>
                  ))}
                </Select>
              </Campo>
            </Grade>

            {!cursoId ? (
              <Campo
                rotulo="O que foi vendido"
                htmlFor="descricao"
                dica="Use quando o curso ainda não está cadastrado."
              >
                <Input id="descricao" name="descricao" maxLength={160} />
              </Campo>
            ) : null}

            <Grade colunas={3}>
              <Campo
                rotulo="Valor cobrado"
                htmlFor="valorCobrado"
                dica={
                  curso
                    ? `Em branco usa o preço de tabela: ${formatBRL(curso.preco)}.`
                    : "Em reais."
                }
              >
                <Input
                  id="valorCobrado"
                  name="valorCobrado"
                  inputMode="decimal"
                  placeholder={curso ? (curso.preco / 100).toFixed(2).replace(".", ",") : "0,00"}
                  value={valorCobrado}
                  onChange={(e) => setValorCobrado(e.target.value)}
                  className="num tabular-nums"
                />
              </Campo>
              <Campo rotulo="Meio" htmlFor="meio">
                <Select
                  id="meio"
                  name="meio"
                  value={meio}
                  onChange={(e) => {
                    const novo = e.target.value as "PIX" | "CARTAO";
                    setMeio(novo);
                    if (novo === "PIX") setParcelas(1);
                  }}
                >
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                </Select>
              </Campo>
              <Campo rotulo="Parcelas" htmlFor="parcelas" dica="Só no cartão.">
                <Input
                  id="parcelas"
                  name="parcelas"
                  type="number"
                  min={1}
                  max={12}
                  disabled={meio === "PIX"}
                  value={parcelas}
                  onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
                  className="num tabular-nums"
                />
              </Campo>
            </Grade>
          </CardBody>
        </Card>

        <LinhaDeAcoes>
          <BotaoEnviar enviando="Lançando…">Lançar venda</BotaoEnviar>
          <Button asChild variant="ghost">
            <Link href="/vendas">Cancelar</Link>
          </Button>
        </LinhaDeAcoes>
      </div>

      <div className="space-y-4 self-start lg:sticky lg:top-24">
        {conta ? (
          <>
            <Cascata titulo="A conta desta venda" linhas={conta.linhas} />
            {conta.negativo ? (
              <p
                role="status"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                A conta fecha negativa: a nota e a taxa somam mais do que o aluno pagou. Confira o
                valor e as taxas antes de lançar.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Nota fiscal {formatBps(taxa.notaBps)} e taxa do Paga-me{" "}
              {formatBps(meio === "PIX" ? taxa.pixBps : taxa.cartaoBps)}, pela vigência da data da
              venda. As duas incidem sobre o valor pago, não sobre o preço de tabela.
            </p>
            {fatias.length > 1 ? (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium">
                  {parcelas} repasses de {formatBRL(fatias[1])}
                  {fatias[0] !== fatias[1] ? `, o primeiro de ${formatBRL(fatias[0])}` : ""}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Cada parcela entra no caixa quando você marcar que caiu.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Escolha o curso ou informe o valor cobrado para ver a conta até o líquido.
          </div>
        )}
      </div>
    </form>
  );
}
