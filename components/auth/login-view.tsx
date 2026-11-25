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
        className="relative hidden overflow-hidden bg-[hsl(var(--brand))] text-white md:order-1 md:flex md:flex-col md:justify-between md:px-12 md:py-12 lg:px-16"
        aria-hidden="true"
      >
        {/* Pauta de livro-caixa, em tinta clara sobre a capa azul. */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_31px,rgba(255,255,255,.07)_31px_32px)]" />
        <div className="pointer-events-none absolute inset-y-0 start-[88px] w-px bg-white/15 lg:start-[104px]" />

        <FinanceiroLogo claro className="relative" />

        <div className="relative max-w-md">
          <p className="text-balance text-[30px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Cada número com a conta aberta atrás dele.
          </p>
          <div className="mt-10 rounded-[4px] bg-white/[.06] p-5 ring-1 ring-white/15">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-white/60">
              <span>Outubro</span>
              <span className="rotate-[-3deg] rounded-[3px] border-2 border-white/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/90">
                Mês fechado
              </span>
            </div>
            <dl className="mt-4 space-y-2 font-mono text-[13px]">
              <div className="flex justify-between"><dt className="text-white/70">Entrou</dt><dd>32.040,00</dd></div>
              <div className="flex justify-between"><dt className="text-white/70">Saiu</dt><dd>− 32.780,10</dd></div>
              <div className="flex justify-between border-t border-white/40 pt-2 font-semibold"><dt>Sobra</dt><dd>− 740,10</dd></div>
            </dl>
          </div>
        </div>

        <p className="relative text-xs text-white/55">
          A receber, a pagar, vendas do site, folha e conciliação.
        </p>
      </aside>

      {/* Formulário à DIREITA. */}
      <main className="flex flex-col justify-center bg-background px-6 pb-16 pt-20 md:order-2 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <FinanceiroLogo className="md:hidden" />

          <div className="mt-8 border-b-2 border-foreground pb-4 md:mt-0">
            <h1 className="text-balance text-[28px] font-semibold tracking-[-0.02em]">
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
                className="rounded-[4px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
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

        </div>
      </main>
    </div>
  );
}
