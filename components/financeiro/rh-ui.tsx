"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import type { StatusColaborador, TipoBeneficio } from "@prisma/client";
import {
  gerarTitulosDeBeneficios,
  salvarBeneficio,
  salvarBonificacao,
  salvarColaborador,
} from "@/lib/acoes/rh";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { STATUS_COLABORADOR, TIPO_BENEFICIO } from "@/lib/rotulos";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AreaDeFormulario,
  BotaoEnviar,
  Campo,
  Erro,
  Grade,
  Sucesso,
  TokenDoFormulario,
} from "@/components/financeiro/formulario";
import { AcaoDaLinha, Tabela, Td, Th } from "@/components/financeiro/tabela";

type Opcao = { id: string; nome: string };

function data(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Colaboradores({
  colaboradores,
  hoje,
  podeVerRemuneracao,
}: {
  colaboradores: Array<{
    id: string;
    nome: string;
    cargo: string;
    setor: string | null;
    admissao: Date;
    salario: number;
    status: StatusColaborador;
    cpf: string | null;
    email: string | null;
  }>;
  hoje: string;
  podeVerRemuneracao: boolean;
}) {
  const [estado, acao] = useFormState(salvarColaborador, ESTADO_VAZIO);
  const [edit, setEdit] = React.useState<(typeof colaboradores)[number] | null>(null);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Colaboradores</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            CPF e salário só aparecem para quem tem acesso de RH ou administrador, e não saem em
            exportação.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={820}>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Cargo</Th>
              <Th>Setor</Th>
              <Th>Admissão</Th>
              {podeVerRemuneracao ? <Th numero>Salário</Th> : null}
              <Th>Situação</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">
                  <Link
                    href={`/rh/${c.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {c.nome}
                  </Link>
                </Td>
                <Td>{c.cargo}</Td>
                <Td className="text-muted-foreground">{c.setor ?? "—"}</Td>
                <Td>{data(c.admissao)}</Td>
                {podeVerRemuneracao ? <Td numero>{formatBRL(c.salario)}</Td> : null}
                <Td className="text-muted-foreground">{STATUS_COLABORADOR[c.status]}</Td>
                <Td>
                  <AcaoDaLinha oQue={`o colaborador ${c.nome}`} onClick={() => setEdit(c)}>
                    Editar
                  </AcaoDaLinha>
                </Td>
              </tr>
            ))}
            {colaboradores.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhum colaborador cadastrado.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        <AreaDeFormulario
          rotulo={edit ? "Editar colaborador" : "Novo colaborador"}
          abrirSozinho={Boolean(edit)}
        >
          <form action={acao} key={edit?.id ?? "novo"} className="space-y-4">
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
            <Grade colunas={3}>
              <Campo rotulo="Nome" htmlFor="col-nome">
                <Input id="col-nome" name="nome" required minLength={3} defaultValue={edit?.nome} />
              </Campo>
              <Campo rotulo="Cargo" htmlFor="col-cargo">
                <Input id="col-cargo" name="cargo" required defaultValue={edit?.cargo} />
              </Campo>
              <Campo rotulo="Setor" htmlFor="col-setor" opcional>
                <Input id="col-setor" name="setor" defaultValue={edit?.setor ?? ""} />
              </Campo>
              <Campo rotulo="Admissão" htmlFor="col-admissao">
                <Input
                  id="col-admissao"
                  name="admissao"
                  type="date"
                  required
                  defaultValue={
                    edit
                      ? `${edit.admissao.getUTCFullYear()}-${String(edit.admissao.getUTCMonth() + 1).padStart(2, "0")}-${String(edit.admissao.getUTCDate()).padStart(2, "0")}`
                      : hoje
                  }
                />
              </Campo>
              <Campo rotulo="Salário" htmlFor="col-salario" dica="Em reais.">
                <Input
                  id="col-salario"
                  name="salario"
                  required
                  inputMode="decimal"
                  defaultValue={edit ? (edit.salario / 100).toFixed(2).replace(".", ",") : ""}
                  className="num tabular-nums"
                />
              </Campo>
              <Campo rotulo="Situação" htmlFor="col-status">
                <Select
                  id="col-status"
                  name="status"
                  required
                  defaultValue={edit?.status ?? "ATIVO"}
                >
                  {(Object.keys(STATUS_COLABORADOR) as StatusColaborador[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_COLABORADOR[s]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="CPF" htmlFor="col-cpf" opcional dica="Só números.">
                <Input
                  id="col-cpf"
                  name="cpf"
                  defaultValue={edit?.cpf ?? ""}
                  className="num tabular-nums"
                />
              </Campo>
              <Campo rotulo="E-mail" htmlFor="col-email" opcional>
                <Input id="col-email" name="email" type="email" defaultValue={edit?.email ?? ""} />
              </Campo>
            </Grade>
            <div className="flex flex-wrap items-center gap-3">
              <BotaoEnviar enviando="Salvando…">
                {edit ? "Salvar colaborador" : "Cadastrar colaborador"}
              </BotaoEnviar>
              {edit ? (
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Cadastrar um novo
                </button>
              ) : null}
            </div>
          </form>
        </AreaDeFormulario>
      </CardBody>
    </Card>
  );
}

export function Beneficios({
  beneficios,
  colaboradores,
  competencia,
  hoje,
}: {
  beneficios: Array<{
    id: string;
    colaborador: string;
    tipo: TipoBeneficio;
    previsto: number;
    temTitulo: boolean;
    pago: boolean;
  }>;
  colaboradores: Opcao[];
  competencia: string;
  hoje: string;
}) {
  const [estado, acao] = useFormState(salvarBeneficio, ESTADO_VAZIO);
  const [estadoGerar, acaoGerar] = useFormState(gerarTitulosDeBeneficios, ESTADO_VAZIO);
  const total = beneficios.reduce((a, b) => a + b.previsto, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Benefícios da competência</CardTitle>
          <p className="num mt-1 text-sm text-muted-foreground tabular-nums">
            {formatBRL(total)} em {beneficios.length} lançamentos
          </p>
        </div>
        <form action={acaoGerar} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="competencia" value={competencia} />
          <div>
            <label
              htmlFor="ben-venc"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Vencimento
            </label>
            <Input
              id="ben-venc"
              type="date"
              name="vencimento"
              required
              defaultValue={hoje}
              className="h-9 w-36"
            />
          </div>
          <BotaoEnviar variant="outline" size="sm" enviando="…">
            Gerar contas a pagar
          </BotaoEnviar>
        </form>
      </CardHeader>
      <CardBody className="space-y-5">
        <Erro>{estadoGerar.erro}</Erro>
        <Sucesso>{estadoGerar.ok}</Sucesso>
        <Tabela minWidth={620}>
          <thead>
            <tr>
              <Th>Colaborador</Th>
              <Th>Benefício</Th>
              <Th numero>Previsto</Th>
              <Th>No Financeiro</Th>
            </tr>
          </thead>
          <tbody>
            {beneficios.map((b) => (
              <tr key={b.id}>
                <Td className="font-medium">{b.colaborador}</Td>
                <Td>{TIPO_BENEFICIO[b.tipo]}</Td>
                <Td numero>{formatBRL(b.previsto)}</Td>
                <Td className="text-muted-foreground">
                  {b.pago ? "Pago" : b.temTitulo ? "Conta gerada" : "Ainda não gerado"}
                </Td>
              </tr>
            ))}
            {beneficios.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhum benefício nesta competência.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        <AreaDeFormulario rotulo="Lançar benefício do mês">
          <form action={acao} className="space-y-4">
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Colaborador" htmlFor="ben-col">
                <Select id="ben-col" name="colaboradorId" required>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Benefício" htmlFor="ben-tipo">
                <Select id="ben-tipo" name="tipo" required>
                  {(Object.keys(TIPO_BENEFICIO) as TipoBeneficio[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_BENEFICIO[t]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Competência" htmlFor="ben-comp">
                <Input
                  id="ben-comp"
                  name="competencia"
                  type="month"
                  required
                  defaultValue={competencia}
                />
              </Campo>
              <Campo rotulo="Valor previsto" htmlFor="ben-valor" dica="Em reais.">
                <Input
                  id="ben-valor"
                  name="previsto"
                  required
                  inputMode="decimal"
                  className="num tabular-nums"
                />
              </Campo>
            </Grade>
            <BotaoEnviar enviando="Salvando…">Lançar benefício</BotaoEnviar>
          </form>
        </AreaDeFormulario>
      </CardBody>
    </Card>
  );
}

export function Bonificacoes({
  bonificacoes,
  colaboradores,
  competencia,
}: {
  bonificacoes: Array<{
    id: string;
    colaborador: string;
    referencia: string;
    valorConta: number;
    valor: number;
    naFolha: boolean;
  }>;
  colaboradores: Opcao[];
  competencia: string;
}) {
  const [estado, acao] = useFormState(salvarBonificacao, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bonificações por conta trazida</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ou entra na folha, ou vira uma conta a pagar própria. Nunca os dois, para não pagar duas
            vezes.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={720}>
          <thead>
            <tr>
              <Th>Colaborador</Th>
              <Th>Referência</Th>
              <Th numero>Valor da conta</Th>
              <Th numero>Bonificação</Th>
              <Th>Como é paga</Th>
            </tr>
          </thead>
          <tbody>
            {bonificacoes.map((b) => (
              <tr key={b.id}>
                <Td className="font-medium">{b.colaborador}</Td>
                <Td className="text-muted-foreground">{b.referencia}</Td>
                <Td numero>{b.valorConta > 0 ? formatBRL(b.valorConta) : "—"}</Td>
                <Td numero>{formatBRL(b.valor)}</Td>
                <Td className="text-muted-foreground">
                  {b.naFolha ? "No líquido da folha" : "Conta a pagar própria"}
                </Td>
              </tr>
            ))}
            {bonificacoes.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhuma bonificação nesta competência.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        <AreaDeFormulario rotulo="Lançar bonificação">
          <form action={acao} className="space-y-4">
            <TokenDoFormulario />
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Colaborador" htmlFor="bon-col">
                <Select id="bon-col" name="colaboradorId" required>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Referência" htmlFor="bon-ref" dica="Cliente, conta ou venda.">
                <Input id="bon-ref" name="referencia" required />
              </Campo>
              <Campo rotulo="Competência" htmlFor="bon-comp">
                <Input
                  id="bon-comp"
                  name="competencia"
                  type="month"
                  required
                  defaultValue={competencia}
                />
              </Campo>
              <Campo rotulo="Valor da conta" htmlFor="bon-conta" opcional dica="Para referência.">
                <Input
                  id="bon-conta"
                  name="valorConta"
                  inputMode="decimal"
                  className="num tabular-nums"
                />
              </Campo>
              <Campo rotulo="Bonificação" htmlFor="bon-valor" dica="Em reais.">
                <Input
                  id="bon-valor"
                  name="valor"
                  required
                  inputMode="decimal"
                  className="num tabular-nums"
                />
              </Campo>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="naFolha"
                    defaultChecked
                    className="size-4 rounded border-input"
                  />
                  Pagar dentro da folha
                </label>
              </div>
            </Grade>
            <BotaoEnviar enviando="Salvando…">Lançar bonificação</BotaoEnviar>
          </form>
        </AreaDeFormulario>
      </CardBody>
    </Card>
  );
}
