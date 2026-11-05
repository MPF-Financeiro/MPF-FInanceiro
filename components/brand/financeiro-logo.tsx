/**
 * Marca provisória. A cliente ainda não mandou a logo do Financeiro: o lugar
 * está reservado e o desenho sai daqui quando ela chegar. O monograma é um
 * livro-caixa aberto, que é de onde veio a direção visual.
 */
export function FinanceiroLogo({
  layout = "inline",
  className = "",
}: {
  layout?: "inline" | "stacked";
  className?: string;
}) {
  const stacked = layout === "stacked";
  return (
    <div
      className={`flex ${stacked ? "flex-col items-center gap-3" : "items-center gap-3"} ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className={stacked ? "size-14" : "size-9"}
        role="img"
        aria-label="Samps Financeiro"
      >
        <rect width="40" height="40" rx="9" fill="hsl(var(--brand))" />
        <path
          d="M8 12.5c3.6-1.6 7.2-1.6 10.8 0v16c-3.6-1.6-7.2-1.6-10.8 0v-16ZM21.2 12.5c3.6-1.6 7.2-1.6 10.8 0v16c-3.6-1.6-7.2-1.6-10.8 0v-16Z"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M20 13.4v15.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div className={stacked ? "text-center" : ""}>
        <p className="font-display text-base font-semibold leading-none tracking-tight">
          Samps <span className="text-brand">Financeiro</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Financeiro e RH</p>
      </div>
    </div>
  );
}
