import type { StatusTitulo } from "@/lib/money";
import { cn } from "@/lib/utils";

const POR_STATUS: Record<StatusTitulo, { classe: string; rotulo: string }> = {
  QUITADO: { classe: "chip-ok", rotulo: "Recebido" },
  ABERTO: { classe: "chip-info", rotulo: "Em aberto" },
  PARCIAL: { classe: "chip-warn", rotulo: "Parcial" },
  VENCIDO: { classe: "chip-bad", rotulo: "Vencido" },
  CANCELADO: { classe: "chip-plain", rotulo: "Cancelado" },
};

export function ChipStatus({
  status,
  rotulo,
}: {
  status: StatusTitulo;
  /** "Pago" em vez de "Recebido" numa conta a pagar. */
  rotulo?: string;
}) {
  const { classe, rotulo: padrao } = POR_STATUS[status];
  return <span className={cn("chip", classe)}>{rotulo ?? padrao}</span>;
}

/** Só para o que está fechado e não muda mais. */
export function Carimbo({ children, neutro }: { children: React.ReactNode; neutro?: boolean }) {
  return <span className={cn("carimbo", neutro && "carimbo-neutro")}>{children}</span>;
}
