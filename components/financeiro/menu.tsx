"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ItemMenu = { href: string; rotulo: string };

/**
 * O menu marca onde a pessoa está. Sem isso, com nove telas, ela se perde
 * depois de dois cliques.
 */
export function Menu({ itens }: { itens: ItemMenu[] }) {
  const caminho = usePathname() ?? "/";

  return (
    <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-2 md:mx-0 md:w-auto">
      {itens.map((item) => {
        const ativo =
          item.href === "/" ? caminho === "/" : caminho === item.href || caminho.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              ativo
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
