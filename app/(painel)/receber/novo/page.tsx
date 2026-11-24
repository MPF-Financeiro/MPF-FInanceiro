import { redirect } from "next/navigation";
import { Direcao } from "@prisma/client";
import { opcoesDeLancamento } from "@/lib/consultas";
import { podeLancar, sessaoAtual } from "@/lib/permissoes";
import { paraInputDate, paraInputMonth, hojeUTC } from "@/lib/mes";
import { CATEGORIAS_RECEBER } from "@/lib/rotulos";
import { Cabecalho } from "@/components/financeiro/pagina";
import { FormTitulo } from "@/components/financeiro/form-titulo";

export const dynamic = "force-dynamic";

export default async function NovoReceberPage() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeLancar(sessao.papel)) redirect("/receber");

  const opcoes = await opcoesDeLancamento();
  const hoje = hojeUTC();

  return (
    <>
      <Cabecalho
        titulo="Lançar conta a receber"
        descricao="O título é o que se espera receber. O status aparece sozinho depois, conforme as baixas forem registradas."
      />
      <FormTitulo
        direcao={Direcao.RECEBER}
        categorias={CATEGORIAS_RECEBER}
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
