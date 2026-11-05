import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao ? (
          <p className="mt-1 max-w-xl text-pretty text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acao}
    </div>
  );
}

export function Numero({
  rotulo,
  valor,
  nota,
  tom = "neutro",
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  tom?: "neutro" | "bom" | "ruim";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={cn(
          "num mt-1.5 text-xl font-semibold tabular-nums",
          tom === "bom" && "text-[hsl(var(--success))]",
          tom === "ruim" && "text-destructive"
        )}
      >
        {formatBRL(valor)}
      </p>
      {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  );
}
