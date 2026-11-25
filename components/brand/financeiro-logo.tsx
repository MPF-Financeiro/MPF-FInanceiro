/**
 * Marca provisória. A cliente ainda não mandou a logo do Financeiro: o lugar
 * está reservado e o desenho sai daqui quando ela chegar. O monograma é o "F"
 * dentro de um quadro de tinta, como o carimbo da casa.
 */
export function FinanceiroLogo({
  layout = "inline",
  className = "",
  claro = false,
}: {
  layout?: "inline" | "stacked";
  className?: string;
  /** Sobre fundo de tinta (o login). */
  claro?: boolean;
}) {
  const stacked = layout === "stacked";
  const cor = claro ? "#FFFFFF" : "hsl(var(--foreground))";
  return (
    <div
      className={`flex ${stacked ? "flex-col items-start gap-4" : "items-center gap-3"} ${className}`}
    >
      <svg
        viewBox="0 0 36 36"
        className={stacked ? "size-12" : "size-8"}
        role="img"
        aria-label="Samps Financeiro"
      >
        <rect x="1" y="1" width="34" height="34" rx="4" fill="none" stroke={cor} strokeWidth="1.6" />
        <path d="M13 26V10h11M13 18h8" fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="square" />
      </svg>
      <div>
        <p
          className="text-[13px] font-bold uppercase leading-none tracking-[0.16em]"
          style={{ color: cor }}
        >
          Financeiro
        </p>
        <p
          className="mt-1.5 text-[11px] leading-none tracking-wide"
          style={{ color: claro ? "rgba(255,255,255,.7)" : "hsl(var(--muted-foreground))" }}
        >
          Samps Digital
        </p>
      </div>
    </div>
  );
}
