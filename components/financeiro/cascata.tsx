import { formatBRL, type LinhaCascata } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * A conta de dinheiro aberta linha a linha, do valor cheio até o líquido.
 * É a assinatura que ficou da direção Livro-caixa: todo número grande desta
 * aplicação tem de poder ser aberto assim.
 */
export function Cascata({
  linhas,
  titulo,
  className,
}: {
  linhas: LinhaCascata[];
  titulo?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {titulo ? (
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">{titulo}</p>
      ) : null}
      <dl className="px-4 py-1">
        {linhas.map((l, i) => (
          <div
            key={`${l.rotulo}-${i}`}
            className={cn(
              "flex items-baseline justify-between gap-6 py-2.5 text-sm",
              i > 0 && !l.total && "border-t border-border/60",
              l.total && "mt-1 border-t-2 border-foreground/80 font-semibold"
            )}
          >
            <dt className={cn(l.total ? "text-foreground" : "text-muted-foreground")}>
              {l.rotulo}
            </dt>
            <dd
              className={cn(
                "num tabular-nums",
                l.valor < 0 && "text-destructive",
                l.total && "text-base"
              )}
            >
              {l.valor < 0 ? `− ${formatBRL(-l.valor)}` : formatBRL(l.valor)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
