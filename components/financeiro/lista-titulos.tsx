import Link from "next/link";
import type { Direcao } from "@prisma/client";
import type { TituloNaTela } from "@/lib/consultas";
import { formatBRL } from "@/lib/money";
import { CATEGORIA } from "@/lib/rotulos";
import { dataCurta } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChipStatus } from "@/components/financeiro/chip";
import { Numero } from "@/components/financeiro/pagina";
import { AcaoDaLinha, Tabela, Td, Th } from "@/components/financeiro/tabela";

const STATUS_FILTRO = [
  { valor: "TODOS", rotulo: "Todos os status" },
  { valor: "ABERTO", rotulo: "Em aberto" },
  { valor: "VENCIDO", rotulo: "Vencidos" },
  { valor: "PARCIAL", rotulo: "Parciais" },
  { valor: "QUITADO", rotulo: "Quitados" },
  { valor: "CANCELADO", rotulo: "Cancelados" },
];

/**
 * Filtro em <form method="get">: funciona sem JavaScript, o resultado tem URL
 * própria (dá para mandar o link no WhatsApp) e o botão voltar do navegador
 * faz o que a pessoa espera.
 */
export function FiltroTitulos({
  base,
  q,
  status,
  competencia,
}: {
  base: string;
  q?: string;
  status?: string;
  competencia?: string;
}) {
  return (
    <form method="get" action={base} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Cliente, descrição, contrato" />
      </div>
      <div>
        <label htmlFor="status" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Status
        </label>
        <Select id="status" name="status" defaultValue={status ?? "TODOS"} className="w-44">
          {STATUS_FILTRO.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label
          htmlFor="competencia"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Competência
        </label>
        <Input
          id="competencia"
          name="competencia"
          type="month"
          defaultValue={competencia ?? ""}
          className="w-40"
        />
      </div>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {q || (status && status !== "TODOS") || competencia ? (
        <Button asChild variant="ghost">
          <Link href={base}>Limpar</Link>
        </Button>
      ) : null}
    </form>
  );
}

export function ListaTitulos({
  direcao,
  titulos,
  base,
}: {
  direcao: Direcao;
  titulos: TituloNaTela[];
  base: string;
}) {
  const receber = direcao === "RECEBER";
  const vivos = titulos.filter((t) => t.status !== "CANCELADO");
  const total = vivos.reduce((a, t) => a + t.valor, 0);
  const movimentado = vivos.reduce((a, t) => a + t.recebido, 0);
  const pendente = vivos
    .filter((t) => t.status !== "QUITADO")
    .reduce((a, t) => a + t.pendente, 0);
  const vencido = vivos
    .filter((t) => t.status === "VENCIDO")
    .reduce((a, t) => a + t.pendente, 0);

  return (
    <>
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Total lançado" valor={total} nota={`${vivos.length} títulos`} />
        <Numero
          rotulo={receber ? "Já recebido" : "Já pago"}
          valor={movimentado}
          tom="bom"
        />
        <Numero rotulo="Pendente" valor={pendente} />
        <Numero rotulo="Vencido" valor={vencido} tom={vencido > 0 ? "ruim" : "neutro"} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{titulos.length} títulos</CardTitle>
          <p className="num text-sm text-muted-foreground tabular-nums">
            {formatBRL(movimentado)} de {formatBRL(total)}
          </p>
        </CardHeader>
        <CardBody>
          <Tabela minWidth={940}>
            <thead>
              <tr>
                <Th>{receber ? "Cliente" : "Fornecedor"}</Th>
                <Th>Descrição</Th>
                <Th>Categoria</Th>
                <Th>Competência</Th>
                <Th>Vence</Th>
                <Th numero>Valor</Th>
                <Th numero>{receber ? "Recebido" : "Pago"}</Th>
                <Th numero>Pendente</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {titulos.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-muted/40">
                  <Td className="font-medium">
                    {receber
                      ? (t.cliente?.nome ?? "—")
                      : (t.fornecedor?.nome ?? "—")}
                  </Td>
                  <Td className="max-w-72 truncate whitespace-normal text-muted-foreground">
                    {t.descricao}
                  </Td>
                  <Td className="text-muted-foreground">{CATEGORIA[t.categoria]}</Td>
                  <Td>
                    {`${String(t.competencia.getUTCMonth() + 1).padStart(2, "0")}/${t.competencia.getUTCFullYear()}`}
                  </Td>
                  <Td>{dataCurta(t.vencimento)}</Td>
                  <Td numero>{formatBRL(t.valor)}</Td>
                  <Td numero>{formatBRL(t.recebido)}</Td>
                  <Td numero className={t.pendente > 0 ? "" : "text-muted-foreground"}>
                    {formatBRL(t.pendente)}
                  </Td>
                  <Td>
                    <ChipStatus
                      status={t.status}
                      rotulo={!receber && t.status === "QUITADO" ? "Pago" : undefined}
                    />
                  </Td>
                  <Td>
                    <AcaoDaLinha href={`${base}/${t.id}`} oQue={t.descricao}>
                      Abrir
                    </AcaoDaLinha>
                  </Td>
                </tr>
              ))}
              {titulos.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">
                    Nenhum título com esses filtros.
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>
        </CardBody>
      </Card>
    </>
  );
}
