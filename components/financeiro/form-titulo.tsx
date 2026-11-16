"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import type { Categoria, Direcao } from "@prisma/client";
import { lancarTitulo } from "@/lib/acoes/titulos";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { dividirRepasses, formatBRL } from "@/lib/money";
import { parseCentavos } from "@/lib/validacao";
import { CATEGORIA, FORMA } from "@/lib/rotulos";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BotaoEnviar, Campo, Erro, Grade, LinhaDeAcoes } from "@/components/financeiro/formulario";

export type OpcaoSimples = { id: string; nome: string };
export type OpcaoContrato = { id: string; nome: string; clienteId: string };

export function FormTitulo({
  direcao,
  categorias,
  empresas,
  clientes,
  fornecedores,
  contratos,
  colaboradores,
  hoje,
  competencia,
}: {
  direcao: Direcao;
  categorias: Categoria[];
  empresas: OpcaoSimples[];
  clientes: OpcaoSimples[];
  fornecedores: OpcaoSimples[];
  contratos: OpcaoContrato[];
  colaboradores: OpcaoSimples[];
  hoje: string;
  competencia: string;
}) {
  const [estado, acao] = useFormState(lancarTitulo, ESTADO_VAZIO);
  const [valor, setValor] = React.useState("");
  const [parcelas, setParcelas] = React.useState(1);
  const [clienteId, setClienteId] = React.useState("");

  const centavos = parseCentavos(valor) ?? 0;
  const parcelado = parcelas > 1 && centavos > 0;
  const fatias = parcelado ? dividirRepasses(centavos, parcelas) : [];
  const voltar = direcao === "RECEBER" ? "/receber" : "/pagar";
  const contratosDoCliente = clienteId
    ? contratos.filter((c) => c.clienteId === clienteId)
    : contratos;

  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="direcao" value={direcao} />
      <Erro>{estado.erro}</Erro>

      <Card>
        <CardHeader>
          <CardTitle>{direcao === "RECEBER" ? "A conta" : "A despesa"}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Grade>
            <Campo rotulo="Empresa" htmlFor="empresaId">
              <Select id="empresaId" name="empresaId" required defaultValue={empresas[0]?.id ?? ""}>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo rotulo="Categoria" htmlFor="categoria">
              <Select id="categoria" name="categoria" required>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA[c]}
                  </option>
                ))}
              </Select>
            </Campo>
          </Grade>

          <Campo
            rotulo="Descrição"
            htmlFor="descricao"
            dica="O que a cliente vai procurar na lista depois. Ex.: “Social media — novembro”."
          >
            <Input id="descricao" name="descricao" required minLength={3} maxLength={200} />
          </Campo>

          {direcao === "RECEBER" ? (
            <Grade>
              <Campo rotulo="Cliente" htmlFor="clienteId">
                <Select
                  id="clienteId"
                  name="clienteId"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">Sem cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Contrato" htmlFor="contratoId" dica="Opcional.">
                <Select id="contratoId" name="contratoId">
                  <option value="">Sem contrato</option>
                  {contratosDoCliente.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
            </Grade>
          ) : (
            <Grade>
              <Campo rotulo="Fornecedor" htmlFor="fornecedorId">
                <Select id="fornecedorId" name="fornecedorId">
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo
                rotulo="Colaborador"
                htmlFor="colaboradorId"
                dica="Para salário, benefício ou bonificação de alguém."
              >
                <Select id="colaboradorId" name="colaboradorId">
                  <option value="">Não é de pessoa</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
            </Grade>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor e datas</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Grade colunas={3}>
            <Campo rotulo="Valor total" htmlFor="valor" dica="Em reais. Ex.: 1.250,00">
              <Input
                id="valor"
                name="valor"
                required
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="num tabular-nums"
              />
            </Campo>
            <Campo
              rotulo="Parcelas"
              htmlFor="parcelas"
              dica="Mais de uma gera um título por mês."
            >
              <Input
                id="parcelas"
                name="parcelas"
                type="number"
                min={1}
                max={36}
                value={parcelas}
                onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
                className="num tabular-nums"
              />
            </Campo>
            <Campo
              rotulo="Competência"
              htmlFor="competencia"
              dica="O mês a que a conta pertence."
            >
              <Input
                id="competencia"
                name="competencia"
                type="month"
                required
                defaultValue={competencia}
              />
            </Campo>
          </Grade>

          <Grade>
            <Campo
              rotulo="Primeiro vencimento"
              htmlFor="vencimento"
              dica="As parcelas seguintes vencem no mesmo dia dos meses seguintes."
            >
              <Input id="vencimento" name="vencimento" type="date" required defaultValue={hoje} />
            </Campo>
            <Campo rotulo="Forma prevista" htmlFor="forma" dica="Opcional.">
              <Select id="forma" name="forma">
                <option value="">A definir</option>
                {(Object.keys(FORMA) as Array<keyof typeof FORMA>).map((f) => (
                  <option key={f} value={f}>
                    {FORMA[f]}
                  </option>
                ))}
              </Select>
            </Campo>
          </Grade>

          {parcelado ? (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">
                {parcelas} títulos de {formatBRL(fatias[1] ?? fatias[0])}
                {fatias[0] !== fatias[1] && fatias.length > 1
                  ? `, e o primeiro de ${formatBRL(fatias[0])}`
                  : ""}
              </p>
              <p className="mt-1 text-muted-foreground">
                A soma fecha exatamente {formatBRL(centavos)}: o centavo que sobra da divisão fica
                na primeira parcela.
              </p>
            </div>
          ) : null}

          <Campo rotulo="Observações" htmlFor="observacoes" dica="Opcional.">
            <Textarea id="observacoes" name="observacoes" maxLength={2000} />
          </Campo>
        </CardBody>
      </Card>

      <LinhaDeAcoes>
        <BotaoEnviar enviando="Lançando…">
          {direcao === "RECEBER" ? "Lançar conta a receber" : "Lançar conta a pagar"}
        </BotaoEnviar>
        <Button asChild variant="ghost">
          <Link href={voltar}>Cancelar</Link>
        </Button>
      </LinhaDeAcoes>
    </form>
  );
}
