"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import {
  gerarTitulosDoContrato,
  salvarCliente,
  salvarConta,
  salvarContrato,
  salvarEmpresa,
  salvarFornecedor,
} from "@/lib/acoes/cadastros";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { CATEGORIA, CATEGORIAS_PAGAR } from "@/lib/rotulos";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

type Opcao = { id: string; nome: string };

function data(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function Caixa({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{titulo}</CardTitle>
          {descricao ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
      </CardHeader>
      <CardBody className="space-y-5">{children}</CardBody>
    </Card>
  );
}

function Caixinha({ nome, marcado, rotulo }: { nome: string; marcado: boolean; rotulo: string }) {
  return (
    <label className="flex items-center gap-2 pb-2 text-sm">
      <input
        type="checkbox"
        name={nome}
        defaultChecked={marcado}
        className="size-4 rounded border-input"
      />
      {rotulo}
    </label>
  );
}

export function Clientes({
  clientes,
  empresas,
}: {
  clientes: Array<{
    id: string;
    nome: string;
    documento: string | null;
    contato: string | null;
    telefone: string | null;
    ativo: boolean;
    empresaId: string;
    titulos: number;
  }>;
  empresas: Opcao[];
}) {
  const [estado, acao] = useFormState(salvarCliente, ESTADO_VAZIO);
  const [edit, setEdit] = React.useState<(typeof clientes)[number] | null>(null);

  return (
    <Caixa
      titulo="Clientes"
      descricao="Quem paga a Samps. O cliente aparece nos títulos a receber e nos contratos."
    >
      <Tabela minWidth={720}>
        <thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Documento</Th>
            <Th>Contato</Th>
            <Th numero>Títulos</Th>
            <Th>Situação</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.nome}</Td>
              <Td className="text-muted-foreground">{c.documento ?? "—"}</Td>
              <Td className="text-muted-foreground">
                {[c.contato, c.telefone].filter(Boolean).join(" · ") || "—"}
              </Td>
              <Td numero>{c.titulos}</Td>
              <Td className="text-muted-foreground">{c.ativo ? "Ativo" : "Inativo"}</Td>
              <Td>
                <button
                  type="button"
                  onClick={() => setEdit(c)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Editar
                </button>
              </Td>
            </tr>
          ))}
          {clientes.length === 0 ? (
            <tr>
              <Td className="text-muted-foreground">Nenhum cliente cadastrado.</Td>
            </tr>
          ) : null}
        </tbody>
      </Tabela>

      <form
        action={acao}
        key={edit?.id ?? "novo"}
        className="space-y-4 border-t border-border pt-5"
      >
        <Erro>{estado.erro}</Erro>
        <Sucesso>{estado.ok}</Sucesso>
        {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
        <Grade colunas={3}>
          <Campo rotulo="Nome" htmlFor="cliente-nome">
            <Input id="cliente-nome" name="nome" required defaultValue={edit?.nome} />
          </Campo>
          <Campo rotulo="Empresa" htmlFor="cliente-empresa">
            <Select
              id="cliente-empresa"
              name="empresaId"
              required
              defaultValue={edit?.empresaId ?? empresas[0]?.id}
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="CNPJ ou CPF" htmlFor="cliente-doc" dica="Opcional.">
            <Input id="cliente-doc" name="documento" defaultValue={edit?.documento ?? ""} />
          </Campo>
          <Campo rotulo="Pessoa de contato" htmlFor="cliente-contato" dica="Opcional.">
            <Input id="cliente-contato" name="contato" defaultValue={edit?.contato ?? ""} />
          </Campo>
          <Campo rotulo="Telefone" htmlFor="cliente-tel" dica="Opcional.">
            <Input id="cliente-tel" name="telefone" defaultValue={edit?.telefone ?? ""} />
          </Campo>
          <div className="flex items-end">
            <Caixinha nome="ativo" marcado={edit ? edit.ativo : true} rotulo="Ativo" />
          </div>
        </Grade>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoEnviar enviando="Salvando…">{edit ? "Salvar cliente" : "Cadastrar cliente"}</BotaoEnviar>
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
    </Caixa>
  );
}

export function Fornecedores({
  fornecedores,
}: {
  fornecedores: Array<{
    id: string;
    nome: string;
    documento: string | null;
    categoria: keyof typeof CATEGORIA;
    ativo: boolean;
  }>;
}) {
  const [estado, acao] = useFormState(salvarFornecedor, ESTADO_VAZIO);
  const [edit, setEdit] = React.useState<(typeof fornecedores)[number] | null>(null);

  return (
    <Caixa
      titulo="Fornecedores"
      descricao="Quem a Samps paga. A categoria preenchida aqui sugere a categoria do título."
    >
      <Tabela minWidth={620}>
        <thead>
          <tr>
            <Th>Fornecedor</Th>
            <Th>Documento</Th>
            <Th>Categoria</Th>
            <Th>Situação</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {fornecedores.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.nome}</Td>
              <Td className="text-muted-foreground">{f.documento ?? "—"}</Td>
              <Td className="text-muted-foreground">{CATEGORIA[f.categoria]}</Td>
              <Td className="text-muted-foreground">{f.ativo ? "Ativo" : "Inativo"}</Td>
              <Td>
                <button
                  type="button"
                  onClick={() => setEdit(f)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Editar
                </button>
              </Td>
            </tr>
          ))}
          {fornecedores.length === 0 ? (
            <tr>
              <Td className="text-muted-foreground">Nenhum fornecedor cadastrado.</Td>
            </tr>
          ) : null}
        </tbody>
      </Tabela>

      <form action={acao} key={edit?.id ?? "novo"} className="space-y-4 border-t border-border pt-5">
        <Erro>{estado.erro}</Erro>
        <Sucesso>{estado.ok}</Sucesso>
        {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
        <Grade colunas={3}>
          <Campo rotulo="Nome" htmlFor="forn-nome">
            <Input id="forn-nome" name="nome" required defaultValue={edit?.nome} />
          </Campo>
          <Campo rotulo="CNPJ ou CPF" htmlFor="forn-doc" dica="Opcional.">
            <Input id="forn-doc" name="documento" defaultValue={edit?.documento ?? ""} />
          </Campo>
          <Campo rotulo="Categoria" htmlFor="forn-cat">
            <Select id="forn-cat" name="categoria" required defaultValue={edit?.categoria}>
              {CATEGORIAS_PAGAR.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA[c]}
                </option>
              ))}
            </Select>
          </Campo>
          <div className="flex items-end">
            <Caixinha nome="ativo" marcado={edit ? edit.ativo : true} rotulo="Ativo" />
          </div>
        </Grade>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoEnviar enviando="Salvando…">
            {edit ? "Salvar fornecedor" : "Cadastrar fornecedor"}
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
    </Caixa>
  );
}

export function Contratos({
  contratos,
  clientes,
  hoje,
}: {
  contratos: Array<{
    id: string;
    numero: string;
    servico: string;
    cliente: string;
    valorTotal: number;
    parcelas: number;
    inicio: Date;
    fim: Date | null;
    titulosGerados: number;
  }>;
  clientes: Opcao[];
  hoje: string;
}) {
  const [estado, acao] = useFormState(salvarContrato, ESTADO_VAZIO);
  const [estadoGerar, acaoGerar] = useFormState(gerarTitulosDoContrato, ESTADO_VAZIO);

  return (
    <Caixa
      titulo="Contratos"
      descricao="O contrato guarda o combinado. Gerar as parcelas cria um título a receber por mês, sem duplicar se você gerar de novo."
    >
      <Erro>{estadoGerar.erro}</Erro>
      <Sucesso>{estadoGerar.ok}</Sucesso>
      <Tabela minWidth={900}>
        <thead>
          <tr>
            <Th>Contrato</Th>
            <Th>Cliente</Th>
            <Th>Serviço</Th>
            <Th numero>Valor</Th>
            <Th numero>Parcelas</Th>
            <Th>Vigência</Th>
            <Th numero>Títulos</Th>
            <Th>Gerar parcelas</Th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.numero}</Td>
              <Td>{c.cliente}</Td>
              <Td className="text-muted-foreground">{c.servico}</Td>
              <Td numero>{formatBRL(c.valorTotal)}</Td>
              <Td numero>{c.parcelas}</Td>
              <Td className="text-muted-foreground">
                {data(c.inicio)} → {c.fim ? data(c.fim) : "sem fim"}
              </Td>
              <Td numero>{c.titulosGerados}</Td>
              <Td>
                <form action={acaoGerar} className="flex items-center gap-2">
                  <input type="hidden" name="contratoId" value={c.id} />
                  <Input
                    type="date"
                    name="primeiroVencimento"
                    required
                    defaultValue={hoje}
                    aria-label={`Primeiro vencimento do contrato ${c.numero}`}
                    className="h-9 w-36"
                  />
                  <BotaoEnviar variant="outline" size="sm" enviando="…">
                    Gerar
                  </BotaoEnviar>
                </form>
              </Td>
            </tr>
          ))}
          {contratos.length === 0 ? (
            <tr>
              <Td className="text-muted-foreground">Nenhum contrato cadastrado.</Td>
            </tr>
          ) : null}
        </tbody>
      </Tabela>

      <form action={acao} className="space-y-4 border-t border-border pt-5">
        <Erro>{estado.erro}</Erro>
        <Sucesso>{estado.ok}</Sucesso>
        <Grade colunas={3}>
          <Campo rotulo="Cliente" htmlFor="contrato-cliente">
            <Select id="contrato-cliente" name="clienteId" required>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Número" htmlFor="contrato-numero">
            <Input id="contrato-numero" name="numero" required />
          </Campo>
          <Campo rotulo="Serviço" htmlFor="contrato-servico">
            <Input id="contrato-servico" name="servico" required minLength={3} />
          </Campo>
          <Campo rotulo="Valor total" htmlFor="contrato-valor" dica="Em reais.">
            <Input
              id="contrato-valor"
              name="valorTotal"
              required
              inputMode="decimal"
              className="num tabular-nums"
            />
          </Campo>
          <Campo rotulo="Parcelas" htmlFor="contrato-parcelas">
            <Input
              id="contrato-parcelas"
              name="parcelas"
              type="number"
              min={1}
              max={60}
              defaultValue={1}
              className="num tabular-nums"
            />
          </Campo>
          <Campo rotulo="Início" htmlFor="contrato-inicio">
            <Input id="contrato-inicio" name="inicio" type="date" required defaultValue={hoje} />
          </Campo>
          <Campo rotulo="Fim" htmlFor="contrato-fim" dica="Opcional.">
            <Input id="contrato-fim" name="fim" type="date" />
          </Campo>
          <Campo rotulo="Arquivo assinado" htmlFor="contrato-arquivo" dica="Link do PDF. Opcional.">
            <Input id="contrato-arquivo" name="arquivo" />
          </Campo>
        </Grade>
        <Campo rotulo="Observações" htmlFor="contrato-obs" dica="Opcional.">
          <Textarea id="contrato-obs" name="observacoes" />
        </Campo>
        <BotaoEnviar enviando="Salvando…">Cadastrar contrato</BotaoEnviar>
      </form>
    </Caixa>
  );
}

export function EmpresasEContas({
  empresas,
  contas,
  podeAdministrar,
}: {
  empresas: Array<{ id: string; nome: string; cnpj: string; ativa: boolean }>;
  contas: Array<{
    id: string;
    apelido: string;
    banco: string;
    agencia: string | null;
    numero: string | null;
    empresa: string;
    ativa: boolean;
  }>;
  podeAdministrar: boolean;
}) {
  const [estadoEmpresa, acaoEmpresa] = useFormState(salvarEmpresa, ESTADO_VAZIO);
  const [estadoConta, acaoConta] = useFormState(salvarConta, ESTADO_VAZIO);

  return (
    <Caixa
      titulo="Empresas e contas bancárias"
      descricao="As empresas do grupo e as contas em que o dinheiro entra e sai. A conta aparece na baixa e na conciliação."
    >
      <Tabela minWidth={620}>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>CNPJ</Th>
            <Th>Situação</Th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((e) => (
            <tr key={e.id}>
              <Td className="font-medium">{e.nome}</Td>
              <Td className="num tabular-nums">{e.cnpj}</Td>
              <Td className="text-muted-foreground">{e.ativa ? "Ativa" : "Inativa"}</Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      <Tabela minWidth={620}>
        <thead>
          <tr>
            <Th>Conta</Th>
            <Th>Banco</Th>
            <Th>Agência e número</Th>
            <Th>Empresa</Th>
            <Th>Situação</Th>
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.apelido}</Td>
              <Td>{c.banco}</Td>
              <Td className="num text-muted-foreground tabular-nums">
                {[c.agencia, c.numero].filter(Boolean).join(" / ") || "—"}
              </Td>
              <Td className="text-muted-foreground">{c.empresa}</Td>
              <Td className="text-muted-foreground">{c.ativa ? "Ativa" : "Inativa"}</Td>
            </tr>
          ))}
          {contas.length === 0 ? (
            <tr>
              <Td className="text-muted-foreground">Nenhuma conta cadastrada.</Td>
            </tr>
          ) : null}
        </tbody>
      </Tabela>

      {podeAdministrar ? (
        <div className="grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
          <form action={acaoEmpresa} className="space-y-4">
            <p className="text-sm font-semibold">Nova empresa</p>
            <Erro>{estadoEmpresa.erro}</Erro>
            <Sucesso>{estadoEmpresa.ok}</Sucesso>
            <Campo rotulo="Nome" htmlFor="emp-nome">
              <Input id="emp-nome" name="nome" required />
            </Campo>
            <Campo rotulo="CNPJ" htmlFor="emp-cnpj" dica="Só números bastam.">
              <Input id="emp-cnpj" name="cnpj" required className="num tabular-nums" />
            </Campo>
            <Caixinha nome="ativa" marcado rotulo="Ativa" />
            <BotaoEnviar enviando="Salvando…">Cadastrar empresa</BotaoEnviar>
          </form>

          <form action={acaoConta} className="space-y-4">
            <p className="text-sm font-semibold">Nova conta bancária</p>
            <Erro>{estadoConta.erro}</Erro>
            <Sucesso>{estadoConta.ok}</Sucesso>
            <Campo rotulo="Empresa" htmlFor="conta-empresa">
              <Select id="conta-empresa" name="empresaId" required>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Grade>
              <Campo rotulo="Apelido" htmlFor="conta-apelido" dica="Como a cliente chama a conta.">
                <Input id="conta-apelido" name="apelido" required />
              </Campo>
              <Campo rotulo="Banco" htmlFor="conta-banco">
                <Input id="conta-banco" name="banco" required />
              </Campo>
              <Campo rotulo="Agência" htmlFor="conta-ag" dica="Opcional.">
                <Input id="conta-ag" name="agencia" />
              </Campo>
              <Campo rotulo="Número" htmlFor="conta-num" dica="Opcional.">
                <Input id="conta-num" name="numero" />
              </Campo>
            </Grade>
            <Caixinha nome="ativa" marcado rotulo="Ativa" />
            <BotaoEnviar enviando="Salvando…">Cadastrar conta</BotaoEnviar>
          </form>
        </div>
      ) : (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          Só o administrador cadastra empresa e conta bancária.
        </p>
      )}
    </Caixa>
  );
}
