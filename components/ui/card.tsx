import * as React from "react";
import { cn } from "@/lib/utils";

/** A folha: branco sobre o papel, pauta fina em volta, canto quase reto. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={// min-w-0: sem isto, uma tabela larga dentro de um grid empurra a
      // página em vez de rolar sozinha no celular.
      cn(
        "min-w-0 rounded-[6px] border border-border bg-card shadow-[0_1px_0_rgba(21,42,58,.04),0_8px_24px_-18px_rgba(21,42,58,.25)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-3 border-b border-[hsl(var(--rule-soft))] px-5 pb-3 pt-4",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-[15px] font-semibold tracking-[-0.005em]", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
