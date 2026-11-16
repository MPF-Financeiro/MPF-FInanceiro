"use client";

import { useFormState } from "react-dom";
import { cancelarVoucher, marcarVoucherUtilizado, salvarVoucher } from "@/lib/acoes/cadastros";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Carimbo } from "@/components/financeiro/chip";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export type VoucherLinha = {
  id: string;
  emissor: string;
  codigo: string;
  cliente: string | null;
  valor: number;
  emissao: Date;
  utilizacao: Date | null;
  repassePrevisto: Date | null;
  recebido: boolean;
  cancelado: boolean;
  tituloId: string | null;
};

function data(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Vouchers({
  vouchers,
  clientes,
  empresas,
  hoje,
  podeEscrever,
}: {
  vouchers: VoucherLinha[];
  clientes: Array<{ id: string; nome: string }>;
  empresas: Array<{ id: string; nome: string }>;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estadoNovo, acaoNovo] = useFormState(salvarVoucher, ESTADO_VAZIO);
  const [estadoUso, acaoUso] = useFormState(marcarVoucherUtilizado, ESTADO_VAZIO);
  const [estadoCancelar, acaoCancelar] = useFormState(cancelarVoucher, ESTADO_VAZIO);

  const pendentes = vouchers.filter((v) => !v.utilizacao && !v.cancelado);
  const aguardando = vouchers.filter((v) => v.utilizacao && !v.recebido && !v.cancelado);
  const total = (lista: VoucherLinha[]) => lista.reduce((a, v) => a + v.valor, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{vouchers.length} vouchers</CardTitle>
          <p className="num text-sm text-muted-foreground tabular-nums">
            {formatBRL(total(pendentes))} por utilizar · {formatBRL(total(aguardando))} aguardando
            repasse
          </p>
        </CardHeader>
        <CardBody>
          <Erro>{estadoUso.erro}</Erro>
          <Sucesso>{estadoUso.ok}</Sucesso>
          <Erro>{estadoCancelar.erro}</Erro>
          <Sucesso>{estadoCancelar.ok}</Sucesso>
          <Tabela minWidth={960}>
            <thead>
              <tr>
                <Th>Emissor</Th>
                <Th>Código</Th>
                <Th>Cliente</Th>
                <Th numero>Valor</Th>
                <Th>Emissão</Th>
                <Th>Utilizado</Th>
                <Th>Repasse previsto</Th>
                <Th>Situação</Th>
                <Th>{podeEscrever ? "Marcar uso" : ""}</Th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <Td className="font-medium">{v.emissor}</Td>
                  <Td className="num tabular-nums">{v.codigo}</Td>
                  <Td className="text-muted-foreground">{v.cliente ?? "—"}</Td>
                  <Td numero>{formatBRL(v.valor)}</Td>
                  <Td>{data(v.emissao)}</Td>
                  <Td>{data(v.utilizacao)}</Td>
                  <Td>{data(v.repassePrevisto)}</Td>
                  <Td>
                    {v.cancelado ? (
                      <Carimbo neutro>Cancelado</Carimbo>
                    ) : v.recebido ? (
                      <Carimbo>Repasse recebido</Carimbo>
                    ) : v.utilizacao ? (
                      <span className="chip chip-warn">Aguardando repasse</span>
                    ) : (
                      <span className="chip chip-info">Por utilizar</span>
                    )}
                  </Td>
                  <Td>
                    {podeEscrever && !v.utilizacao && !v.cancelado ? (
                      <form action={acaoUso} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="empresaId" value={empresas[0]?.id ?? ""} />
                        <Input
                          type="date"
                          name="utilizacao"
                          required
                          defaultValue={hoje}
                          aria-label={`Data de utilização do voucher ${v.codigo}`}
                          className="h-9 w-36"
                        />
                        <BotaoEnviar variant="outline" size="sm" enviando="…">
                          Utilizado
                        </BotaoEnviar>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
              {vouchers.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">Nenhum voucher cadastrado.</Td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>
          <p className="mt-4 text-sm text-muted-foreground">
            Voucher utilizado vira um título a receber com vencimento na data prevista de repasse.
            O caixa só muda quando a baixa desse título for registrada em contas a receber.
          </p>
        </CardBody>
      </Card>

      {podeEscrever ? (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar voucher</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={acaoNovo} className="space-y-4">
              <Erro>{estadoNovo.erro}</Erro>
              <Sucesso>{estadoNovo.ok}</Sucesso>
              <Grade colunas={3}>
                <Campo rotulo="Emissor" htmlFor="v-emissor" dica="Empresa ou órgão que emitiu.">
                  <Input id="v-emissor" name="emissor" required />
                </Campo>
                <Campo rotulo="Código" htmlFor="v-codigo">
                  <Input id="v-codigo" name="codigo" required className="num tabular-nums" />
                </Campo>
                <Campo rotulo="Cliente" htmlFor="v-cliente" dica="Opcional.">
                  <Select id="v-cliente" name="clienteId">
                    <option value="">Sem cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo rotulo="Valor" htmlFor="v-valor" dica="Em reais.">
                  <Input
                    id="v-valor"
                    name="valor"
                    required
                    inputMode="decimal"
                    className="num tabular-nums"
                  />
                </Campo>
                <Campo rotulo="Emissão" htmlFor="v-emissao">
                  <Input id="v-emissao" name="emissao" type="date" required defaultValue={hoje} />
                </Campo>
                <Campo rotulo="Repasse previsto" htmlFor="v-repasse" dica="Opcional.">
                  <Input id="v-repasse" name="repassePrevisto" type="date" />
                </Campo>
              </Grade>
              <Campo rotulo="Observações" htmlFor="v-obs" dica="Opcional.">
                <Textarea id="v-obs" name="observacoes" />
              </Campo>
              <BotaoEnviar enviando="Salvando…">Cadastrar voucher</BotaoEnviar>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
