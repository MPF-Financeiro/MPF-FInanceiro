"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { abrirFolha, enviarFolha, fecharFolha, salvarItemFolha } from "@/lib/acoes/rh";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { calcularItemFolha } from "@/lib/folha";
import { formatBRL } from "@/lib/money";
import { parseCentavos } from "@/lib/validacao";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Cascata } from "@/components/financeiro/cascata";
import { Carimbo } from "@/components/financeiro/chip";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { AcaoDaLinha, Tabela, Td, Th } from "@/components/financeiro/tabela";

export type ItemFolhaLinha = {
  id: string;
  colaborador: string;
  salarioBruto: number;
  bonificacoes: number;
  horasExtras: number;
  adiantamentos: number;
  inss: number;
  irrf: number;
  outrosDescontos: number;
  valeAlimentacao: number;
  valeTransporte: number;
  liquido: number;
};

export type FolhaDados = {
  id: string;
  competencia: Date;
  fechadaEm: Date | null;
  enviadaEm: Date | null;
  itens: ItemFolhaLinha[];
};

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function AbrirFolha({ competencia }: { competencia: string }) {
  const [estado, acao] = useFormState(abrirFolha, ESTADO_VAZIO);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nenhuma folha nesta competência</CardTitle>
      </CardHeader>
      <CardBody>
        <form action={acao} className="flex flex-wrap items-end gap-3">
          <Erro>{estado.erro}</Erro>
          <Campo rotulo="Competência" htmlFor="folha-comp">
            <Input
              id="folha-comp"
              name="competencia"
              type="month"
              required
              defaultValue={competencia}
              className="w-44"
            />
          </Campo>
          <BotaoEnviar enviando="Abrindo…">Abrir folha</BotaoEnviar>
        </form>
        <p className="mt-3 text-sm text-muted-foreground">
          A folha nasce com todos os colaboradores ativos, o salário de cada um e as bonificações da
          competência que foram marcadas para entrar na folha.
        </p>
      </CardBody>
    </Card>
  );
}

export function Folha({ folha, podeEscrever }: { folha: FolhaDados; podeEscrever: boolean }) {
  const [estadoFechar, acaoFechar] = useFormState(fecharFolha, ESTADO_VAZIO);
  const [estadoEnviar, acaoEnviar] = useFormState(enviarFolha, ESTADO_VAZIO);
  const [aberto, setAberto] = React.useState<string | null>(null);

  const totalLiquido = folha.itens.reduce((a, i) => a + i.liquido, 0);
  const totalBruto = folha.itens.reduce((a, i) => a + i.salarioBruto, 0);
  const totalDescontos = folha.itens.reduce(
    (a, i) => a + i.inss + i.irrf + i.adiantamentos + i.outrosDescontos,
    0
  );
  const totalVales = folha.itens.reduce((a, i) => a + i.valeAlimentacao + i.valeTransporte, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Folha de{" "}
              {`${String(folha.competencia.getUTCMonth() + 1).padStart(2, "0")}/${folha.competencia.getUTCFullYear()}`}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {folha.itens.length} colaboradores · líquido {formatBRL(totalLiquido)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {folha.fechadaEm ? <Carimbo>Folha fechada</Carimbo> : null}
            {folha.enviadaEm ? <Carimbo>Enviada ao Financeiro</Carimbo> : null}
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <Erro>{estadoFechar.erro}</Erro>
          <Sucesso>{estadoFechar.ok}</Sucesso>
          <Erro>{estadoEnviar.erro}</Erro>
          <Sucesso>{estadoEnviar.ok}</Sucesso>

          <Tabela minWidth={1000}>
            <thead>
              <tr>
                <Th>Colaborador</Th>
                <Th numero>Bruto</Th>
                <Th numero>Extras</Th>
                <Th numero>Bonificações</Th>
                <Th numero>Descontos</Th>
                <Th numero>Vales</Th>
                <Th numero>Líquido</Th>
                <Th>{podeEscrever && !folha.fechadaEm ? "Ajustar" : ""}</Th>
              </tr>
            </thead>
            <tbody>
              {folha.itens.map((i) => (
                <tr key={i.id}>
                  <Td className="font-medium">{i.colaborador}</Td>
                  <Td numero>{formatBRL(i.salarioBruto)}</Td>
                  <Td numero>{i.horasExtras > 0 ? formatBRL(i.horasExtras) : "—"}</Td>
                  <Td numero>{i.bonificacoes > 0 ? formatBRL(i.bonificacoes) : "—"}</Td>
                  <Td numero className="text-destructive">
                    {i.inss + i.irrf + i.adiantamentos + i.outrosDescontos > 0
                      ? `− ${formatBRL(i.inss + i.irrf + i.adiantamentos + i.outrosDescontos)}`
                      : "—"}
                  </Td>
                  <Td numero className="text-muted-foreground">
                    {i.valeAlimentacao + i.valeTransporte > 0
                      ? formatBRL(i.valeAlimentacao + i.valeTransporte)
                      : "—"}
                  </Td>
                  <Td numero className="font-semibold">
                    {formatBRL(i.liquido)}
                  </Td>
                  <Td>
                    {podeEscrever && !folha.fechadaEm ? (
                      <AcaoDaLinha
                        oQue={`o contracheque de ${i.colaborador}`}
                        onClick={() => setAberto(aberto === i.id ? null : i.id)}
                      >
                        {aberto === i.id ? "Fechar" : "Ajustar"}
                      </AcaoDaLinha>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>

          {/*
            Quatro cartões iguais mostram quatro números sem dizer que um sai
            do outro. A regra da casa é cascata: o bruto menos os descontos dá
            o líquido, e os vales entram como linha à parte porque são pagos
            fora da folha, não somados ao líquido.
          */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Cascata
              titulo="A conta desta folha"
              linhas={[
                { rotulo: "Salários brutos", valor: totalBruto },
                { rotulo: "Descontos", valor: -totalDescontos },
                { rotulo: "Líquido a pagar", valor: totalLiquido, total: true },
              ]}
            />
            <div className="space-y-3">
              <Resumo rotulo="Vales (VA e VT)" valor={totalVales} />
              <p className="text-sm text-muted-foreground">
                Os vales ficam de fora do líquido de propósito: eles são pagos pela operadora ou em
                dinheiro, e somá-los aqui pagaria duas vezes o mesmo valor.
              </p>
            </div>
          </div>

          {podeEscrever ? (
            <div className="flex flex-wrap gap-3 border-t border-border pt-5">
              <form action={acaoFechar}>
                <input type="hidden" name="id" value={folha.id} />
                <BotaoEnviar variant="outline" enviando="…">
                  {folha.fechadaEm ? "Reabrir folha" : "Fechar folha"}
                </BotaoEnviar>
              </form>
              {/*
                Botão desabilitado sem explicação é a pessoa clicando e achando
                que a tela travou. O motivo fica do lado, ligado ao botão por
                aria-describedby.
              */}
              <form action={acaoEnviar} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={folha.id} />
                <BotaoEnviar
                  enviando="Enviando…"
                  disabled={!folha.fechadaEm}
                  aria-describedby={folha.fechadaEm ? undefined : "motivo-enviar"}
                >
                  {folha.enviadaEm ? "Reenviar ao Financeiro" : "Mandar para o Financeiro"}
                </BotaoEnviar>
                {folha.fechadaEm ? null : (
                  <span id="motivo-enviar" className="text-sm text-muted-foreground">
                    Feche a folha primeiro: só folha fechada vira conta a pagar.
                  </span>
                )}
              </form>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Mandar para o Financeiro cria uma conta a pagar por colaborador, com vencimento no dia 5
            do mês seguinte. Reenviar a folha corrigida atualiza as mesmas contas em vez de criar
            novas, e salário já pago não é mexido.
          </p>
        </CardBody>
      </Card>

      {aberto
        ? folha.itens
            .filter((i) => i.id === aberto)
            .map((i) => <ItemFolhaForm key={i.id} item={i} />)
        : null}
    </div>
  );
}

function Resumo({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p className={`num mt-1 tabular-nums ${forte ? "text-lg font-semibold" : "text-base"}`}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}

function ItemFolhaForm({ item }: { item: ItemFolhaLinha }) {
  const [estado, acao] = useFormState(salvarItemFolha, ESTADO_VAZIO);
  const [campos, setCampos] = React.useState({
    salarioBruto: reais(item.salarioBruto),
    horasExtras: reais(item.horasExtras),
    bonificacoes: reais(item.bonificacoes),
    inss: reais(item.inss),
    irrf: reais(item.irrf),
    adiantamentos: reais(item.adiantamentos),
    outrosDescontos: reais(item.outrosDescontos),
    valeAlimentacao: reais(item.valeAlimentacao),
    valeTransporte: reais(item.valeTransporte),
  });

  const n = (chave: keyof typeof campos) => parseCentavos(campos[chave]) ?? 0;
  let conta: ReturnType<typeof calcularItemFolha> | null = null;
  try {
    conta = calcularItemFolha({
      salarioBruto: n("salarioBruto"),
      horasExtras: n("horasExtras"),
      bonificacoes: n("bonificacoes"),
      inss: n("inss"),
      irrf: n("irrf"),
      adiantamentos: n("adiantamentos"),
      outrosDescontos: n("outrosDescontos"),
    });
  } catch {
    conta = null;
  }

  const campo = (chave: keyof typeof campos, rotulo: string, dica?: string) => (
    <Campo rotulo={rotulo} htmlFor={`${item.id}-${chave}`} dica={dica}>
      <Input
        id={`${item.id}-${chave}`}
        name={chave}
        inputMode="decimal"
        value={campos[chave]}
        onChange={(e) => setCampos({ ...campos, [chave]: e.target.value })}
        className="num tabular-nums"
      />
    </Campo>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustar {item.colaborador}</CardTitle>
      </CardHeader>
      <CardBody>
        <form action={acao} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <input type="hidden" name="id" value={item.id} />
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              {campo("salarioBruto", "Salário bruto")}
              {campo("horasExtras", "Horas extras")}
              {campo("bonificacoes", "Bonificações")}
              {campo("inss", "INSS")}
              {campo("irrf", "IRRF")}
              {campo("adiantamentos", "Adiantamentos")}
              {campo("outrosDescontos", "Outros descontos")}
              {campo("valeAlimentacao", "Vale-alimentação", "Pago à parte, fora do líquido.")}
              {campo("valeTransporte", "Vale-transporte", "Pago à parte, fora do líquido.")}
            </Grade>
            <BotaoEnviar enviando="Salvando…">Salvar item</BotaoEnviar>
          </div>
          <div className="space-y-3 self-start">
            {conta ? (
              <Cascata titulo="O contracheque" linhas={conta.linhas} />
            ) : (
              <p className="text-sm text-destructive">
                Algum valor está inválido: confira os campos.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Os vales não entram no líquido: são pagos à parte, com conta própria, para não pagar
              duas vezes o mesmo dinheiro.
            </p>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
