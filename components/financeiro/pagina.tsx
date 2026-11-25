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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
      <div>
        <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          {titulo}
        </h1>
        {descricao ? (
          <p className="mt-1.5 max-w-2xl text-pretty text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acao}
    </div>
  );
}

/**
 * Um número do livro: pauta grossa em cima, rótulo pequeno, valor em
 * algarismos de coluna. Sem caixa em volta; quem separa é a pauta.
 */
export function Numero({
  rotulo,
  valor,
  nota,
  tom = "neutro",
  sinal = false,
  className,
}: {
  rotulo: string;
  valor: number;
  nota?: React.ReactNode;
  tom?: "neutro" | "bom" | "ruim";
  /** Mostra "+" e "−" na frente: para resultado e variação. */
  sinal?: boolean;
  className?: string;
}) {
  const texto = formatBRL(Math.abs(valor));
  return (
    <div className={cn("min-w-0 border-t-2 border-foreground pt-3", className)}>
      <p className="rotulo">{rotulo}</p>
      <p
        className={cn(
          "num mt-2 truncate text-[17px] font-medium leading-none sm:text-[22px] xl:text-[24px]",
          tom === "bom" && "text-[hsl(var(--success))]",
          tom === "ruim" && "text-destructive"
        )}
      >
        {sinal || valor < 0 ? (valor < 0 ? "− " : "+ ") : ""}
        {texto}
      </p>
      {nota ? <p className="mt-2 text-xs text-muted-foreground">{nota}</p> : null}
    </div>
  );
}
