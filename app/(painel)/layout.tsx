import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { FinanceiroLogo } from "@/components/brand/financeiro-logo";
import { Button } from "@/components/ui/button";
import { Menu, type ItemMenu } from "@/components/financeiro/menu";
import { podeLancar, podeRH, sessaoAtual } from "@/lib/permissoes";
import { ROTULO_PAPEL } from "@/lib/permissoes";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  const quem = await sessaoAtual();

  // O menu mostra só o que o papel pode abrir: menos chance de clicar e
  // tomar um "sem permissão" na cara.
  const menu: ItemMenu[] = [
    { href: "/", rotulo: "Painel" },
    { href: "/receber", rotulo: "A receber" },
    { href: "/pagar", rotulo: "A pagar" },
    { href: "/vendas", rotulo: "Vendas do site" },
    { href: "/vouchers", rotulo: "Vouchers" },
    ...(quem && podeRH(quem.papel) ? [{ href: "/rh", rotulo: "RH" }] : []),
    ...(quem && podeLancar(quem.papel)
      ? [
          { href: "/banco", rotulo: "Banco" },
          { href: "/cadastros", rotulo: "Cadastros" },
        ]
      : []),
    { href: "/busca", rotulo: "Busca" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
          <FinanceiroLogo />
          <Menu itens={menu} />
          <div className="order-2 ms-auto flex items-center gap-3 md:order-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {sessao.user.name}
              {quem ? ` · ${ROTULO_PAPEL[quem.papel]}` : ""}
            </span>
            <form
              action={async () => {
                "use server";
                // redirect do next-auth não conhece o basePath: ele sai do
                // app e cai no login do SampsOS. Quem redireciona é o Next.
                await signOut({ redirect: false });
                redirect("/login");
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
