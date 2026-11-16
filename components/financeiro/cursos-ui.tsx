"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { salvarCupom, salvarCurso, salvarTaxas } from "@/lib/acoes/vendas";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { formatBps } from "@/lib/taxas";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { AcaoDaLinha, Tabela, Td, Th } from "@/components/financeiro/tabela";

export type CursoLinha = { id: string; nome: string; preco: number; ativo: boolean; vendas: number };
export type CupomLinha = {
  id: string;
  codigo: string;
  curso: string | null;
  percentBps: number | null;
  valorFixo: number | null;
  validoAte: Date | null;
};

function dataLonga(d: Date | null): string {
  if (!d) return "sem prazo";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Cursos({ cursos }: { cursos: CursoLinha[] }) {
  const [estado, acao] = useFormState(salvarCurso, ESTADO_VAZIO);
  const [editando, setEditando] = React.useState<CursoLinha | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cursos</CardTitle>
        <p className="text-sm text-muted-foreground">
          O preço de tabela de cada curso. Mudar o preço aqui não mexe em venda já lançada.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={620}>
          <thead>
            <tr>
              <Th>Curso</Th>
              <Th numero>Preço de tabela</Th>
              <Th numero>Vendas</Th>
              <Th>Situação</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {cursos.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.nome}</Td>
                <Td numero>{formatBRL(c.preco)}</Td>
                <Td numero>{c.vendas}</Td>
                <Td className="text-muted-foreground">{c.ativo ? "Ativo" : "Inativo"}</Td>
                <Td>
                  <AcaoDaLinha oQue={`o curso ${c.nome}`} onClick={() => setEditando(c)}>
                    Editar
                  </AcaoDaLinha>
                </Td>
              </tr>
            ))}
            {cursos.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhum curso cadastrado ainda.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        <form action={acao} className="space-y-4 border-t border-border pt-5" key={editando?.id ?? "novo"}>
          <Erro>{estado.erro}</Erro>
          <Sucesso>{estado.ok}</Sucesso>
          {editando ? <input type="hidden" name="id" value={editando.id} /> : null}
          <Grade colunas={3}>
            <Campo rotulo="Nome do curso" htmlFor="nome">
              <Input id="nome" name="nome" required minLength={3} defaultValue={editando?.nome} />
            </Campo>
            <Campo rotulo="Preço de tabela" htmlFor="preco" dica="Em reais.">
              <Input
                id="preco"
                name="preco"
                required
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={
                  editando ? (editando.preco / 100).toFixed(2).replace(".", ",") : ""
                }
                className="num tabular-nums"
              />
            </Campo>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={editando ? editando.ativo : true}
                  className="size-4 rounded border-input"
                />
                Ativo
              </label>
            </div>
          </Grade>
          <div className="flex flex-wrap items-center gap-3">
            <BotaoEnviar enviando="Salvando…">
              {editando ? "Salvar curso" : "Cadastrar curso"}
            </BotaoEnviar>
            {editando ? (
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Cadastrar um novo em vez de editar
              </button>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function Cupons({
  cupons,
  cursos,
}: {
  cupons: CupomLinha[];
  cursos: Array<{ id: string; nome: string }>;
}) {
  const [estado, acao] = useFormState(salvarCupom, ESTADO_VAZIO);
  const [tipo, setTipo] = React.useState<"percentual" | "fixo">("percentual");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cupons</CardTitle>
        <p className="text-sm text-muted-foreground">
          O desconto sai do valor cobrado, e a nota e a taxa incidem sobre o que o aluno pagou.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={620}>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Curso</Th>
              <Th numero>Desconto</Th>
              <Th>Válido até</Th>
            </tr>
          </thead>
          <tbody>
            {cupons.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.codigo}</Td>
                <Td className="text-muted-foreground">{c.curso ?? "Qualquer curso"}</Td>
                <Td numero>
                  {c.valorFixo
                    ? formatBRL(c.valorFixo)
                    : c.percentBps
                      ? formatBps(c.percentBps)
                      : "—"}
                </Td>
                <Td className="text-muted-foreground">{dataLonga(c.validoAte)}</Td>
              </tr>
            ))}
            {cupons.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhum cupom cadastrado.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        <form action={acao} className="space-y-4 border-t border-border pt-5">
          <Erro>{estado.erro}</Erro>
          <Sucesso>{estado.ok}</Sucesso>
          <input type="hidden" name="tipo" value={tipo} />
          <Grade colunas={3}>
            <Campo rotulo="Código" htmlFor="codigo" dica="Vira maiúsculas.">
              <Input id="codigo" name="codigo" required minLength={3} />
            </Campo>
            <Campo rotulo="Curso" htmlFor="cursoId" dica="Em branco vale para qualquer curso.">
              <Select id="cursoId" name="cursoId">
                <option value="">Qualquer curso</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo rotulo="Válido até" htmlFor="validoAte" opcional>
              <Input id="validoAte" name="validoAte" type="date" />
            </Campo>
          </Grade>
          <Grade colunas={3}>
            <Campo rotulo="Tipo de desconto" htmlFor="tipoDesconto">
              <Select
                id="tipoDesconto"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "percentual" | "fixo")}
              >
                <option value="percentual">Percentual</option>
                <option value="fixo">Valor fixo</option>
              </Select>
            </Campo>
            {tipo === "percentual" ? (
              <Campo rotulo="Percentual" htmlFor="percentual" dica="Ex.: 10 para 10%.">
                <Input
                  id="percentual"
                  name="percentual"
                  required
                  inputMode="decimal"
                  className="num tabular-nums"
                />
              </Campo>
            ) : (
              <Campo rotulo="Valor do desconto" htmlFor="valorFixo" dica="Em reais.">
                <Input
                  id="valorFixo"
                  name="valorFixo"
                  required
                  inputMode="decimal"
                  className="num tabular-nums"
                />
              </Campo>
            )}
          </Grade>
          <BotaoEnviar enviando="Salvando…">Cadastrar cupom</BotaoEnviar>
        </form>
      </CardBody>
    </Card>
  );
}

export function Taxas({
  vigencias,
  hoje,
  podeAdministrar,
}: {
  vigencias: Array<{
    id: string;
    vigenteDe: Date;
    vigenteAte: Date | null;
    notaBps: number;
    pixBps: number;
    cartaoBps: number;
    fixoPorVenda: number;
    observacao: string | null;
  }>;
  hoje: string;
  podeAdministrar: boolean;
}) {
  const [estado, acao] = useFormState(salvarTaxas, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nota fiscal e taxas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada vigência tem data de início. Taxa nova não mexe em venda antiga.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={720}>
          <thead>
            <tr>
              <Th>Vigência</Th>
              <Th numero>Nota fiscal</Th>
              <Th numero>PIX</Th>
              <Th numero>Cartão</Th>
              <Th numero>Fixo por venda</Th>
              <Th>Observação</Th>
            </tr>
          </thead>
          <tbody>
            {vigencias.map((v) => (
              <tr key={v.id}>
                <Td>
                  {dataLonga(v.vigenteDe)} → {v.vigenteAte ? dataLonga(v.vigenteAte) : "hoje"}
                </Td>
                <Td numero>{formatBps(v.notaBps)}</Td>
                <Td numero>{formatBps(v.pixBps)}</Td>
                <Td numero>{formatBps(v.cartaoBps)}</Td>
                <Td numero>{v.fixoPorVenda > 0 ? formatBRL(v.fixoPorVenda) : "—"}</Td>
                <Td className="text-muted-foreground">{v.observacao ?? "—"}</Td>
              </tr>
            ))}
            {vigencias.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">
                  Nenhuma vigência cadastrada: o sistema usa 10% de nota, 1% no PIX e 4,5% no
                  cartão até a cliente confirmar as taxas reais.
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        {podeAdministrar ? (
          <form action={acao} className="space-y-4 border-t border-border pt-5">
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Vale a partir de" htmlFor="vigenteDe">
                <Input id="vigenteDe" name="vigenteDe" type="date" required defaultValue={hoje} />
              </Campo>
              <Campo rotulo="Nota fiscal" htmlFor="nota" dica="Em %. A Samps usa 10.">
                <Input id="nota" name="nota" required inputMode="decimal" defaultValue="10" className="num tabular-nums" />
              </Campo>
              <Campo rotulo="Taxa do PIX" htmlFor="pix" dica="Em %.">
                <Input id="pix" name="pix" required inputMode="decimal" className="num tabular-nums" />
              </Campo>
              <Campo rotulo="Taxa do cartão" htmlFor="cartao" dica="Em %.">
                <Input id="cartao" name="cartao" required inputMode="decimal" className="num tabular-nums" />
              </Campo>
              <Campo rotulo="Fixo por venda" htmlFor="fixoPorVenda" opcional dica="Em reais.">
                <Input id="fixoPorVenda" name="fixoPorVenda" inputMode="decimal" className="num tabular-nums" />
              </Campo>
            </Grade>
            <Campo rotulo="Observação" htmlFor="observacao" dica="De onde veio este número.">
              <Textarea id="observacao" name="observacao" />
            </Campo>
            <BotaoEnviar enviando="Salvando…">Registrar nova vigência</BotaoEnviar>
          </form>
        ) : (
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            Só o administrador muda as taxas.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
