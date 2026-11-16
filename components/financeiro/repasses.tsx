"use client";

import { useFormState } from "react-dom";
import { marcarRepasse } from "@/lib/acoes/vendas";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BotaoEnviar, Erro, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export type RepasseLinha = {
  id: string;
  numero: number;
  parcelas: number;
  valor: number;
  previsao: Date;
  aluno: string;
  curso: string;
  atrasado: boolean;
};

/**
 * Marcar o repasse é o que transforma a parcela do cartão em dinheiro no
 * caixa: a ação cria a baixa no título da venda.
 */
export function Repasses({
  repasses,
  contas,
  hoje,
  podeEscrever,
}: {
  repasses: RepasseLinha[];
  contas: Array<{ id: string; nome: string }>;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estado, acao] = useFormState(marcarRepasse, ESTADO_VAZIO);
  const total = repasses.reduce((a, r) => a + r.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repasses a cair</CardTitle>
        <p className="num text-sm text-muted-foreground tabular-nums">
          {formatBRL(total)} em {repasses.length} parcelas
        </p>
      </CardHeader>
      <CardBody>
        <Erro>{estado.erro}</Erro>
        <Sucesso>{estado.ok}</Sucesso>
        {repasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada pendente de repasse.</p>
        ) : (
          <Tabela minWidth={820}>
            <thead>
              <tr>
                <Th>Previsão</Th>
                <Th>Aluno</Th>
                <Th>Curso</Th>
                <Th>Parcela</Th>
                <Th numero>Valor</Th>
                <Th>{podeEscrever ? "Caiu em" : ""}</Th>
              </tr>
            </thead>
            <tbody>
              {repasses.map((r) => (
                <tr key={r.id}>
                  <Td className={r.atrasado ? "text-destructive" : ""}>
                    {dataCurta(r.previsao)}
                    {r.atrasado ? " · atrasado" : ""}
                  </Td>
                  <Td className="font-medium">{r.aluno}</Td>
                  <Td className="text-muted-foreground">{r.curso}</Td>
                  <Td>
                    {r.numero}/{r.parcelas}
                  </Td>
                  <Td numero>{formatBRL(r.valor)}</Td>
                  <Td>
                    {podeEscrever ? (
                      <form action={acao} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="repasseId" value={r.id} />
                        <Input
                          type="date"
                          name="data"
                          required
                          defaultValue={hoje}
                          aria-label={`Data em que o repasse de ${r.aluno} caiu`}
                          className="h-9 w-36"
                        />
                        <Select
                          name="contaId"
                          aria-label="Conta bancária"
                          className="h-9 w-40"
                        >
                          <option value="">Conta</option>
                          {contas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </Select>
                        <BotaoEnviar variant="outline" size="sm" enviando="…">
                          Caiu
                        </BotaoEnviar>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </CardBody>
    </Card>
  );
}
