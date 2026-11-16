"use client";

import { useFormState } from "react-dom";
import {
  conciliar,
  desconciliar,
  fecharMes,
  importarExtrato,
  reabrirMes,
} from "@/lib/acoes/banco";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Cascata } from "@/components/financeiro/cascata";
import { Carimbo } from "@/components/financeiro/chip";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

type Opcao = { id: string; nome: string };

export type MovimentoLinha = {
  id: string;
  data: Date;
  descricao: string;
  valor: number;
  conciliado: boolean;
  baixaConciliada: string | null;
  sugestao: { id: string; rotulo: string } | null;
};

export type BaixaOpcao = { id: string; rotulo: string };

function data(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function ImportarExtrato({ contas }: { contas: Opcao[] }) {
  const [estado, acao] = useFormState(importarExtrato, ESTADO_VAZIO);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Importar extrato</CardTitle>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cole as linhas do internet banking ou da planilha: data, descrição, valor e, se o banco
            mandar, o identificador. Importar o mesmo arquivo duas vezes não duplica nada.
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <form action={acao} className="space-y-4">
          <Erro>{estado.erro}</Erro>
          <Sucesso>{estado.ok}</Sucesso>
          <Grade>
            <Campo rotulo="Conta" htmlFor="ext-conta">
              <Select id="ext-conta" name="contaId" required>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>
          </Grade>
          <Campo
            rotulo="Extrato"
            htmlFor="ext-texto"
            dica="Uma linha por movimento. Saída com o sinal de menos."
          >
            <Textarea
              id="ext-texto"
              name="texto"
              required
              rows={8}
              placeholder={"05/11/2026;PIX RECEBIDO ANA P;1.250,00\n07/11/2026;ALUGUEL;-2.000,00"}
              className="num font-mono text-xs"
            />
          </Campo>
          <BotaoEnviar enviando="Importando…">Importar</BotaoEnviar>
        </form>
      </CardBody>
    </Card>
  );
}

export function Conciliacao({
  movimentos,
  baixas,
}: {
  movimentos: MovimentoLinha[];
  baixas: BaixaOpcao[];
}) {
  const [estadoConciliar, acaoConciliar] = useFormState(conciliar, ESTADO_VAZIO);
  const [estadoDesfazer, acaoDesfazer] = useFormState(desconciliar, ESTADO_VAZIO);

  const pendentes = movimentos.filter((m) => !m.conciliado);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Conciliação</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendentes.length} de {movimentos.length} movimentos sem conciliar. A sugestão casa
            valor igual com data próxima; quem confirma é você.
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <Erro>{estadoConciliar.erro}</Erro>
        <Sucesso>{estadoConciliar.ok}</Sucesso>
        <Erro>{estadoDesfazer.erro}</Erro>
        <Sucesso>{estadoDesfazer.ok}</Sucesso>
        <Tabela minWidth={940}>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Descrição no banco</Th>
              <Th numero>Valor</Th>
              <Th>Baixa</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={m.id}>
                <Td>{data(m.data)}</Td>
                <Td className="max-w-80 truncate whitespace-normal">{m.descricao}</Td>
                <Td numero className={m.valor < 0 ? "text-destructive" : ""}>
                  {m.valor < 0 ? `− ${formatBRL(-m.valor)}` : formatBRL(m.valor)}
                </Td>
                <Td>
                  {m.conciliado ? (
                    <span className="text-sm text-muted-foreground">{m.baixaConciliada}</span>
                  ) : (
                    <form action={acaoConciliar} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="movimentoId" value={m.id} />
                      <Select
                        name="baixaId"
                        required
                        defaultValue={m.sugestao?.id ?? ""}
                        aria-label={`Baixa que corresponde ao movimento de ${data(m.data)}`}
                        className="h-9 w-72"
                      >
                        <option value="">Escolher a baixa</option>
                        {baixas.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.rotulo}
                          </option>
                        ))}
                      </Select>
                      <BotaoEnviar variant="outline" size="sm" enviando="…">
                        Conciliar
                      </BotaoEnviar>
                    </form>
                  )}
                </Td>
                <Td>
                  {m.conciliado ? (
                    <form action={acaoDesfazer}>
                      <input type="hidden" name="movimentoId" value={m.id} />
                      <BotaoEnviar variant="ghost" size="sm" enviando="…">
                        Desfazer
                      </BotaoEnviar>
                    </form>
                  ) : m.sugestao ? (
                    <span className="text-xs text-muted-foreground">sugerido</span>
                  ) : null}
                </Td>
              </tr>
            ))}
            {movimentos.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">
                  Nenhum movimento importado nesta conta e mês.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>
      </CardBody>
    </Card>
  );
}

export function Fechamento({
  conta,
  contaId,
  competencia,
  saldoInicial,
  entradas,
  saidas,
  saldoFinal,
  saldoFinalExtrato,
  fechadoEm,
  fechamentoId,
  naoConciliados,
  podeAdministrar,
}: {
  conta: string;
  contaId: string;
  competencia: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldoFinal: number;
  saldoFinalExtrato: number | null;
  fechadoEm: Date | null;
  fechamentoId: string | null;
  naoConciliados: number;
  podeAdministrar: boolean;
}) {
  const [estadoFechar, acaoFechar] = useFormState(fecharMes, ESTADO_VAZIO);
  const [estadoReabrir, acaoReabrir] = useFormState(reabrirMes, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fechamento do mês</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {conta} · {competencia}
          </p>
        </div>
        {fechadoEm ? <Carimbo>Mês fechado</Carimbo> : null}
      </CardHeader>
      <CardBody className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Cascata
          titulo="O saldo do mês"
          linhas={[
            { rotulo: "Saldo inicial", valor: saldoInicial },
            { rotulo: "Entradas", valor: entradas },
            { rotulo: "Saídas", valor: -saidas },
            { rotulo: "Saldo calculado", valor: saldoFinal, total: true },
          ]}
        />
        <div className="space-y-4">
          {saldoFinalExtrato !== null ? (
            <p className="num text-sm tabular-nums">
              Saldo informado do extrato: {formatBRL(saldoFinalExtrato)}
              {saldoFinalExtrato !== saldoFinal ? (
                <strong className="text-destructive">
                  {" "}
                  · diferença de {formatBRL(Math.abs(saldoFinalExtrato - saldoFinal))}
                </strong>
              ) : (
                <span className="text-[hsl(var(--success))]"> · bate com o calculado</span>
              )}
            </p>
          ) : null}
          {naoConciliados > 0 ? (
            <p className="text-sm text-muted-foreground">
              {naoConciliados} movimentos do mês ainda sem conciliar. Dá para fechar assim, mas a
              diferença provavelmente está neles.
            </p>
          ) : null}

          {!podeAdministrar ? (
            <p className="text-sm text-muted-foreground">
              Só o administrador fecha e reabre o mês.
            </p>
          ) : fechadoEm && fechamentoId ? (
            <form action={acaoReabrir} className="space-y-3">
              <input type="hidden" name="id" value={fechamentoId} />
              <Erro>{estadoReabrir.erro}</Erro>
              <Sucesso>{estadoReabrir.ok}</Sucesso>
              <Campo
                rotulo="Motivo para reabrir"
                htmlFor="reabrir-motivo"
                dica="Fica registrado no fechamento."
              >
                <Input id="reabrir-motivo" name="motivo" required minLength={5} />
              </Campo>
              <BotaoEnviar variant="outline" enviando="…">
                Reabrir o mês
              </BotaoEnviar>
            </form>
          ) : (
            <form action={acaoFechar} className="space-y-3">
              <input type="hidden" name="competencia" value={competencia} />
              <input type="hidden" name="contaId" value={contaId} />
              <Erro>{estadoFechar.erro}</Erro>
              <Sucesso>{estadoFechar.ok}</Sucesso>
              <Grade>
                <Campo rotulo="Saldo inicial" htmlFor="fec-inicial" dica="Em reais.">
                  <Input
                    id="fec-inicial"
                    name="saldoInicial"
                    inputMode="decimal"
                    defaultValue={(saldoInicial / 100).toFixed(2).replace(".", ",")}
                    className="num tabular-nums"
                  />
                </Campo>
                <Campo
                  rotulo="Saldo final do extrato"
                  htmlFor="fec-extrato"
                  opcional dica="Para conferir."
                >
                  <Input
                    id="fec-extrato"
                    name="saldoFinalExtrato"
                    inputMode="decimal"
                    className="num tabular-nums"
                  />
                </Campo>
              </Grade>
              <BotaoEnviar enviando="Fechando…">Fechar o mês</BotaoEnviar>
              <p className="text-xs text-muted-foreground">
                Depois de fechado, nenhum título ou baixa desta competência pode ser mexido.
                Correção vira estorno no mês aberto.
              </p>
            </form>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
