import { Direcao } from "@prisma/client";
import { listarTitulos } from "@/lib/consultas";
import { formatBRL } from "@/lib/money";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipStatus } from "@/components/financeiro/chip";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export const dynamic = "force-dynamic";

const FORMA: Record<string, string> = {
  PIX: "PIX",
  CARTAO: "Cartão",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  VOUCHER: "Voucher",
  DINHEIRO: "Dinheiro",
};

export default async function ReceberPage() {
  const titulos = await listarTitulos(Direcao.RECEBER);
  const total = titulos.reduce((a, t) => a + t.valor, 0);
  const recebido = titulos.reduce((a, t) => a + t.recebido, 0);

  return (
    <>
      <Cabecalho
        titulo="Contas a receber"
        descricao="Status não é digitado: sai do valor, das baixas e da data de vencimento. Um recebimento parcial deixa o título aberto pelo saldo."
      />
      <Card>
        <CardHeader>
          <CardTitle>{titulos.length} títulos</CardTitle>
          <p className="num text-sm text-muted-foreground tabular-nums">
            {formatBRL(recebido)} recebidos de {formatBRL(total)}
          </p>
        </CardHeader>
        <CardBody>
          <Tabela minWidth={900}>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Serviço</Th>
                <Th>Contrato</Th>
                <Th>Vence</Th>
                <Th>Recebido em</Th>
                <Th>Forma</Th>
                <Th numero>Valor</Th>
                <Th numero>Recebido</Th>
                <Th numero>Pendente</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {titulos.map((t) => {
                const ultima = t.baixas[t.baixas.length - 1];
                return (
                  <tr key={t.id}>
                    <Td className="font-medium">{t.cliente?.nome ?? "—"}</Td>
                    <Td className="text-muted-foreground">{t.descricao}</Td>
                    <Td className="text-muted-foreground">{t.contrato?.numero ?? "—"}</Td>
                    <Td>{dataCurta(t.vencimento)}</Td>
                    <Td>{dataCurta(ultima?.data)}</Td>
                    <Td className="text-muted-foreground">
                      {t.forma ? FORMA[t.forma] : "—"}
                    </Td>
                    <Td numero>{formatBRL(t.valor)}</Td>
                    <Td numero>{formatBRL(t.recebido)}</Td>
                    <Td numero className={t.pendente > 0 ? "" : "text-muted-foreground"}>
                      {formatBRL(t.pendente)}
                    </Td>
                    <Td>
                      <ChipStatus status={t.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        </CardBody>
      </Card>
    </>
  );
}
