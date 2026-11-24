import { redirect } from "next/navigation";
import { podeVerRelatorios, sessaoAtual } from "@/lib/permissoes";

export default async function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeVerRelatorios(sessao.papel)) redirect("/");
  return <>{children}</>;
}
