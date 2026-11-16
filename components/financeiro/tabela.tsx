import { cn } from "@/lib/utils";

/** Tabela rola sozinha no celular em vez de empurrar a página. */
export function Tabela({
  children,
  minWidth = 720,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  numero,
  className,
}: {
  children?: React.ReactNode;
  numero?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border pb-2 pe-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        numero ? "text-end" : "text-start",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numero,
  className,
}: {
  children: React.ReactNode;
  numero?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-border/60 py-3 pe-4 align-middle",
        numero && "num text-end tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}
