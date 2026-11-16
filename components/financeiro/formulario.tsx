"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Um campo do formulário. "Opcional" vira um sufixo discreto no rótulo, não
 * uma linha de dica embaixo: numa tela com oito campos opcionais, oito linhas
 * de "Opcional." viram ruído e a dica que importa de verdade se perde no meio.
 */
export function Campo({
  rotulo,
  dica,
  opcional,
  children,
  htmlFor,
  className,
}: {
  rotulo: string;
  dica?: string;
  opcional?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {rotulo}
        {opcional ? (
          <span className="ms-1.5 font-normal text-muted-foreground">(opcional)</span>
        ) : null}
      </Label>
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
export function BotaoEnviar({ children, enviando, ...props }: ButtonProps & { enviando?: string }) {
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

/**
 * Token do formulário, gerado uma vez quando a tela abre e enviado escondido.
 * O servidor grava o token antes de criar o lançamento, na mesma transação:
 * clique duplo, F5 e reenvio por internet ruim chegam com o mesmo token e o
 * segundo é recusado. Erro de validação não gasta o token, porque a transação
 * volta atrás junto.
 */
export function TokenDoFormulario() {
  const [token] = React.useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  });
  return <input type="hidden" name="token" value={token} />;
}

/**
 * Formulário atrás de um botão. A tela do RH abria com três formulários
 * longos e compridos à mostra, e o que a pessoa vai ver na maioria das vezes
 * é a lista, não o cadastro. Editar uma linha abre sozinho — nunca esconde o
 * formulário de quem acabou de clicar em "Editar".
 */
export function AreaDeFormulario({
  rotulo,
  abrirSozinho,
  children,
}: {
  rotulo: string;
  abrirSozinho?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = React.useState(false);
  if (aberto || abrirSozinho) {
    return <div className="border-t border-border pt-5">{children}</div>;
  }
  return (
    <div className="border-t border-border pt-5">
      <Button type="button" variant="outline" onClick={() => setAberto(true)}>
        {rotulo}
      </Button>
    </div>
  );
}
