import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { FinanceiroLogo } from "@/components/brand/financeiro-logo";
import { AtalhoBusca, MenuCelular, MenuLateral, type GrupoMenu } from "@/components/financeiro/menu";
import { podeLancar, podeRH, podeVerRelatorios, sessaoAtual } from "@/lib/permissoes";
import { ROTULO_PAPEL } from "@/lib/permissoes";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");
  const quem = await sessaoAtual();
  const lanca = Boolean(quem && podeLancar(quem.papel));

  // O menu mostra só o que o papel pode abrir: menos chance de clicar e
  // tomar um "sem permissão" na cara.
  const relatorios = quem && podeVerRelatorios(quem.papel);
  const grupos: GrupoMenu[] = [
    {
      itens: [
        { href: "/", rotulo: "Visão executiva", icone: "painel" },
        { href: "/receber", rotulo: "A receber", icone: "receber" },
        { href: "/pagar", rotulo: "A pagar", icone: "pagar" },
        ...(lanca ? [{ href: "/banco", rotulo: "Banco e conciliação", icone: "banco" as const }] : []),
        ...(relatorios
          ? [
              {
                href: "/relatorios",
                rotulo: "Relatórios",
                icone: "relatorios" as const,
                filhos: [
                  { href: "/relatorios/fluxo-de-caixa", rotulo: "Fluxo de caixa" },
                  { href: "/relatorios/gastos-fixos", rotulo: "Gastos fixos" },
                  { href: "/relatorios/margem", rotulo: "Margem por BU" },
                  { href: "/relatorios/resumo", rotulo: "Resumo da operação" },
                  { href: "/relatorios/resultado", rotulo: "Resultado operacional" },
                  { href: "/relatorios/demonstracoes", rotulo: "Demonstrações" },
                ],
              },
            ]
          : []),
      ],
    },
    {
      titulo: "Site do Giovanni",
      itens: [
        { href: "/vendas", rotulo: "Vendas do site", icone: "vendas" },
        { href: "/vouchers", rotulo: "Vouchers", icone: "vouchers" },
      ],
    },
    ...(quem && podeRH(quem.papel)
      ? [{ titulo: "Equipe", itens: [{ href: "/rh", rotulo: "RH e folha", icone: "pessoas" as const }] }]
      : []),
    ...(lanca ? [{ titulo: "Configuração", itens: [{ href: "/cadastros", rotulo: "Cadastros", icone: "cadastros" as const }] }] : []),
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
        <div className="space-y-4 px-5 pb-2 pt-5">
          <FinanceiroLogo />
          <AtalhoBusca />
        </div>
        <MenuLateral grupos={grupos} />
        <div className="flex items-center gap-3 border-t border-border px-5 py-3.5">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-[12px] font-semibold text-brand"
          >
            {(sessao.user.name ?? "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">{sessao.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{quem ? ROTULO_PAPEL[quem.papel] : ""}</p>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="rounded-[4px] px-2 py-1 text-[13px] text-muted-foreground hover:bg-card/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
