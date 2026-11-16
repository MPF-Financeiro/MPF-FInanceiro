import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeAdministrar, podeLancar, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, paraInputDate } from "@/lib/mes";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Cupons, Cursos, Taxas } from "@/components/financeiro/cursos-ui";

export const dynamic = "force-dynamic";

export default async function CursosPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel) && !podeAdministrar(sessao.papel)) redirect("/");

  const [cursos, cupons, vigencias] = await Promise.all([
    db.curso.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      include: { _count: { select: { vendas: true } } },
    }),
    db.cupom.findMany({ orderBy: { codigo: "asc" }, include: { curso: true } }),
    db.configTaxa.findMany({ orderBy: { vigenteDe: "desc" } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Cursos e taxas"
        descricao="O cadastro que alimenta as vendas do site: cursos com preço de tabela, cupons e as vigências de nota fiscal e taxa."
      />
      <div className="space-y-6">
        <Cursos
          cursos={cursos.map((c) => ({
            id: c.id,
            nome: c.nome,
            preco: c.preco,
            ativo: c.ativo,
            vendas: c._count.vendas,
          }))}
        />
        <Cupons
          cupons={cupons.map((c) => ({
            id: c.id,
            codigo: c.codigo,
            curso: c.curso?.nome ?? null,
            percentBps: c.percentBps,
            valorFixo: c.valorFixo,
            validoAte: c.validoAte,
          }))}
          cursos={cursos.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: c.nome }))}
        />
        <Taxas
          vigencias={vigencias}
          hoje={paraInputDate(hojeUTC())}
          podeAdministrar={podeAdministrar(sessao.papel)}
        />
      </div>
    </>
  );
}
