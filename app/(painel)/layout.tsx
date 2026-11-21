import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { FinanceiroLogo } from "@/components/brand/financeiro-logo";
import { MenuCelular, MenuLateral, type GrupoMenu } from "@/components/financeiro/menu";
import { podeLancar, podeRH, sessaoAtual } from "@/lib/permissoes";
import { ROTULO_PAPEL } from "@/lib/permissoes";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  const quem = await sessaoAtual();
  const lanca = Boolean(quem && podeLancar(quem.papel));

  // O menu mostra só o que o papel pode abrir: menos chance de clicar e
  // tomar um "sem permissão" na cara.
  const grupos: GrupoMenu[] = [
    { titulo: "Visão", itens: [{ href: "/", rotulo: "Visão executiva" }] },
    {
      titulo: "Movimento",
      itens: [
        { href: "/receber", rotulo: "A receber" },
        { href: "/pagar", rotulo: "A pagar" },
        ...(lanca ? [{ href: "/banco", rotulo: "Banco e conciliação" }] : []),
      ],
    },
    {
      titulo: "Site do Giovanni",
      itens: [
        { href: "/vendas", rotulo: "Vendas do site" },
        { href: "/vouchers", rotulo: "Vouchers" },
      ],
    },
    ...(quem && podeRH(quem.papel)
      ? [{ titulo: "Pessoas", itens: [{ href: "/rh", rotulo: "RH e folha" }] }]
      : []),
    {
      titulo: "Arquivo",
      itens: [
        ...(lanca ? [{ href: "/cadastros", rotulo: "Cadastros" }] : []),
        { href: "/busca", rotulo: "Busca" },
      ],
    },
  ];

  const sair = async () => {
    "use server";
    // redirect do next-auth não conhece o basePath: quem redireciona é o Next.
    await signOut({ redirect: false });
    redirect("/login");
  };

  const quemTexto = `${sessao.user.name ?? ""}${quem ? ` · ${ROTULO_PAPEL[quem.papel]}` : ""}`;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <div className="hidden border-e border-border bg-[hsl(var(--paper-deep))] lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col">
        <div className="border-b border-border px-6 py-5">
          <FinanceiroLogo />
        </div>
        <MenuLateral grupos={grupos} />
        <div className="border-t border-border px-6 py-4">
          <p className="truncate text-[13px] font-medium">{sessao.user.name}</p>
          <p className="text-xs text-muted-foreground">{quem ? ROTULO_PAPEL[quem.papel] : ""}</p>
          <form action={sair} className="mt-3">
            <button
              type="submit"
              className="text-[13px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
      </div>

      <header className="sticky top-0 z-30 flex h-[57px] items-center justify-between gap-3 border-b border-border bg-[hsl(var(--paper-deep))] px-4 lg:hidden">
        <FinanceiroLogo />
        <div className="flex items-center gap-2">
          <MenuCelular grupos={grupos} />
          <form action={sair}>
            <button
              type="submit"
              aria-label={`Sair (${quemTexto})`}
              className="h-9 rounded-[4px] px-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1240px]">{children}</div>
      </main>
    </div>
  );
}
