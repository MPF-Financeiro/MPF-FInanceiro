"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ItemMenu = { href: string; rotulo: string };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
}

function Lista({ grupos, caminho }: { grupos: GrupoMenu[]; caminho: string }) {
  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className="rotulo mb-1.5 px-3">{g.titulo}</p>
          <ul>
            {g.itens.map((item) => {
              const ativo = estaAtivo(caminho, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "relative flex items-center rounded-[4px] px-3 py-[6px] text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      ativo
                        ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgba(21,42,58,.08)]"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    )}
                  >
                    {/* A linha de caneta marca a página, como um dedo na pauta. */}
                    {ativo ? (
                      <span aria-hidden className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-brand" />
                    ) : null}
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Barra lateral no computador. */
export function MenuLateral({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname() ?? "/";
  return (
    <nav aria-label="Seções" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
      <Lista grupos={grupos} caminho={caminho} />
    </nav>
  );
}

/** No celular, o mesmo menu abre por cima e fecha sozinho ao trocar de tela. */
export function MenuCelular({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname() ?? "/";
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [caminho]);
  const atual = grupos.flatMap((g) => g.itens).find((i) => estaAtivo(caminho, i.href));

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="menu-celular"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-[4px] border border-input bg-card px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
          {aberto ? <path d="M4 4l8 8M12 4l-8 8" /> : <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />}
        </svg>
        {atual?.rotulo ?? "Menu"}
      </button>
      {aberto ? (
        <div
          id="menu-celular"
          className="fixed inset-x-0 bottom-0 top-[57px] z-30 overflow-y-auto border-t border-border bg-[hsl(var(--paper-deep))] px-3 py-6"
        >
          <Lista grupos={grupos} caminho={caminho} />
        </div>
      ) : null}
    </div>
  );
}
