import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, paraInputDate } from "@/lib/mes";
import { taxaVigente } from "@/lib/taxas";
import { Cabecalho } from "@/components/financeiro/pagina";
import { FormVenda } from "@/components/financeiro/form-venda";

export const dynamic = "force-dynamic";

export default async function NovaVendaPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel)) redirect("/vendas");

  const hoje = hojeUTC();
  const [empresas, cursos, cupons, taxa] = await Promise.all([
    db.empresa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    db.curso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.cupom.findMany({
      where: { OR: [{ validoAte: null }, { validoAte: { gte: hoje } }] },
      orderBy: { codigo: "asc" },
    }),
    taxaVigente(hoje),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Lançar venda do site"
        descricao="A conta aparece ao lado enquanto você preenche: tabela, cupom, 10% da nota e taxa do Paga-me, até o líquido."
      />
      <FormVenda
        empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
        cursos={cursos.map((c) => ({ id: c.id, nome: c.nome, preco: c.preco }))}
        cupons={cupons.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          cursoId: c.cursoId,
          percentBps: c.percentBps,
          valorFixo: c.valorFixo,
        }))}
        taxa={taxa}
        hoje={paraInputDate(hoje)}
      />
    </>
  );
}
