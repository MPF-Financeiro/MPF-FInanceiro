"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Menu do Financeiro. Ícones de traço fino para o olho achar o item sem ler,
 * os relatórios dobrados num item só (abrem quando você está num deles) e a
 * busca no topo, com cara de campo. O que é de rotina vem primeiro, sem
 * cabeçalho; só o que é de outro assunto ganha rótulo.
 */

export type Icone =
  | "painel"
  | "receber"
  | "pagar"
  | "banco"
  | "relatorios"
  | "vendas"
  | "vouchers"
  | "pessoas"
  | "cadastros";

export type ItemMenu = { href: string; rotulo: string; icone?: Icone; filhos?: ItemMenu[] };
export type GrupoMenu = { titulo?: string; itens: ItemMenu[] };

const TRACOS: Record<Icone, React.ReactNode> = {
  painel: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="5.5" rx=".6" />
      <rect x="9" y="2.5" width="4.5" height="3" rx=".6" />
      <rect x="2.5" y="10" width="4.5" height="3.5" rx=".6" />
      <rect x="9" y="7.5" width="4.5" height="6" rx=".6" />
    </>
  ),
  receber: (
    <>
      <path d="M8 2.5v7M5 6.8 8 9.8l3-3" />
      <path d="M2.5 10.5v2.2c0 .5.4.8.8.8h9.4c.4 0 .8-.3.8-.8v-2.2" />
    </>
  ),
  pagar: (
    <>
      <path d="M8 9.8v-7M5 5.5 8 2.5l3 3" />
      <path d="M2.5 10.5v2.2c0 .5.4.8.8.8h9.4c.4 0 .8-.3.8-.8v-2.2" />
    </>
  ),
  banco: <path d="M2.5 6 8 2.8 13.5 6M3.5 6.5v5M6.5 6.5v5M9.5 6.5v5M12.5 6.5v5M2.5 13.2h11" />,
  relatorios: <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />,
  vendas: (
    <>
      <path d="M2.8 8.6 8.6 2.8h4.6v4.6l-5.8 5.8a.9.9 0 0 1-1.3 0L2.8 9.9a.9.9 0 0 1 0-1.3Z" />
      <circle cx="10.6" cy="5.4" r=".9" />
    </>
  ),
  vouchers: (
    <path d="M2.5 4.5h11v2a1.5 1.5 0 0 0 0 3v2h-11v-2a1.5 1.5 0 0 0 0-3v-2ZM9.5 4.8v.9M9.5 7.6v.9M9.5 10.3v.9" />
  ),
  pessoas: (
    <>
      <circle cx="6" cy="5.5" r="2.2" />
      <path d="M2 13c.4-2.2 2-3.4 4-3.4s3.6 1.2 4 3.4" />
      <path d="M10.6 3.6a2 2 0 0 1 0 3.8M11.8 9.9c1.2.4 2 1.5 2.2 3.1" />
    </>
  ),
  cadastros: <path d="M2.5 4.2c0-.5.4-.8.8-.8h3l1.4 1.5h5c.5 0 .8.4.8.8v6.6c0 .5-.3.8-.8.8H3.3c-.4 0-.8-.3-.8-.8V4.2Z" />,
};

export function IconeMenu({ nome, className }: { nome: Icone; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 shrink-0", className)}
    >
      {TRACOS[nome]}
    </svg>
  );
}

function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
}

const LINHA =
  "relative flex h-9 w-full items-center gap-2.5 rounded-[4px] px-2.5 text-[14px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Item({ item, caminho }: { item: ItemMenu; caminho: string }) {
  const ativo = estaAtivo(caminho, item.href);
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        LINHA,
        ativo
          ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgba(21,42,58,.08)]"
          : "text-foreground/75 hover:bg-card/60 hover:text-foreground"
      )}
    >
      {ativo ? <span aria-hidden className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-brand" /> : null}
      {item.icone ? <IconeMenu nome={item.icone} className={ativo ? "text-brand" : "opacity-70"} /> : null}
      <span className="truncate">{item.rotulo}</span>
    </Link>
  );
}

/** Um item com filhos dobra: aberto quando a tela atual é um dos filhos. */
function Dobra({ item, caminho }: { item: ItemMenu; caminho: string }) {
  const dentro = (item.filhos ?? []).some((f) => estaAtivo(caminho, f.href));
  const [aberto, setAberto] = useState(dentro);
  useEffect(() => {
    if (dentro) setAberto(true);
  }, [dentro]);
  const id = `dobra-${item.href.replace(/\W/g, "")}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          LINHA,
          dentro ? "font-semibold text-foreground" : "text-foreground/75 hover:bg-card/60 hover:text-foreground"
        )}
      >
        {item.icone ? <IconeMenu nome={item.icone} className={dentro ? "text-brand" : "opacity-70"} /> : null}
        <span className="truncate">{item.rotulo}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className={cn("ms-auto size-3.5 opacity-60 transition-transform duration-150", aberto && "rotate-90")}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>
      {aberto ? (
        // Os filhos ficam numa pauta recuada, presos a um fio: lê-se como
        // sub-itens sem precisar de mais um cabeçalho.
        <ul id={id} className="mb-1 ms-[17px] mt-0.5 border-s border-border ps-2">
          {item.filhos!.map((f) => (
            <li key={f.href}>
              <Item item={f} caminho={caminho} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Lista({ grupos, caminho }: { grupos: GrupoMenu[]; caminho: string }) {
  return (
    <div className="space-y-4">
      {grupos.map((g, i) => (
        <div key={g.titulo ?? i}>
          {g.titulo ? <p className="mb-1 px-2.5 text-[12px] font-medium text-muted-foreground">{g.titulo}</p> : null}
          <ul className="space-y-px">
            {g.itens.map((item) => (
              <li key={item.href}>
                {item.filhos?.length ? <Dobra item={item} caminho={caminho} /> : <Item item={item} caminho={caminho} />}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** A busca no topo, com cara de campo: é para onde o olho vai primeiro. */
export function AtalhoBusca() {
  const caminho = usePathname() ?? "/";
  const ativo = estaAtivo(caminho, "/busca");
  return (
    <Link
      href="/busca"
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2 rounded-[4px] border border-input bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ativo && "border-brand text-foreground"
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4" className="size-4">
        <circle cx="7" cy="7" r="4.2" />
        <path d="M10.2 10.2 13.5 13.5" strokeLinecap="round" />
      </svg>
      Buscar título, cliente…
    </Link>
  );
}

/** Barra lateral no computador. */
export function MenuLateral({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname() ?? "/";
  return (
    <nav aria-label="Seções" className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3">
      <Lista grupos={grupos} caminho={caminho} />
    </nav>
  );
}

/** No celular, o mesmo menu abre por cima e fecha sozinho ao trocar de tela. */
export function MenuCelular({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname() ?? "/";
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [caminho]);
  const atual = grupos
    .flatMap((g) => g.itens.flatMap((i) => [i, ...(i.filhos ?? [])]))
    .find((i) => !i.filhos && estaAtivo(caminho, i.href));

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
          className="fixed inset-x-0 bottom-0 top-[57px] z-30 space-y-4 overflow-y-auto border-t border-border bg-[hsl(var(--paper-deep))] px-3 py-5"
        >
          <AtalhoBusca />
          <Lista grupos={grupos} caminho={caminho} />
        </div>
      ) : null}
    </div>
  );
}
