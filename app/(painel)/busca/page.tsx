import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeRH, sessaoAtual } from "@/lib/permissoes";
import { formatBRL } from "@/lib/money";
import { CATEGORIA } from "@/lib/rotulos";
import { dataCurta } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChipStatus } from "@/components/financeiro/chip";
import { Cabecalho } from "@/components/financeiro/pagina";
import { AcaoDaLinha, Tabela, Td, Th } from "@/components/financeiro/tabela";
import { listarTitulos } from "@/lib/consultas";
import { Direcao } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BuscaPage({ searchParams }: { searchParams: { q?: string } }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const q = searchParams.q?.trim() ?? "";
  const contem = { contains: q, mode: "insensitive" as const };

  const [receber, pagar, clientes, fornecedores, vendas, colaboradores] = q
    ? await Promise.all([
        listarTitulos(Direcao.RECEBER, { q }),
        listarTitulos(Direcao.PAGAR, { q }),
        db.cliente.findMany({ where: { nome: contem }, take: 10, orderBy: { nome: "asc" } }),
        db.fornecedor.findMany({ where: { nome: contem }, take: 10, orderBy: { nome: "asc" } }),
        db.vendaSite.findMany({
          where: { OR: [{ aluno: contem }, { descricao: contem }] },
          take: 10,
          orderBy: { data: "desc" },
          include: { curso: true },
        }),
        podeRH(sessao.papel)
          ? db.colaborador.findMany({ where: { nome: contem }, take: 10, orderBy: { nome: "asc" } })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], [], []];

  const titulos = [
    ...receber.map((t) => ({ ...t, base: "/receber" })),
    ...pagar.map((t) => ({ ...t, base: "/pagar" })),
  ].slice(0, 40);

  const nada =
    q &&
    titulos.length === 0 &&
    clientes.length === 0 &&
    fornecedores.length === 0 &&
    vendas.length === 0 &&
    colaboradores.length === 0;

  return (
    <>
      <Cabecalho
        titulo="Busca"
        descricao="Procura em títulos, clientes, fornecedores, vendas do site e, para o RH, colaboradores."
      />
      <form method="get" action="/financeiro/busca" className="mb-6 flex items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            O que você procura
          </label>
          <Input id="q" name="q" defaultValue={q} autoFocus placeholder="Nome, descrição, contrato" />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      {!q ? (
        <p className="text-sm text-muted-foreground">Digite algo para procurar.</p>
      ) : nada ? (
        <p className="text-sm text-muted-foreground">Nada encontrado para “{q}”.</p>
      ) : (
        <div className="space-y-6">
          {titulos.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Títulos</CardTitle>
              </CardHeader>
              <CardBody>
                <Tabela minWidth={820}>
                  <thead>
                    <tr>
                      <Th>Direção</Th>
                      <Th>Descrição</Th>
                      <Th>Quem</Th>
                      <Th>Categoria</Th>
                      <Th>Vence</Th>
                      <Th numero>Valor</Th>
                      <Th>Status</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {titulos.map((t) => (
                      <tr key={t.id}>
                        <Td className="text-muted-foreground">
                          {t.direcao === "RECEBER" ? "A receber" : "A pagar"}
                        </Td>
                        <Td className="font-medium">{t.descricao}</Td>
                        <Td className="text-muted-foreground">
                          {t.cliente?.nome ?? t.fornecedor?.nome ?? "—"}
                        </Td>
                        <Td className="text-muted-foreground">{CATEGORIA[t.categoria]}</Td>
                        <Td>{dataCurta(t.vencimento)}</Td>
                        <Td numero>{formatBRL(t.valor)}</Td>
                        <Td>
                          <ChipStatus status={t.status} />
                        </Td>
                        <Td>
                          <AcaoDaLinha href={`${t.base}/${t.id}`} oQue={t.descricao}>
                            Abrir
                          </AcaoDaLinha>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              </CardBody>
            </Card>
          ) : null}

          {vendas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Vendas do site</CardTitle>
              </CardHeader>
              <CardBody>
                <Tabela minWidth={620}>
                  <thead>
                    <tr>
                      <Th>Data</Th>
                      <Th>Aluno</Th>
                      <Th>Curso</Th>
                      <Th numero>Líquido</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.map((v) => (
                      <tr key={v.id}>
                        <Td>{dataCurta(v.data)}</Td>
                        <Td className="font-medium">{v.aluno}</Td>
                        <Td className="text-muted-foreground">
                          {v.curso?.nome ?? v.descricao ?? "—"}
                        </Td>
                        <Td numero>{formatBRL(v.liquido)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              </CardBody>
            </Card>
          ) : null}

          {clientes.length > 0 || fornecedores.length > 0 || colaboradores.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Cadastros</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                {clientes.map((c) => (
                  <p key={c.id}>
                    <span className="text-muted-foreground">Cliente · </span>
                    <Link
                      href="/cadastros"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </p>
                ))}
                {fornecedores.map((f) => (
                  <p key={f.id}>
                    <span className="text-muted-foreground">Fornecedor · </span>
                    <Link
                      href="/cadastros"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {f.nome}
                    </Link>
                  </p>
                ))}
                {colaboradores.map((c) => (
                  <p key={c.id}>
                    <span className="text-muted-foreground">Colaborador · </span>
                    <Link
                      href={`/rh/${c.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </p>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
