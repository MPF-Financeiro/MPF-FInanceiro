import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { FinanceiroLogo } from "@/components/brand/financeiro-logo";
import { Button } from "@/components/ui/button";

const MENU = [
  { href: "/", rotulo: "Painel" },
  { href: "/receber", rotulo: "A receber" },
  { href: "/pagar", rotulo: "A pagar" },
  { href: "/vendas", rotulo: "Vendas do site" },
];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <FinanceiroLogo />
          <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto md:order-2 md:mx-0 md:w-auto">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>
          <div className="order-2 ms-auto flex items-center gap-3 md:order-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {sessao.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1360px] px-5 py-8">{children}</main>
    </div>
  );
}
