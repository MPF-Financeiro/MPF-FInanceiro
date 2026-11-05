import { Direcao } from "@prisma/client";
import { listarTitulos } from "@/lib/consultas";
import { formatBRL } from "@/lib/money";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipStatus } from "@/components/financeiro/chip";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

export const dynamic = "force-dynamic";

/** As categorias na ordem em que a cliente listou. */
const CATEGORIA: Record<string, string> = {
  FORNECEDORES: "Fornecedores",
  SALARIOS: "Salários",
  VALE_ALIMENTACAO: "Vale-alimentação",
  VALE_TRANSPORTE: "Vale-transporte",
  IMPOSTOS_ENCARGOS: "Impostos e encargos",
  ALUGUEL: "Aluguel",
  SERVICOS_ASSINATURAS: "Serviços e assinaturas",
  BONIFICACOES: "Bonificações",
  PRO_LABORE: "Pró-labore",
  VALORES_A_ACERTAR: "Valores a acertar",
  VENDAS_SITE: "Vendas do site",
  SERVICOS_PRESTADOS: "Serviços prestados",
  OUTROS: "Outros",
};

const ROTULO_PAGO: Record<string, string> = { QUITADO: "Pago" };

export default async function PagarPage() {
  const titulos = await listarTitulos(Direcao.PAGAR);

  const porCategoria = new Map<string, number>();
  for (const t of titulos) {
    if (t.canceladoEm) continue;
    porCategoria.set(t.categoria, (porCategoria.get(t.categoria) ?? 0) + t.valor);
  }
  const categorias = Array.from(porCategoria.entries()).sort((a, b) => b[1] - a[1]);
  const maior = categorias[0]?.[1] ?? 1;

  return (
    <>
      <Cabecalho
        titulo="Contas a pagar"
        descricao="A folha é administrada no RH e chega aqui como título de origem FOLHA. Reenviar a folha atualiza o mesmo título, nunca cria um segundo."
      />

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{titulos.length} títulos</CardTitle>
          </CardHeader>
          <CardBody>
            <Tabela minWidth={820}>
              <thead>
                <tr>
                  <Th>Beneficiário</Th>
                  <Th>Categoria</Th>
                  <Th>Descrição</Th>
                  <Th>Vence</Th>
                  <Th>Pago em</Th>
                  <Th numero>Valor</Th>
                  <Th numero>Pendente</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {titulos.map((t) => {
                  const ultima = t.baixas[t.baixas.length - 1];
                  return (
                    <tr key={t.id}>
                      <Td className="font-medium">{t.fornecedor?.nome ?? "—"}</Td>
                      <Td className="text-muted-foreground">{CATEGORIA[t.categoria]}</Td>
                      <Td className="text-muted-foreground">{t.descricao}</Td>
                      <Td>{dataCurta(t.vencimento)}</Td>
                      <Td>{dataCurta(ultima?.data)}</Td>
                      <Td numero>{formatBRL(t.valor)}</Td>
                      <Td numero>{formatBRL(t.pendente)}</Td>
                      <Td>
                        <ChipStatus status={t.status} rotulo={ROTULO_PAGO[t.status]} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por categoria</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {categorias.map(([cat, valor]) => (
              <div key={cat}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{CATEGORIA[cat]}</span>
                  <span className="num font-medium tabular-nums">{formatBRL(valor)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--brand))]"
                    style={{ width: `${Math.max(2, (valor / maior) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem contas lançadas.</p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
