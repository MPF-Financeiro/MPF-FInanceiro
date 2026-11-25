import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { mesAnterior, mesSeguinte, paraInputMonth } from "@/lib/mes";
import { cn, competenciaLonga } from "@/lib/utils";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesCurto = (d: Date) => `${MESES_CURTOS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
export const mesLongo = (d: Date) => {
  const t = competenciaLonga(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
};
/** "− R$ 7.881,36" e "+ R$ 120,00": o sinal separado, como no razão. */
export const comSinal = (v: number) => `${v < 0 ? "− " : v > 0 ? "+ " : ""}${formatBRL(Math.abs(v))}`;

export const pct = (bps: number | null) =>
  bps === null ? "—" : `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Anterior · mês · próximo. Links, não JavaScript: funciona até no print. */
export function SeletorDeMes({ caminho, mes }: { caminho: string; mes: Date }) {
  const link =
    "inline-flex size-9 items-center justify-center rounded-[4px] border border-input bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <nav aria-label="Mês do relatório" className="flex items-center gap-2">
      <Link href={`${caminho}?mes=${paraInputMonth(mesAnterior(mes))}`} className={link} aria-label="Mês anterior">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
      </Link>
      <span className="min-w-[150px] text-center text-sm font-semibold">{mesLongo(mes)}</span>
      <Link href={`${caminho}?mes=${paraInputMonth(mesSeguinte(mes))}`} className={link} aria-label="Próximo mês">
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M6 3.5 10.5 8 6 12.5" /></svg>
      </Link>
    </nav>
  );
}

/**
 * Uma linha do demonstrativo, como no razão: rótulo à esquerda, valor em
 * coluna à direita. `nivel` recua; `total` ganha a pauta dupla de fechamento.
 */
export function LinhaDoDemonstrativo({
  rotulo,
  valor,
  nota,
  nivel = 0,
  tipo = "normal",
  sinal = "auto",
  href,
}: {
  rotulo: React.ReactNode;
  valor: number | null;
  nota?: React.ReactNode;
  nivel?: 0 | 1;
  tipo?: "normal" | "subtotal" | "total";
  /** "menos" escreve "− " na frente mesmo com valor positivo (é uma saída). */
  sinal?: "auto" | "menos" | "mais";
  href?: string;
}) {
  const negativo = valor !== null && (sinal === "menos" ? valor > 0 : valor < 0);
  const texto =
    valor === null
      ? "—"
      : `${negativo ? "− " : sinal === "mais" && valor > 0 ? "+ " : ""}${formatBRL(Math.abs(valor))}`;
  const conteudo = (
    <>
      <span className={cn("min-w-0", nivel === 1 && "ps-5")}>
        <span className={cn(href && "group-hover:underline group-hover:decoration-border group-hover:underline-offset-4")}>{rotulo}</span>
        {nota ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{nota}</span> : null}
      </span>
      <span
        className={cn(
          "num shrink-0 text-end",
          negativo && tipo === "normal" && "text-destructive",
          tipo !== "normal" && valor !== null && valor < 0 && "text-destructive"
        )}
      >
        {texto}
      </span>
    </>
  );
  const classe = cn(
    "flex items-baseline justify-between gap-6 py-2.5 text-[14px]",
    tipo === "normal" && "border-b border-[hsl(var(--rule-soft))]",
    tipo === "subtotal" && "border-b border-foreground/70 font-semibold",
    tipo === "total" && "border-b-[3px] border-double border-foreground pt-3 text-[15px] font-semibold",
    nivel === 1 && "text-muted-foreground"
  );
  if (href) {
    return (
      <Link href={href} className={cn(classe, "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
        {conteudo}
      </Link>
    );
  }
  return <div className={classe}>{conteudo}</div>;
}

/**
 * A checagem da especificação, escrita na própria tela: quem confere vê que a
 * conta fecha, e se não fechar, vê que não fechou.
 */
export function Conferencia({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className={cn("mt-4 flex items-start gap-2 text-xs", ok ? "text-muted-foreground" : "font-semibold text-destructive")}>
      <span
        aria-hidden
        className={cn(
          "mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] text-[10px] font-bold leading-none",
          ok ? "border-[hsl(var(--success))] text-[hsl(var(--success))]" : "border-destructive"
        )}
      >
        {ok ? "✓" : "!"}
      </span>
      <span>
        <span className="sr-only">{ok ? "Conferido: " : "Não fecha: "}</span>
        {children}
      </span>
    </p>
  );
}

/** Barras de um valor com sinal por mês: positivo sobe (verde), negativo desce (vermelho). */
export function BarrasComSinal({ meses, valores }: { meses: Date[]; valores: number[] }) {
  const max = Math.max(...valores.map(Math.abs), 1);
  const ultimo = meses.length - 1;
  return (
    <div className="grid items-stretch gap-1" style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0,1fr))` }}>
      {meses.map((m, i) => {
        const v = valores[i];
        const h = `${(Math.abs(v) / max) * 100}%`;
        return (
          <div key={m.toISOString()} title={`${mesCurto(m)}: ${formatBRL(v)}`} className="flex flex-col items-center">
            <div className="flex h-9 w-full items-end justify-center">
              {v > 0 ? <div className="w-[46%] max-w-6 rounded-t-[2px] bg-[hsl(var(--success))]" style={{ height: h }} /> : null}
            </div>
            <div className="h-px w-full bg-foreground/70" />
            <div className="flex h-9 w-full items-start justify-center">
              {v < 0 ? <div className="w-[46%] max-w-6 rounded-b-[2px] bg-destructive" style={{ height: h }} /> : null}
            </div>
            <span className={cn("mt-1 text-[10.5px]", i === ultimo ? "font-semibold" : "text-muted-foreground")}>{mesCurto(m)}</span>
          </div>
        );
      })}
    </div>
  );
}
