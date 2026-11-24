"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { AtividadeCaixa, Direcao, GrupoGasto, NaturezaGasto } from "@prisma/client";
import { classificarTitulo } from "@/lib/acoes/titulos";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { ATIVIDADE, ATIVIDADES, GRUPO, GRUPOS, NATUREZA } from "@/lib/classificacao";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";

type Valor = {
  atividade: AtividadeCaixa | null;
  natureza: NaturezaGasto | null;
  grupo: GrupoGasto | null;
  unidadeId: string | null;
  naoOperacional: boolean;
};

/**
 * O que vale para os relatórios, e de onde veio: escolhido no lançamento ou
 * regra da categoria. Quem lança pode trocar, inclusive em mês fechado,
 * porque classificar não mexe em dinheiro.
 */
export function ClassificacaoDoTitulo({
  id,
  direcao,
  escolhido,
  efetivo,
  nomeDaUnidade,
  unidades,
  podeEditar,
}: {
  id: string;
  direcao: Direcao;
  escolhido: Valor;
  efetivo: { atividade: AtividadeCaixa; natureza: NaturezaGasto | null; grupo: GrupoGasto | null };
  nomeDaUnidade: string;
  unidades: { id: string; nome: string }[];
  podeEditar: boolean;
}) {
  const [estado, acao] = useFormState(classificarTitulo, ESTADO_VAZIO);
  const [editando, setEditando] = useState(false);
  const pagar = direcao === "PAGAR";
  const origem = (manual: unknown) => (manual ? "escolhido" : "pela categoria");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação para os relatórios</CardTitle>
        {podeEditar && !editando ? (
          <button type="button" onClick={() => setEditando(true)} className="text-[13px] text-brand underline decoration-brand/30 underline-offset-4">
            Mudar
          </button>
        ) : null}
      </CardHeader>
      <CardBody>
        {!editando ? (
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="rotulo">Atividade de caixa</dt>
              <dd className="mt-1">{ATIVIDADE[efetivo.atividade]} <span className="text-xs text-muted-foreground">· {origem(escolhido.atividade)}</span></dd>
            </div>
            <div>
              <dt className="rotulo">Unidade de negócio</dt>
              <dd className="mt-1">{nomeDaUnidade}</dd>
            </div>
            {pagar ? (
              <>
                <div>
                  <dt className="rotulo">Fixo ou variável</dt>
                  <dd className="mt-1">
                    {efetivo.natureza ? NATUREZA[efetivo.natureza] : "Não é gasto da operação"}
                    {efetivo.natureza ? <span className="text-xs text-muted-foreground"> · {origem(escolhido.natureza)}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt className="rotulo">Grupo do gasto fixo</dt>
                  <dd className="mt-1">
                    {efetivo.grupo ? GRUPO[efetivo.grupo] : "—"}
                    {efetivo.grupo ? <span className="text-xs text-muted-foreground"> · {origem(escolhido.grupo)}</span> : null}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt className="rotulo">Receita</dt>
                <dd className="mt-1">{escolhido.naoOperacional ? "Não operacional" : "Da operação"}</dd>
              </div>
            )}
            <Sucesso>{estado.ok}</Sucesso>
          </dl>
        ) : (
          <form action={acao} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <Erro>{estado.erro}</Erro>
            <Grade>
              <Campo rotulo="Atividade de caixa" htmlFor="atividade" opcional>
                <Select id="atividade" name="atividade" defaultValue={escolhido.atividade ?? ""}>
                  <option value="">Pela categoria</option>
                  {ATIVIDADES.map((a) => <option key={a} value={a}>{ATIVIDADE[a]}</option>)}
                </Select>
              </Campo>
              <Campo rotulo="Unidade de negócio" htmlFor="unidadeId" opcional>
                <Select id="unidadeId" name="unidadeId" defaultValue={escolhido.unidadeId ?? ""}>
                  <option value="">Sem BU</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </Select>
              </Campo>
            </Grade>
            {pagar ? (
              <Grade>
                <Campo rotulo="Fixo ou variável" htmlFor="natureza" opcional>
                  <Select id="natureza" name="natureza" defaultValue={escolhido.natureza ?? ""}>
                    <option value="">Pela categoria</option>
                    {(Object.keys(NATUREZA) as NaturezaGasto[]).map((n) => <option key={n} value={n}>{NATUREZA[n]}</option>)}
                  </Select>
                </Campo>
                <Campo rotulo="Grupo do gasto fixo" htmlFor="grupo" opcional>
                  <Select id="grupo" name="grupo" defaultValue={escolhido.grupo ?? ""}>
                    <option value="">Pela categoria</option>
                    {GRUPOS.map((g) => <option key={g} value={g}>{GRUPO[g]}</option>)}
                  </Select>
                </Campo>
              </Grade>
            ) : (
              <Campo rotulo="Receita da operação?" htmlFor="naoOperacional" opcional>
                <Select id="naoOperacional" name="naoOperacional" defaultValue={escolhido.naoOperacional ? "sim" : ""}>
                  <option value="">Sim, é venda</option>
                  <option value="sim">Não: rendimento, venda de bem</option>
                </Select>
              </Campo>
            )}
            <div className="flex items-center gap-3">
              <BotaoEnviar enviando="Salvando…">Salvar classificação</BotaoEnviar>
              <button type="button" onClick={() => setEditando(false)} className="text-sm text-muted-foreground underline underline-offset-4">
                Voltar
              </button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
