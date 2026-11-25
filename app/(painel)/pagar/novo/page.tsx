import { redirect } from "next/navigation";
import { Direcao } from "@prisma/client";
import { opcoesDeLancamento } from "@/lib/consultas";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { paraInputDate, paraInputMonth, hojeUTC } from "@/lib/mes";
import { CATEGORIAS_PAGAR } from "@/lib/rotulos";
import { Cabecalho } from "@/components/financeiro/pagina";
import { FormTitulo } from "@/components/financeiro/form-titulo";

export const dynamic = "force-dynamic";

export default async function NovoPagarPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel)) redirect("/pagar");

  const opcoes = await opcoesDeLancamento();
  const hoje = hojeUTC();

  return (
    <>
      <Cabecalho
        titulo="Lançar conta a pagar"
        descricao="O título é o que se espera pagar. O status aparece sozinho depois, conforme os pagamentos forem registrados."
      />
      <FormTitulo
        direcao={Direcao.PAGAR}
        categorias={CATEGORIAS_PAGAR}
        empresas={opcoes.empresas}
        clientes={opcoes.clientes}
        fornecedores={opcoes.fornecedores}
        contratos={opcoes.contratos}
        colaboradores={opcoes.colaboradores}
        unidades={opcoes.unidades}
        hoje={paraInputDate(hoje)}
        competencia={paraInputMonth(hoje)}
      />
    </>
  );
}
