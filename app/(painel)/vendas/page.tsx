import { listarVendas } from "@/lib/consultas";
import { formatBRL, type LinhaCascata } from "@/lib/money";
import { competenciaLonga, dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Cascata } from "@/components/financeiro/cascata";
import { Cabecalho, Numero } from "@/components/financeiro/pagina";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const hoje = new Date();
  const vendas = await listarVendas(hoje);
  const pix = vendas.filter((v) => v.meio === "PIX");
  const cartao = vendas.filter((v) => v.meio === "CARTAO");

  const soma = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
  const totalPix = soma(pix.map((v) => v.liquido));
  const totalCartao = soma(cartao.map((v) => v.liquido));
  const totalTaxas = soma(vendas.map((v) => v.nota + v.taxa));
  const aRepassar = soma(
    vendas.flatMap((v) => v.repasses).filter((r) => !r.efetivo).map((r) => r.valor)
  );

  // A conta aberta da primeira venda, que é o que a cliente pediu para ver.
  const exemplo = vendas[0];
  const linhas: LinhaCascata[] = exemplo
    ? [
        { rotulo: "Preço de tabela", valor: exemplo.bruto },
        ...(exemplo.descontoCupom > 0
          ? ([
              { rotulo: `Cupom ${exemplo.cupom?.codigo ?? ""}`.trim(), valor: -exemplo.descontoCupom },
              { rotulo: "Pago pelo aluno", valor: exemplo.bruto - exemplo.descontoCupom },
            ] as LinhaCascata[])
          : []),
        { rotulo: "Nota fiscal, 10%", valor: -exemplo.nota },
        { rotulo: "Taxa do Paga-me", valor: -exemplo.taxa },
        { rotulo: "Líquido", valor: exemplo.liquido, total: true },
      ]
    : [];

  return (
    <>
      <Cabecalho
        titulo="Vendas do site do Giovanni Pacelli"
        descricao={`${competenciaLonga(hoje)}. Cada venda guarda a própria conta: tabela, cupom, 10% da nota e taxa do Paga-me. A taxa fica congelada no momento da venda, então venda antiga continua batendo.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Líquido no PIX" valor={totalPix} nota={`${pix.length} vendas`} />
        <Numero rotulo="Líquido no cartão" valor={totalCartao} nota={`${cartao.length} vendas`} />
        <Numero rotulo="Nota e taxas" valor={totalTaxas} nota="o que não chega na conta" />
        <Numero
          rotulo="Pendente de repasse"
          valor={aRepassar}
          nota="parcelas de cartão a cair"
        />
      </div>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas no PIX</CardTitle>
          </CardHeader>
          <CardBody>
            <Tabela minWidth={820}>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Aluno</Th>
                  <Th>Curso</Th>
                  <Th numero>Bruto</Th>
                  <Th numero>Cupom</Th>
                  <Th numero>Nota</Th>
                  <Th numero>Taxa</Th>
                  <Th numero>Líquido</Th>
                </tr>
              </thead>
              <tbody>
                {pix.map((v) => (
                  <tr key={v.id}>
                    <Td>{dataCurta(v.data)}</Td>
                    <Td className="font-medium">{v.aluno}</Td>
                    <Td className="text-muted-foreground">{v.curso?.nome ?? v.descricao ?? "—"}</Td>
                    <Td numero>{formatBRL(v.bruto)}</Td>
                    <Td numero className="text-destructive">
                      {v.descontoCupom > 0 ? `− ${formatBRL(v.descontoCupom)}` : "—"}
                    </Td>
                    <Td numero className="text-destructive">− {formatBRL(v.nota)}</Td>
                    <Td numero className="text-destructive">− {formatBRL(v.taxa)}</Td>
                    <Td numero className="font-semibold">{formatBRL(v.liquido)}</Td>
                  </tr>
                ))}
                {pix.length === 0 ? (
                  <tr>
                    <Td className="text-muted-foreground">Nenhuma venda no PIX neste mês.</Td>
                  </tr>
                ) : null}
              </tbody>
            </Tabela>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas no cartão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada parcela é um repasse esperado, com data própria.
            </p>
          </CardHeader>
          <CardBody>
            <Tabela minWidth={880}>
              <thead>
                <tr>
                  <Th>Data</Th>
                  <Th>Aluno</Th>
                  <Th>Curso</Th>
                  <Th numero>Bruto</Th>
                  <Th numero>Parcelas</Th>
                  <Th numero>Nota e taxa</Th>
                  <Th numero>Líquido</Th>
                  <Th numero>Já repassado</Th>
                  <Th>Próximo repasse</Th>
                </tr>
              </thead>
              <tbody>
                {cartao.map((v) => {
                  const pagos = v.repasses.filter((r) => r.efetivo);
                  const proximo = v.repasses.find((r) => !r.efetivo);
                  return (
                    <tr key={v.id}>
                      <Td>{dataCurta(v.data)}</Td>
                      <Td className="font-medium">{v.aluno}</Td>
                      <Td className="text-muted-foreground">{v.curso?.nome ?? v.descricao ?? "—"}</Td>
                      <Td numero>{formatBRL(v.bruto)}</Td>
                      <Td numero>{v.parcelas}x</Td>
                      <Td numero className="text-destructive">− {formatBRL(v.nota + v.taxa)}</Td>
                      <Td numero className="font-semibold">{formatBRL(v.liquido)}</Td>
                      <Td numero>{formatBRL(soma(pagos.map((r) => r.valor)))}</Td>
                      <Td className="text-muted-foreground">
                        {proximo ? `${dataCurta(proximo.previsao)} · ${formatBRL(proximo.valor)}` : "tudo repassado"}
                      </Td>
                    </tr>
                  );
                })}
                {cartao.length === 0 ? (
                  <tr>
                    <Td className="text-muted-foreground">Nenhuma venda no cartão neste mês.</Td>
                  </tr>
                ) : null}
              </tbody>
            </Tabela>
          </CardBody>
        </Card>

        {exemplo ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Cascata
              titulo={`A conta aberta: ${exemplo.aluno}, ${exemplo.curso?.nome ?? "venda"}`}
              linhas={linhas}
            />
            <Card>
              <CardHeader>
                <CardTitle>O que falta confirmar com a cliente</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2 text-sm text-muted-foreground">
                <p>
                  As telas usam o <strong className="text-foreground">cadastro de curso</strong>:
                  cada curso tem preço de tabela e cupom, e o sistema calcula o desconto, os 10% da
                  nota e a taxa. A alternativa é digitar o valor pago em cada venda e só abater nota
                  e taxa.
                </p>
                <p>
                  As taxas do Paga-me aqui são exemplo (1% no PIX, 4,5% no cartão). Elas ficam numa
                  configuração com data de início, então trocar a taxa não muda venda antiga.
                </p>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
