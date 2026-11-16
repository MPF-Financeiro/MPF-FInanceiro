"use client";

import { useFormState } from "react-dom";
import type { Direcao } from "@prisma/client";
import type { TituloDetalhado } from "@/lib/consultas";
import { cancelarTitulo, darBaixa, estornarBaixa } from "@/lib/acoes/titulos";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL, type LinhaCascata } from "@/lib/money";
import { CATEGORIA, FORMA, ORIGEM } from "@/lib/rotulos";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Cascata } from "@/components/financeiro/cascata";
import { ChipStatus } from "@/components/financeiro/chip";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

function dataLonga(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}/${d.getUTCFullYear()}`;
}

export function DetalheTitulo({
  titulo,
  contas,
  hoje,
  podeEscrever,
}: {
  titulo: TituloDetalhado;
  contas: Array<{ id: string; nome: string }>;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estadoBaixa, acaoBaixa] = useFormState(darBaixa, ESTADO_VAZIO);
  const [estadoEstorno, acaoEstorno] = useFormState(estornarBaixa, ESTADO_VAZIO);
  const [estadoCancelar, acaoCancelar] = useFormState(cancelarTitulo, ESTADO_VAZIO);

  const entrada: Direcao = titulo.direcao;
  const palavraBaixa = entrada === "RECEBER" ? "recebimento" : "pagamento";
  const linhas: LinhaCascata[] = [
    { rotulo: "Valor do título", valor: titulo.valor },
    ...titulo.baixas.map((b) => ({
      rotulo: b.valor < 0 ? `Estorno de ${dataCurta(b.data)}` : `${entrada === "RECEBER" ? "Recebido" : "Pago"} em ${dataCurta(b.data)}`,
      valor: -b.valor,
    })),
    { rotulo: "Pendente", valor: titulo.pendente, total: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{titulo.descricao}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {CATEGORIA[titulo.categoria]} · {titulo.empresa.nome} · lançado por{" "}
                {titulo.criadoPor?.nome ?? "—"} · {ORIGEM[titulo.origem]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChipStatus
                status={titulo.status}
                rotulo={
                  entrada === "PAGAR" && titulo.status === "QUITADO" ? "Pago" : undefined
                }
              />
            </div>
          </CardHeader>
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Dado rotulo={entrada === "RECEBER" ? "Cliente" : "Fornecedor"}>
                {entrada === "RECEBER"
                  ? (titulo.cliente?.nome ?? "—")
                  : (titulo.fornecedor?.nome ?? titulo.colaborador?.nome ?? "—")}
              </Dado>
              <Dado rotulo="Contrato">{titulo.contrato?.numero ?? "—"}</Dado>
              <Dado rotulo="Forma prevista">{titulo.forma ? FORMA[titulo.forma] : "—"}</Dado>
              <Dado rotulo="Competência">
                {`${String(titulo.competencia.getUTCMonth() + 1).padStart(2, "0")}/${titulo.competencia.getUTCFullYear()}`}
              </Dado>
              <Dado rotulo="Vencimento">{dataLonga(titulo.vencimento)}</Dado>
              <Dado rotulo="Valor">{formatBRL(titulo.valor)}</Dado>
            </dl>
            {titulo.observacoes ? (
              <p className="mt-5 whitespace-pre-line rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                {titulo.observacoes}
              </p>
            ) : null}
            {titulo.motivoCancelamento ? (
              <p className="mt-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                <strong>Motivo do cancelamento:</strong> {titulo.motivoCancelamento}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Cascata titulo="A conta aberta" linhas={linhas} className="self-start" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de {palavraBaixa}s</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nada é apagado: uma baixa errada é estornada por outra, negativa, com motivo.
          </p>
        </CardHeader>
        <CardBody>
          {titulo.baixas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum {palavraBaixa} registrado ainda.
            </p>
          ) : (
            <>
              <Erro>{estadoEstorno.erro}</Erro>
              <Sucesso>{estadoEstorno.ok}</Sucesso>
              <Tabela minWidth={760}>
                <thead>
                  <tr>
                    <Th>Data</Th>
                    <Th numero>Valor</Th>
                    <Th>Forma</Th>
                    <Th>Conta</Th>
                    <Th>Quem registrou</Th>
                    <Th>Motivo</Th>
                    <Th>{podeEscrever ? "Estorno" : ""}</Th>
                  </tr>
                </thead>
                <tbody>
                  {titulo.baixas.map((b) => (
                    <tr key={b.id}>
                      <Td>{dataLonga(b.data)}</Td>
                      <Td numero className={b.valor < 0 ? "text-destructive" : ""}>
                        {b.valor < 0 ? `− ${formatBRL(-b.valor)}` : formatBRL(b.valor)}
                      </Td>
                      <Td>{FORMA[b.forma]}</Td>
                      <Td className="text-muted-foreground">{b.conta?.apelido ?? "—"}</Td>
                      <Td className="text-muted-foreground">{b.registradoPor?.nome ?? "—"}</Td>
                      <Td className="text-muted-foreground">{b.motivo ?? "—"}</Td>
                      <Td>
                        {b.estornadaPor ? (
                          <span className="chip chip-plain">Estornada</span>
                        ) : podeEscrever && b.valor > 0 ? (
                          <form action={acaoEstorno} className="flex items-center gap-2">
                            <input type="hidden" name="baixaId" value={b.id} />
                            <input type="hidden" name="data" value={hoje} />
                            <Input
                              name="motivo"
                              required
                              minLength={5}
                              placeholder="Motivo"
                              aria-label={`Motivo do estorno da baixa de ${dataLonga(b.data)}`}
                              className="h-9 w-40"
                            />
                            <BotaoEnviar variant="outline" size="sm" enviando="…">
                              Estornar
                            </BotaoEnviar>
                          </form>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabela>
            </>
          )}
        </CardBody>
      </Card>

      {podeEscrever && !titulo.canceladoEm && titulo.pendente > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Registrar {palavraBaixa}</CardTitle>
            <p className="num text-sm text-muted-foreground tabular-nums">
              Pendente: {formatBRL(titulo.pendente)}
            </p>
          </CardHeader>
          <CardBody>
            <form action={acaoBaixa} className="space-y-4">
              <input type="hidden" name="tituloId" value={titulo.id} />
              <Erro>{estadoBaixa.erro}</Erro>
              <Sucesso>{estadoBaixa.ok}</Sucesso>
              <Grade colunas={3}>
                <Campo rotulo="Valor" htmlFor="valor" dica="Pode ser parcial.">
                  <Input
                    id="valor"
                    name="valor"
                    required
                    inputMode="decimal"
                    defaultValue={(titulo.pendente / 100).toFixed(2).replace(".", ",")}
                    className="num tabular-nums"
                  />
                </Campo>
                <Campo rotulo="Data" htmlFor="data" dica="Quando o dinheiro andou.">
                  <Input id="data" name="data" type="date" required defaultValue={hoje} />
                </Campo>
                <Campo rotulo="Forma" htmlFor="forma">
                  <Select
                    id="forma"
                    name="forma"
                    required
                    defaultValue={titulo.forma ?? "PIX"}
                  >
                    {(Object.keys(FORMA) as Array<keyof typeof FORMA>).map((f) => (
                      <option key={f} value={f}>
                        {FORMA[f]}
                      </option>
                    ))}
                  </Select>
                </Campo>
              </Grade>
              <Grade>
                <Campo rotulo="Conta bancária" htmlFor="contaId" opcional>
                  <Select id="contaId" name="contaId">
                    <option value="">Não informar</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo rotulo="Comprovante" htmlFor="comprovante" dica="Link ou número do documento.">
                  <Input id="comprovante" name="comprovante" />
                </Campo>
              </Grade>
              <BotaoEnviar enviando="Registrando…">
                Registrar {palavraBaixa}
              </BotaoEnviar>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {podeEscrever && !titulo.canceladoEm && titulo.recebido === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cancelar este título</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={acaoCancelar} className="space-y-4">
              <input type="hidden" name="id" value={titulo.id} />
              <Erro>{estadoCancelar.erro}</Erro>
              <Sucesso>{estadoCancelar.ok}</Sucesso>
              <Campo
                rotulo="Motivo"
                htmlFor="motivo"
                dica="O título continua na lista, carimbado, com este motivo. Nada é apagado."
              >
                <Textarea id="motivo" name="motivo" required minLength={5} />
              </Campo>
              <BotaoEnviar variant="outline" enviando="Cancelando…">
                Cancelar título
              </BotaoEnviar>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
