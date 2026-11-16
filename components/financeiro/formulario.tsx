"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Campo({
  rotulo,
  dica,
  children,
  htmlFor,
  className,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{rotulo}</Label>
      {children}
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}

export function Grade({
  children,
  colunas = 2,
  className,
}: {
  children: React.ReactNode;
  colunas?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        colunas === 2 && "sm:grid-cols-2",
        colunas === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Erro do servidor: uma frase, no topo do formulário, sem cor de enfeite. */
export function Erro({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  );
}

export function Sucesso({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className="rounded-md border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 px-3 py-2 text-sm text-[hsl(var(--success))]"
    >
      {children}
    </p>
  );
}

/**
 * Enviar bloqueia e diz que está indo. Clique duplo em "dar baixa" é como
 * nasce o pagamento lançado duas vezes.
 */
export function BotaoEnviar({
  children,
  enviando,
  ...props
}: ButtonProps & { enviando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (enviando ?? "Salvando…") : children}
    </Button>
  );
}

export function LinhaDeAcoes({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
