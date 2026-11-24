import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeAdministrar, podeLancar, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, paraInputDate } from "@/lib/mes";
import { Cabecalho } from "@/components/financeiro/pagina";
import {
  Clientes,
  Contratos,
  EmpresasEContas,
  Unidades,
  Fornecedores,
} from "@/components/financeiro/cadastros-ui";

export const dynamic = "force-dynamic";

export default async function CadastrosPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel)) redirect("/");

  const [empresas, contas, clientes, fornecedores, contratos, unidades] = await Promise.all([
    db.empresa.findMany({ orderBy: { nome: "asc" } }),
    db.contaBancaria.findMany({ orderBy: { apelido: "asc" }, include: { empresa: true } }),
    db.cliente.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      include: { _count: { select: { titulos: true } } },
    }),
    db.fornecedor.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    db.contrato.findMany({
      orderBy: { numero: "asc" },
      include: { cliente: true, _count: { select: { titulos: true } } },
    }),
    db.unidadeNegocio.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { titulos: true } } } }),
  ]);

  const hoje = paraInputDate(hojeUTC());
  const opcoesEmpresa = empresas
    .filter((e) => e.ativa)
    .map((e) => ({ id: e.id, nome: e.nome }));

  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        descricao="A base que os lançamentos usam: clientes, fornecedores, contratos, empresas, contas bancárias e unidades de negócio."
      />
      <div className="space-y-6">
        <Clientes
          clientes={clientes.map((c) => ({
            id: c.id,
            nome: c.nome,
            documento: c.documento,
            contato: c.contato,
            telefone: c.telefone,
            ativo: c.ativo,
            empresaId: c.empresaId,
            titulos: c._count.titulos,
          }))}
          empresas={opcoesEmpresa}
        />
        <Fornecedores
          fornecedores={fornecedores.map((f) => ({
            id: f.id,
            nome: f.nome,
            documento: f.documento,
            categoria: f.categoria,
            ativo: f.ativo,
          }))}
        />
        <Contratos
          contratos={contratos.map((c) => ({
            id: c.id,
            numero: c.numero,
            servico: c.servico,
            cliente: c.cliente.nome,
            valorTotal: c.valorTotal,
            parcelas: c.parcelas,
            inicio: c.inicio,
            fim: c.fim,
            titulosGerados: c._count.titulos,
          }))}
          clientes={clientes.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: c.nome }))}
          hoje={hoje}
        />
        <EmpresasEContas
          empresas={empresas.map((e) => ({
            id: e.id,
            nome: e.nome,
            cnpj: e.cnpj,
            ativa: e.ativa,
          }))}
          contas={contas.map((c) => ({
            id: c.id,
            apelido: c.apelido,
            banco: c.banco,
            agencia: c.agencia,
            numero: c.numero,
            empresa: c.empresa.nome,
            ativa: c.ativa,
            saldoInicial: c.saldoInicial,
            saldoInicialEm: c.saldoInicialEm,
          }))}
          podeAdministrar={podeAdministrar(sessao.papel)}
        />
        <Unidades
          unidades={unidades.map((u) => ({ id: u.id, nome: u.nome, ativa: u.ativa, titulos: u._count.titulos }))}
          podeAdministrar={podeAdministrar(sessao.papel)}
        />
      </div>
    </>
  );
}
