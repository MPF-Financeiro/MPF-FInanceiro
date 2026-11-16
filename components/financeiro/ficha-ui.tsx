"use client";

import { useFormState } from "react-dom";
import type { StatusFerias, TipoExame } from "@prisma/client";
import {
  abrirLaudo,
  salvarContracheque,
  salvarDocumentoRH,
  salvarExame,
  salvarFerias,
  salvarRescisao,
} from "@/lib/acoes/rh";
import { ESTADO_VAZIO } from "@/lib/acoes/comum";
import { formatBRL } from "@/lib/money";
import { STATUS_FERIAS, TIPO_EXAME } from "@/lib/rotulos";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Carimbo } from "@/components/financeiro/chip";
import { BotaoEnviar, Campo, Erro, Grade, Sucesso } from "@/components/financeiro/formulario";
import { Tabela, Td, Th } from "@/components/financeiro/tabela";

function data(d: Date | null): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}
function mes(d: Date): string {
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Ferias({
  colaboradorId,
  ferias,
  hoje,
  podeEscrever,
}: {
  colaboradorId: string;
  ferias: Array<{
    id: string;
    inicio: Date;
    fim: Date;
    diasVendidos: number;
    status: StatusFerias;
    periodoAquisitivoInicio: Date;
    periodoAquisitivoFim: Date;
  }>;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estado, acao] = useFormState(salvarFerias, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Férias</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            O sistema confere os dias: gozo mais venda não passa de 30, e a venda vai até 10 dias.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <Tabela minWidth={720}>
          <thead>
            <tr>
              <Th>Período aquisitivo</Th>
              <Th>Gozo</Th>
              <Th numero>Dias</Th>
              <Th numero>Vendidos</Th>
              <Th>Situação</Th>
            </tr>
          </thead>
          <tbody>
            {ferias.map((f) => {
              const dias =
                Math.round((f.fim.getTime() - f.inicio.getTime()) / (24 * 60 * 60 * 1000)) + 1;
              return (
                <tr key={f.id}>
                  <Td className="text-muted-foreground">
                    {data(f.periodoAquisitivoInicio)} → {data(f.periodoAquisitivoFim)}
                  </Td>
                  <Td>
                    {data(f.inicio)} → {data(f.fim)}
                  </Td>
                  <Td numero>{dias}</Td>
                  <Td numero>{f.diasVendidos || "—"}</Td>
                  <Td className="text-muted-foreground">{STATUS_FERIAS[f.status]}</Td>
                </tr>
              );
            })}
            {ferias.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhuma férias programada.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        {podeEscrever ? (
          <form action={acao} className="space-y-4 border-t border-border pt-5">
            <input type="hidden" name="colaboradorId" value={colaboradorId} />
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Período aquisitivo: início" htmlFor="fer-pai">
                <Input id="fer-pai" name="periodoAquisitivoInicio" type="date" required />
              </Campo>
              <Campo rotulo="Período aquisitivo: fim" htmlFor="fer-paf">
                <Input id="fer-paf" name="periodoAquisitivoFim" type="date" required />
              </Campo>
              <Campo rotulo="Situação" htmlFor="fer-status">
                <Select id="fer-status" name="status" required defaultValue="PROGRAMADA">
                  {(Object.keys(STATUS_FERIAS) as StatusFerias[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_FERIAS[s]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Início do gozo" htmlFor="fer-inicio">
                <Input id="fer-inicio" name="inicio" type="date" required defaultValue={hoje} />
              </Campo>
              <Campo rotulo="Fim do gozo" htmlFor="fer-fim">
                <Input id="fer-fim" name="fim" type="date" required />
              </Campo>
              <Campo rotulo="Dias vendidos" htmlFor="fer-vend" dica="Até 10.">
                <Input
                  id="fer-vend"
                  name="diasVendidos"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={0}
                  className="num tabular-nums"
                />
              </Campo>
            </Grade>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="abonoPecuniario" className="size-4 rounded border-input" />
              Abono pecuniário
            </label>
            <Campo rotulo="Observações" htmlFor="fer-obs" dica="Opcional.">
              <Textarea id="fer-obs" name="observacoes" />
            </Campo>
            <BotaoEnviar enviando="Salvando…">Programar férias</BotaoEnviar>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function Exames({
  colaboradorId,
  exames,
  hoje,
  podeEscrever,
}: {
  colaboradorId: string;
  exames: Array<{
    id: string;
    tipo: TipoExame;
    realizado: Date;
    proximo: Date | null;
    clinica: string | null;
    apto: boolean;
    temLaudo: boolean;
    custo: number;
    vencido: boolean;
  }>;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estado, acao] = useFormState(salvarExame, ESTADO_VAZIO);
  const [estadoLaudo, acaoLaudo] = useFormState(abrirLaudo, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Exames ocupacionais</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            A tela mostra aptidão e validade. O laudo é dado de saúde: abrir deixa registrado quem
            abriu e quando.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <Erro>{estadoLaudo.erro}</Erro>
        <Sucesso>{estadoLaudo.ok}</Sucesso>
        <Tabela minWidth={820}>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Realizado</Th>
              <Th>Próximo</Th>
              <Th>Clínica</Th>
              <Th>Aptidão</Th>
              <Th numero>Custo</Th>
              <Th>Laudo</Th>
            </tr>
          </thead>
          <tbody>
            {exames.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{TIPO_EXAME[e.tipo]}</Td>
                <Td>{data(e.realizado)}</Td>
                <Td className={e.vencido ? "text-destructive" : ""}>
                  {data(e.proximo)}
                  {e.vencido ? " · vencido" : ""}
                </Td>
                <Td className="text-muted-foreground">{e.clinica ?? "—"}</Td>
                <Td>
                  {e.apto ? (
                    <span className="chip chip-ok">Apto</span>
                  ) : (
                    <span className="chip chip-bad">Inapto</span>
                  )}
                </Td>
                <Td numero>{e.custo > 0 ? formatBRL(e.custo) : "—"}</Td>
                <Td>
                  {e.temLaudo && podeEscrever ? (
                    <form action={acaoLaudo}>
                      <input type="hidden" name="exameId" value={e.id} />
                      <BotaoEnviar variant="outline" size="sm" enviando="…">
                        Abrir laudo
                      </BotaoEnviar>
                    </form>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {e.temLaudo ? "restrito" : "—"}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
            {exames.length === 0 ? (
              <tr>
                <Td className="text-muted-foreground">Nenhum exame registrado.</Td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>

        {podeEscrever ? (
          <form action={acao} className="space-y-4 border-t border-border pt-5">
            <input type="hidden" name="colaboradorId" value={colaboradorId} />
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Tipo" htmlFor="ex-tipo">
                <Select id="ex-tipo" name="tipo" required>
                  {(Object.keys(TIPO_EXAME) as TipoExame[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPO_EXAME[t]}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Realizado em" htmlFor="ex-real">
                <Input id="ex-real" name="realizado" type="date" required defaultValue={hoje} />
              </Campo>
              <Campo rotulo="Próximo" htmlFor="ex-prox" dica="Opcional.">
                <Input id="ex-prox" name="proximo" type="date" />
              </Campo>
              <Campo rotulo="Clínica" htmlFor="ex-clinica" dica="Opcional.">
                <Input id="ex-clinica" name="clinica" />
              </Campo>
              <Campo rotulo="Custo" htmlFor="ex-custo" dica="Em reais. Opcional.">
                <Input id="ex-custo" name="custo" inputMode="decimal" className="num tabular-nums" />
              </Campo>
              <Campo rotulo="Laudo" htmlFor="ex-laudo" dica="Link do arquivo. Opcional.">
                <Input id="ex-laudo" name="laudo" />
              </Campo>
            </Grade>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="apto" defaultChecked className="size-4 rounded border-input" />
              Apto
            </label>
            <BotaoEnviar enviando="Salvando…">Registrar exame</BotaoEnviar>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function DocumentosEContracheques({
  colaboradorId,
  documentos,
  contracheques,
  competencia,
  podeEscrever,
}: {
  colaboradorId: string;
  documentos: Array<{
    id: string;
    tipo: string;
    arquivo: string | null;
    emitidoEm: Date | null;
    venceEm: Date | null;
    restrito: boolean;
    vencido: boolean;
  }>;
  contracheques: Array<{
    id: string;
    competencia: Date;
    arquivo: string | null;
    disponibilizadoEm: Date | null;
  }>;
  competencia: string;
  podeEscrever: boolean;
}) {
  const [estadoDoc, acaoDoc] = useFormState(salvarDocumentoRH, ESTADO_VAZIO);
  const [estadoCon, acaoCon] = useFormState(salvarContracheque, ESTADO_VAZIO);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Tabela minWidth={420}>
            <thead>
              <tr>
                <Th>Documento</Th>
                <Th>Emitido</Th>
                <Th>Vence</Th>
                <Th>Acesso</Th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id}>
                  <Td className="font-medium">{d.tipo}</Td>
                  <Td>{data(d.emitidoEm)}</Td>
                  <Td className={d.vencido ? "text-destructive" : ""}>
                    {data(d.venceEm)}
                    {d.vencido ? " · vencido" : ""}
                  </Td>
                  <Td className="text-muted-foreground">{d.restrito ? "Restrito" : "Normal"}</Td>
                </tr>
              ))}
              {documentos.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">Nenhum documento.</Td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>

          {podeEscrever ? (
            <form action={acaoDoc} className="space-y-4 border-t border-border pt-5">
              <input type="hidden" name="colaboradorId" value={colaboradorId} />
              <Erro>{estadoDoc.erro}</Erro>
              <Sucesso>{estadoDoc.ok}</Sucesso>
              <Grade>
                <Campo rotulo="Tipo" htmlFor="doc-tipo" dica="Ex.: contrato, ASO, advertência.">
                  <Input id="doc-tipo" name="tipo" required />
                </Campo>
                <Campo rotulo="Arquivo" htmlFor="doc-arq" dica="Link. Opcional.">
                  <Input id="doc-arq" name="arquivo" />
                </Campo>
                <Campo rotulo="Emitido em" htmlFor="doc-emit" dica="Opcional.">
                  <Input id="doc-emit" name="emitidoEm" type="date" />
                </Campo>
                <Campo rotulo="Vence em" htmlFor="doc-vence" dica="Opcional.">
                  <Input id="doc-vence" name="venceEm" type="date" />
                </Campo>
              </Grade>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="restrito" className="size-4 rounded border-input" />
                Restrito
              </label>
              <BotaoEnviar enviando="Salvando…">Registrar documento</BotaoEnviar>
            </form>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contracheques</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Tabela minWidth={420}>
            <thead>
              <tr>
                <Th>Competência</Th>
                <Th>Disponibilizado</Th>
                <Th>Arquivo</Th>
              </tr>
            </thead>
            <tbody>
              {contracheques.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium">{mes(c.competencia)}</Td>
                  <Td>{data(c.disponibilizadoEm)}</Td>
                  <Td className="text-muted-foreground">{c.arquivo ? "anexado" : "—"}</Td>
                </tr>
              ))}
              {contracheques.length === 0 ? (
                <tr>
                  <Td className="text-muted-foreground">Nenhum contracheque.</Td>
                </tr>
              ) : null}
            </tbody>
          </Tabela>

          {podeEscrever ? (
            <form action={acaoCon} className="space-y-4 border-t border-border pt-5">
              <input type="hidden" name="colaboradorId" value={colaboradorId} />
              <Erro>{estadoCon.erro}</Erro>
              <Sucesso>{estadoCon.ok}</Sucesso>
              <Grade>
                <Campo rotulo="Competência" htmlFor="con-comp">
                  <Input
                    id="con-comp"
                    name="competencia"
                    type="month"
                    required
                    defaultValue={competencia}
                  />
                </Campo>
                <Campo rotulo="Arquivo" htmlFor="con-arq" dica="Link do PDF. Opcional.">
                  <Input id="con-arq" name="arquivo" />
                </Campo>
              </Grade>
              <BotaoEnviar enviando="Salvando…">Disponibilizar contracheque</BotaoEnviar>
            </form>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

export function RescisaoCard({
  colaboradorId,
  rescisao,
  hoje,
  podeEscrever,
}: {
  colaboradorId: string;
  rescisao: {
    motivo: string;
    aviso: string | null;
    dataDesligamento: Date;
    homologadaEm: Date | null;
    valorTotal: number;
  } | null;
  hoje: string;
  podeEscrever: boolean;
}) {
  const [estado, acao] = useFormState(salvarRescisao, ESTADO_VAZIO);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Rescisão</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Salvar a rescisão desliga o colaborador e, se houver valor, cria a conta a pagar do
            acerto.
          </p>
        </div>
        {rescisao?.homologadaEm ? <Carimbo>Homologada</Carimbo> : null}
      </CardHeader>
      <CardBody className="space-y-5">
        {rescisao ? (
          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo
              </dt>
              <dd className="mt-1 text-sm">{rescisao.motivo}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Aviso
              </dt>
              <dd className="mt-1 text-sm">{rescisao.aviso ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Desligamento
              </dt>
              <dd className="mt-1 text-sm">{data(rescisao.dataDesligamento)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Valor do acerto
              </dt>
              <dd className="num mt-1 text-sm tabular-nums">{formatBRL(rescisao.valorTotal)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma rescisão registrada.</p>
        )}

        {podeEscrever ? (
          <form action={acao} className="space-y-4 border-t border-border pt-5">
            <input type="hidden" name="colaboradorId" value={colaboradorId} />
            <Erro>{estado.erro}</Erro>
            <Sucesso>{estado.ok}</Sucesso>
            <Grade colunas={3}>
              <Campo rotulo="Motivo" htmlFor="res-motivo">
                <Input id="res-motivo" name="motivo" required defaultValue={rescisao?.motivo} />
              </Campo>
              <Campo rotulo="Aviso" htmlFor="res-aviso" dica="Trabalhado, indenizado, dispensado.">
                <Input id="res-aviso" name="aviso" defaultValue={rescisao?.aviso ?? ""} />
              </Campo>
              <Campo rotulo="Desligamento" htmlFor="res-data">
                <Input
                  id="res-data"
                  name="dataDesligamento"
                  type="date"
                  required
                  defaultValue={hoje}
                />
              </Campo>
              <Campo rotulo="Valor do acerto" htmlFor="res-valor" dica="Em reais.">
                <Input
                  id="res-valor"
                  name="valorTotal"
                  inputMode="decimal"
                  defaultValue={
                    rescisao ? (rescisao.valorTotal / 100).toFixed(2).replace(".", ",") : ""
                  }
                  className="num tabular-nums"
                />
              </Campo>
              <Campo rotulo="Documento" htmlFor="res-doc" dica="Link do termo. Opcional.">
                <Input id="res-doc" name="documento" />
              </Campo>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="homologada"
                    defaultChecked={Boolean(rescisao?.homologadaEm)}
                    className="size-4 rounded border-input"
                  />
                  Homologada
                </label>
              </div>
            </Grade>
            <BotaoEnviar variant="outline" enviando="Salvando…">
              Salvar rescisão
            </BotaoEnviar>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
