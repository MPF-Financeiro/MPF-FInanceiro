/**
 * Dados de exemplo iguais aos das telas que a cliente aprovou, para que a
 * aplicação rodando mostre exatamente o que ela viu no catálogo.
 *
 * Alunos, colaboradores e valores são FICTÍCIOS. Nenhum dado real de pessoa
 * entra aqui: quando o sistema for usado de verdade, isto não roda em produção.
 */
import { Categoria, Direcao, FormaPagamento, MeioVenda, Origem, PapelUsuario, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcularCascata, dividirRepasses, reais } from "../lib/money";

const db = new PrismaClient();

const NOTA_BPS = 1000; // 10% da NF
const PIX_BPS = 100; // PROVISÓRIO
const CARTAO_BPS = 450; // PROVISÓRIO

const d = (ano: number, mes: number, dia: number) => new Date(Date.UTC(ano, mes - 1, dia));
const hoje = new Date();
const ANO = hoje.getUTCFullYear();
const MES = hoje.getUTCMonth() + 1;
const competencia = d(ANO, MES, 1);

async function main() {
  await db.$transaction([
    db.repasse.deleteMany(),
    db.vendaSite.deleteMany(),
    db.baixa.deleteMany(),
    db.titulo.deleteMany(),
    db.cupom.deleteMany(),
    db.curso.deleteMany(),
    db.contrato.deleteMany(),
    db.cliente.deleteMany(),
    db.fornecedor.deleteMany(),
    db.contaBancaria.deleteMany(),
    db.empresa.deleteMany(),
    db.configTaxa.deleteMany(),
    db.usuario.deleteMany(),
  ]);

  const senhaHash = await bcrypt.hash("financeiro123", 10);
  await db.usuario.createMany({
    data: [
      { email: "admin@sampsdigital.com", nome: "Sócio", senhaHash, papel: PapelUsuario.ADMIN },
      { email: "financeiro@sampsdigital.com", nome: "Financeiro", senhaHash, papel: PapelUsuario.FINANCEIRO },
    ],
  });

  const empresa = await db.empresa.create({
    data: { nome: "Samps Digital", cnpj: "00.000.000/0001-00" },
  });
  const conta = await db.contaBancaria.create({
    data: { empresaId: empresa.id, banco: "Banco exemplo", apelido: "Conta principal" },
  });

  await db.configTaxa.create({
    data: {
      vigenteDe: d(ANO - 1, 1, 1),
      notaBps: NOTA_BPS,
      pixBps: PIX_BPS,
      cartaoBps: CARTAO_BPS,
      observacao: "PROVISÓRIO: confirmar as taxas reais do Paga-me com a cliente.",
    },
  });

  // ── Contas a receber ────────────────────────────────────────────────
  const clientes = await Promise.all(
    [
      { nome: "Clínica Oceano", documento: "11.111.111/0001-11" },
      { nome: "Giovanni Pacelli", documento: "222.222.222-22" },
      { nome: "Mercado Bom Preço", documento: "33.333.333/0001-33" },
    ].map((c) => db.cliente.create({ data: { ...c, empresaId: empresa.id } }))
  );

  const recebiveis = [
    { cliente: clientes[0], descricao: "Social media, mensalidade", valor: reais(3200), vence: d(ANO, MES, 5), baixa: reais(3200), forma: FormaPagamento.PIX },
    { cliente: clientes[1], descricao: "Tráfego pago, mensalidade", valor: reais(2800), vence: d(ANO, MES, 10), baixa: reais(1400), forma: FormaPagamento.TRANSFERENCIA },
    { cliente: clientes[2], descricao: "Identidade visual, parcela 2 de 3", valor: reais(2500), vence: d(ANO, MES, 15), baixa: 0, forma: FormaPagamento.BOLETO },
    { cliente: clientes[0], descricao: "Vídeo institucional", valor: reais(4800), vence: d(ANO, MES > 1 ? MES - 1 : 12, 20), baixa: 0, forma: FormaPagamento.PIX },
  ];

  for (const r of recebiveis) {
    const titulo = await db.titulo.create({
      data: {
        empresaId: empresa.id,
        direcao: Direcao.RECEBER,
        categoria: Categoria.SERVICOS_PRESTADOS,
        descricao: r.descricao,
        valor: r.valor,
        competencia,
        vencimento: r.vence,
        forma: r.forma,
        clienteId: r.cliente.id,
        origem: Origem.MANUAL,
      },
    });
    if (r.baixa > 0) {
      await db.baixa.create({
        data: { tituloId: titulo.id, valor: r.baixa, data: r.vence, forma: r.forma, contaId: conta.id },
      });
    }
  }

  // ── Contas a pagar ──────────────────────────────────────────────────
  const fornecedores = await Promise.all(
    [
      { nome: "Imobiliária Centro", categoria: Categoria.ALUGUEL },
      { nome: "Adobe", categoria: Categoria.SERVICOS_ASSINATURAS },
      { nome: "Receita Federal", categoria: Categoria.IMPOSTOS_ENCARGOS },
      { nome: "Folha de novembro", categoria: Categoria.SALARIOS },
      { nome: "Giovanni Pacelli", categoria: Categoria.VALORES_A_ACERTAR },
    ].map((f) => db.fornecedor.create({ data: f }))
  );

  const pagaveis = [
    { f: fornecedores[0], descricao: "Aluguel da sala", valor: reais(2400), vence: d(ANO, MES, 5), pago: true },
    { f: fornecedores[1], descricao: "Creative Cloud, 3 licenças", valor: reais(389.7), vence: d(ANO, MES, 8), pago: true },
    { f: fornecedores[2], descricao: "DAS do MEI e encargos", valor: reais(1870.4), vence: d(ANO, MES, 20), pago: false },
    { f: fornecedores[3], descricao: "Folha líquida, 8 colaboradores", valor: reais(21480), vence: d(ANO, MES, 5), pago: true, origem: Origem.FOLHA, origemId: `folha-${ANO}-${MES}` },
    { f: fornecedores[4], descricao: "Empréstimo a acertar, reembolso", valor: reais(1500), vence: d(ANO, MES, 25), pago: false, origem: Origem.ACERTO, origemId: "acerto-001" },
  ];

  for (const p of pagaveis) {
    const titulo = await db.titulo.create({
      data: {
        empresaId: empresa.id,
        direcao: Direcao.PAGAR,
        categoria: p.f.categoria,
        descricao: p.descricao,
        valor: p.valor,
        competencia,
        vencimento: p.vence,
        forma: FormaPagamento.PIX,
        fornecedorId: p.f.id,
        origem: p.origem ?? Origem.MANUAL,
        origemId: p.origemId ?? null,
      },
    });
    if (p.pago) {
      await db.baixa.create({
        data: { tituloId: titulo.id, valor: p.valor, data: p.vence, forma: FormaPagamento.PIX, contaId: conta.id },
      });
    }
  }

  // ── Vendas do site do Giovanni ──────────────────────────────────────
  const oratoria = await db.curso.create({ data: { nome: "Curso de Oratória", preco: reais(697) } });
  const mentoria = await db.curso.create({ data: { nome: "Mentoria Alta Performance", preco: reais(1997) } });
  const assinatura = await db.curso.create({ data: { nome: "Assinatura mensal", preco: reais(97) } });

  const lanc100 = await db.cupom.create({
    data: { cursoId: oratoria.id, codigo: "LANC100", valorFixo: reais(100), validoAte: d(ANO, MES, 15) },
  });

  const vendas = [
    { dia: 3, aluno: "Ana P.", curso: oratoria, cupom: lanc100, meio: MeioVenda.PIX, parcelas: 1 },
    { dia: 9, aluno: "Marcos T.", curso: oratoria, cupom: null, meio: MeioVenda.PIX, parcelas: 1 },
    { dia: 5, aluno: "Carlos M.", curso: mentoria, cupom: null, meio: MeioVenda.CARTAO, parcelas: 3 },
    { dia: 7, aluno: "Júlia R.", curso: assinatura, cupom: null, meio: MeioVenda.CARTAO, parcelas: 1 },
  ];

  for (const v of vendas) {
    const desconto = v.cupom?.valorFixo ?? 0;
    const conta_ = calcularCascata({
      bruto: v.curso.preco,
      cupom: desconto,
      notaBps: NOTA_BPS,
      gatewayBps: v.meio === MeioVenda.PIX ? PIX_BPS : CARTAO_BPS,
    });
    const data = d(ANO, MES, v.dia);

    const titulo = await db.titulo.create({
      data: {
        empresaId: empresa.id,
        direcao: Direcao.RECEBER,
        categoria: Categoria.VENDAS_SITE,
        descricao: `${v.curso.nome} — ${v.aluno}`,
        valor: conta_.liquido,
        competencia,
        vencimento: data,
        forma: v.meio === MeioVenda.PIX ? FormaPagamento.PIX : FormaPagamento.CARTAO,
        clienteId: clientes[1].id,
        origem: Origem.VENDA_SITE,
        origemId: `${v.curso.id}-${v.aluno}-${v.dia}`,
      },
    });

    const venda = await db.vendaSite.create({
      data: {
        data,
        aluno: v.aluno,
        cursoId: v.curso.id,
        meio: v.meio,
        bruto: v.curso.preco,
        cupomId: v.cupom?.id ?? null,
        descontoCupom: desconto,
        nota: conta_.nota,
        taxa: conta_.gateway,
        liquido: conta_.liquido,
        parcelas: v.parcelas,
        tituloId: titulo.id,
      },
    });

    if (v.meio === MeioVenda.PIX) {
      await db.baixa.create({
        data: { tituloId: titulo.id, valor: conta_.liquido, data, forma: FormaPagamento.PIX, contaId: conta.id },
      });
    } else {
      const partes = dividirRepasses(conta_.liquido, v.parcelas);
      for (let i = 0; i < partes.length; i += 1) {
        const valor = partes[i];
        const previsao = d(ANO, MES + i, v.dia);
        const caiu = i === 0;
        await db.repasse.create({
          data: { vendaId: venda.id, numero: i + 1, valor, previsao, efetivo: caiu ? previsao : null },
        });
        if (caiu) {
          await db.baixa.create({
            data: { tituloId: titulo.id, valor, data: previsao, forma: FormaPagamento.CARTAO, contaId: conta.id },
          });
        }
      }
    }
  }

  console.log("Seed pronto. Entre com admin@sampsdigital.com / financeiro123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
