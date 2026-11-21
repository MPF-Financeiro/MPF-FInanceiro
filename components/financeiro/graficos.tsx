import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "R$ 38,4 mil": para eixo e rótulo de barra, onde o centavo só atrapalha. */
export function compacto(centavos: number): string {
  const reais = Math.abs(centavos) / 100;
  if (reais >= 1000) {
    return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** 30.420,15 vira "30,4": a tabela do gráfico diz em cima que é R$ mil. */
function emMil(centavos: number) {
  return (Math.abs(centavos) / 100_000).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function mesCurto(d: Date) {
  return `${MESES_CURTOS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

/** Arredonda o topo do eixo para um número redondo: 38.420 vira 40.000. */
function topoRedondo(max: number) {
  if (max <= 0) return 100_00;
  const passo = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / (passo / 2)) * (passo / 2);
}

/**
 * Fluxo de caixa mês a mês: o que entrou sobe da linha, o que saiu desce.
 * A posição já diz o sentido, então a cor (verde e vermelho, que muita gente
 * confunde) nunca trabalha sozinha. Embaixo de cada mês, a conta escrita.
 */
type MesGrafico = { mes: Date; entradas: number; saidas: number };

export function GraficoCaixa({ meses }: { meses: MesGrafico[] }) {
  const topo = topoRedondo(Math.max(...meses.flatMap((m) => [m.entradas, m.saidas]), 0));
  const altura = (v: number) => `${Math.max(0, Math.min(100, (v / topo) * 100))}%`;
  const ultimo = meses.length - 1;

  return (
    <figure>
      <figcaption className="sr-only">
        Entradas e saídas de caixa por mês. A tabela logo abaixo do gráfico traz os mesmos números.
      </figcaption>
      <div className="flex items-center gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px] bg-[hsl(var(--success))]" />
          Entrou (acima da linha)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[2px] bg-destructive" />
          Saiu (abaixo da linha)
        </span>
      </div>

      <div className="relative mt-4" aria-hidden>
        {/* Eixo: só a referência de cima e de baixo, pauta clara. */}
        <span className="num absolute -top-1 start-0 text-[10.5px] text-muted-foreground">
          {compacto(topo)}
        </span>
        <span className="num absolute -bottom-1 start-0 text-[10.5px] text-muted-foreground">
          − {compacto(topo)}
        </span>
        <div className="ms-[52px] grid sm:ms-[64px]" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0,1fr))` }}>
          {meses.map((m, i) => (
            <div
              key={m.mes.toISOString()}
              title={`${mesCurto(m.mes)}: entrou ${formatBRL(m.entradas)}, saiu ${formatBRL(m.saidas)}`}
              className={cn(
                "group relative flex flex-col items-center border-s border-dashed border-[hsl(var(--rule-soft))] first:border-s-0",
                i === ultimo && "bg-[hsl(var(--accent)/0.55)]"
              )}
            >
              <div className="flex h-[118px] w-full items-end justify-center">
                <div
                  className="w-[38%] max-w-[34px] rounded-t-[3px] bg-[hsl(var(--success))] transition-opacity duration-150 group-hover:opacity-80"
                  style={{ height: altura(m.entradas) }}
                />
              </div>
              <div className="h-[1.5px] w-full bg-foreground" />
              <div className="flex h-[118px] w-full items-start justify-center">
                <div
                  className="w-[38%] max-w-[34px] rounded-b-[3px] bg-destructive transition-opacity duration-150 group-hover:opacity-80"
                  style={{ height: altura(m.saidas) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* A conta de cada mês, alinhada com a coluna do gráfico. */}
      <table className="mt-3 w-full table-fixed border-collapse text-[12px]">
        <thead className="sr-only">
          <tr>
            <th scope="col">Linha</th>
            {meses.map((m) => (
              <th scope="col" key={m.mes.toISOString()}>
                {mesCurto(m.mes)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-foreground/80">
            <th scope="row" className="w-[52px] py-1.5 text-start font-normal sm:w-[64px]">
              <span className="text-[10.5px] text-muted-foreground">R$ mil</span>
            </th>
            {meses.map((m, i) => (
              <td
                key={m.mes.toISOString()}
                className={cn(
                  "py-1.5 text-center text-[11px] font-semibold sm:text-[12px]",
                  i === ultimo ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {mesCurto(m.mes)}
              </td>
            ))}
          </tr>
          {(
            [
              ["Entrou", (m: MesGrafico) => m.entradas, "text-[hsl(var(--success))]"],
              ["Saiu", (m: MesGrafico) => -m.saidas, "text-destructive"],
              ["Sobra", (m: MesGrafico) => m.entradas - m.saidas, "font-semibold"],
            ] as const
          ).map(([rotulo, valor, classe]) => (
            <tr key={rotulo} className="border-b border-[hsl(var(--rule-soft))] last:border-b-0">
              <th scope="row" className="rotulo w-[52px] py-1.5 text-start sm:w-[64px]">
                {rotulo}
              </th>
              {meses.map((m) => {
                const v = valor(m);
                return (
                  <td
                    key={m.mes.toISOString()}
                    className={cn(
                      "num py-1.5 text-center text-[11px] sm:text-[12px]",
                      classe,
                      rotulo === "Sobra" && v < 0 && "text-destructive"
                    )}
                  >
                    {v < 0 ? "−" : rotulo === "Sobra" && v > 0 ? "+" : ""}
                    {emMil(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Barras deitadas, uma série só: tinta. O nome da categoria e o valor ficam
 * escritos; a barra só mostra o tamanho relativo.
 */
export function BarrasHorizontais({
  linhas,
  total,
}: {
  linhas: { rotulo: string; valor: number }[];
  total: number;
}) {
  const maior = Math.max(...linhas.map((l) => l.valor), 1);
  return (
    <ul className="space-y-3">
      {linhas.map((l) => (
        <li key={l.rotulo} title={`${l.rotulo}: ${formatBRL(l.valor)}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{l.rotulo}</span>
            <span className="num shrink-0">
              {formatBRL(l.valor)}
              <span className="ms-2 inline-block w-9 text-end text-muted-foreground">
                {total > 0 ? Math.round((l.valor / total) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-[7px] w-full rounded-full bg-[hsl(var(--rule-soft))]">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${(l.valor / maior) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Competência contra caixa numa linha só: quanto do que foi vendido (ou
 * gasto) já virou dinheiro, e quanto ainda não.
 */
export function BarraDeRealizacao({
  rotulo,
  total,
  realizado,
  realizadoRotulo,
  faltaRotulo,
}: {
  rotulo: string;
  total: number;
  realizado: number;
  realizadoRotulo: string;
  faltaRotulo: string;
}) {
  const parte = total > 0 ? Math.min(100, (realizado / total) * 100) : 0;
  const falta = Math.max(0, total - realizado);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold">{rotulo}</p>
        <p className="num text-[15px] font-medium">{formatBRL(total)}</p>
      </div>
      <div className="mt-2 flex h-[10px] w-full overflow-hidden rounded-[2px] bg-[repeating-linear-gradient(135deg,hsl(var(--rule-soft))_0_3px,transparent_3px_6px)] ring-1 ring-inset ring-border">
        <div className="h-full bg-brand" style={{ width: `${parte}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
        <span>
          <span aria-hidden className="me-1.5 inline-block size-2 rounded-[1px] bg-brand align-middle" />
          {realizadoRotulo} <span className="num">{formatBRL(realizado)}</span>
        </span>
        <span className="text-muted-foreground">
          <span
            aria-hidden
            className="me-1.5 inline-block size-2 rounded-[1px] bg-[repeating-linear-gradient(135deg,hsl(var(--input))_0_2px,transparent_2px_4px)] align-middle ring-1 ring-border"
          />
          {faltaRotulo} <span className="num">{formatBRL(falta)}</span>
        </span>
      </div>
    </div>
  );
}
