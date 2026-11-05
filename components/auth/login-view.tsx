"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { entrar, type EstadoLogin } from "@/app/(auth)/login/actions";
import { FinanceiroLogo } from "@/components/brand/financeiro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_LEMBRADO = "samps.financeiro.login.email";

function lerEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_LEMBRADO)?.trim() || null;
  } catch {
    return null;
  }
}

function gravarEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(EMAIL_LEMBRADO, email);
    else localStorage.removeItem(EMAIL_LEMBRADO);
  } catch {
    /* modo privado: ignorar */
  }
}

/**
 * O espelho do login do SampsOS: lá o formulário fica à esquerda e a marca à
 * direita; aqui é o contrário. É isso que diz, num relance, em qual dos dois
 * sistemas a pessoa está — foi o pedido do Jorito.
 */
const ESTADO_INICIAL: EstadoLogin = { erro: null };

function BotaoEntrar({ pronto }: { pronto: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || !pronto} className="w-full">
      {pending ? "Entrando..." : "Entrar"}
    </Button>
  );
}

export function LoginView({ callbackUrl }: { callbackUrl?: string }) {
  const [estado, acao] = useFormState(entrar, ESTADO_INICIAL);
  const [email, setEmail] = useState("");
  const [lembrar, setLembrar] = useState(false);
  // Sem JS o formulário não pode enviar: o navegador mandaria a senha na URL.
  const [pronto, setPronto] = useState(false);
  const erro = estado.erro;

  useEffect(() => setPronto(true), []);
  useEffect(() => {
    const salvo = lerEmail();
    if (salvo) {
      setEmail(salvo);
      setLembrar(true);
    }
  }, []);

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      {/* Marca à ESQUERDA: o espelho do SampsOS, onde ela fica à direita. */}
      <aside
        className="relative hidden overflow-hidden border-border bg-[hsl(var(--brand))] md:order-1 md:flex md:flex-col md:items-center md:justify-center md:border-e md:px-12"
        aria-hidden="true"
      >
        <div className="pointer-events-none absolute -start-20 top-16 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -end-16 bottom-12 size-80 rounded-full bg-white/[.07] blur-3xl" />
        <div className="relative z-10 flex max-w-sm flex-col items-center text-center text-white">
          <svg viewBox="0 0 64 64" className="size-16" role="img" aria-label="">
            <rect width="64" height="64" rx="15" fill="white" fillOpacity=".12" />
            <path
              d="M13 20c5.8-2.6 11.6-2.6 17.4 0v25.6c-5.8-2.6-11.6-2.6-17.4 0V20ZM34.6 20c5.8-2.6 11.6-2.6 17.4 0v25.6c-5.8-2.6-11.6-2.6-17.4 0V20Z"
              fill="none"
              stroke="white"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path d="M32.5 21.4v25.2" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <p className="mt-8 text-balance font-display text-2xl font-semibold">
            Financeiro e RH
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-white/70">
            Contas a receber e a pagar, vendas do site, folha, benefícios e
            conciliação. Cada número com a conta aberta atrás dele.
          </p>
        </div>
      </aside>

      {/* Formulário à DIREITA. */}
      <main className="flex flex-col justify-center bg-background px-6 pb-16 pt-20 md:order-2 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <FinanceiroLogo />

          <div className="mt-8">
            <h1 className="text-balance font-display text-2xl font-semibold tracking-tight">
              Entrar
            </h1>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Acesso ao Financeiro e ao RH da Samps.
            </p>
          </div>

          <form
            action={(dados) => {
              gravarEmail(lembrar ? String(dados.get("email") ?? "").trim().toLowerCase() : null);
              acao(dados);
            }}
            className="mt-8 space-y-4"
          >
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/financeiro"} />
            {erro ? (
              <p
                id="login-erro"
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {erro}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="voce@sampsdigital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? "login-erro" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? "login-erro" : undefined}
              />
            </div>

            <div className="flex min-h-10 items-center gap-2">
              <input
                id="lembrar"
                type="checkbox"
                checked={lembrar}
                onChange={(e) => {
                  setLembrar(e.target.checked);
                  if (!e.target.checked) gravarEmail(null);
                }}
                className="size-4 rounded border-input accent-[hsl(var(--brand))]"
              />
              <Label htmlFor="lembrar" className="cursor-pointer font-normal">
                Lembrar e-mail
              </Label>
            </div>

            <BotaoEntrar pronto={pronto} />
          </form>

          {/* A volta para o outro sistema: o par do botão que vai no SampsOS. */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <a
              href="/login"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Ir para o SampsOS
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
