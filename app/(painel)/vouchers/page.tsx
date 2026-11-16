import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { hojeUTC, paraInputDate } from "@/lib/mes";
import { Cabecalho } from "@/components/financeiro/pagina";
import { Vouchers } from "@/components/financeiro/vouchers-ui";

export const dynamic = "force-dynamic";

export default async function VouchersPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const [vouchers, clientes, empresas] = await Promise.all([
    db.voucher.findMany({
      orderBy: [{ emissao: "desc" }],
      include: { cliente: true, titulo: { include: { baixas: true } } },
    }),
    db.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    db.empresa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Vouchers"
        descricao="Voucher utilizado não é dinheiro recebido: utilização e repasse são datas separadas, e o caixa só muda na baixa."
      />
      <Vouchers
        vouchers={vouchers.map((v) => ({
          id: v.id,
          emissor: v.emissor,
          codigo: v.codigo,
          cliente: v.cliente?.nome ?? null,
          valor: v.valor,
          emissao: v.emissao,
          utilizacao: v.utilizacao,
          repassePrevisto: v.repassePrevisto,
          // Recebido é fato, não coluna: sai das baixas do título do voucher.
          recebido: (v.titulo?.baixas.reduce((a, b) => a + b.valor, 0) ?? 0) >= v.valor,
          cancelado: v.status === "CANCELADO",
          tituloId: v.tituloId,
        }))}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
        empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
        hoje={paraInputDate(hojeUTC())}
        podeEscrever={podeLancar(sessao.papel)}
      />
    </>
  );
}
