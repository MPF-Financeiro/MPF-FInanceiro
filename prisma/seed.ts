/**
 * Dados de exemplo iguais aos das telas que a cliente aprovou, para que a
 * aplicação rodando mostre exatamente o que ela viu no catálogo.
 *
 * Alunos, colaboradores e valores são FICTÍCIOS. Nenhum dado real de pessoa
 * entra aqui: quando o sistema for usado de verdade, isto não roda em produção.
 */
import {
  Categoria,
  Direcao,
  FormaPagamento,
  MeioVenda,
  Origem,
  PapelUsuario,
  PrismaClient,
  StatusColaborador,
  StatusFerias,
  TipoBeneficio,
  TipoExame,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcularCascata, dividirRepasses, reais } from "../lib/money";
import { calcularItemFolha } from "../lib/folha";

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
    db.movimentoExtrato.deleteMany(),
    db.fechamentoMensal.deleteMany(),
    db.acessoDocumento.deleteMany(),
    db.documentoRH.deleteMany(),
    db.contracheque.deleteMany(),
    db.exameOcupacional.deleteMany(),
    db.ferias.deleteMany(),
    db.rescisao.deleteMany(),
    db.itemFolha.deleteMany(),
    db.folha.deleteMany(),
    db.bonificacao.deleteMany(),
    db.beneficioMensal.deleteMany(),
    db.voucher.deleteMany(),
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
    db.colaborador.deleteMany(),
    db.usuario.deleteMany(),
  ]);

  const senhaHash = await bcrypt.hash("financeiro123", 10);
  await db.usuario.createMany({
    data: [
      { email: "admin@sampsdigital.com", nome: "Sócio", senhaHash, papel: PapelUsuario.ADMIN },
      { email: "financeiro@sampsdigital.com", nome: "Financeiro", senhaHash, papel: PapelUsuario.FINANCEIRO },
      { email: "rh@sampsdigital.com", nome: "RH", senhaHash, papel: PapelUsuario.RH },
      { email: "leitura@sampsdigital.com", nome: "Leitura", senhaHash, papel: PapelUsuario.LEITURA },
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

  // ── Histórico: os cinco meses anteriores, já pagos e recebidos ─────
  // Sem histórico, o fluxo de caixa e as comparações mês a mês da Visão
  // executiva não têm o que mostrar. Valores inventados, mas coerentes:
  // a agência fatura entre 30 e 40 mil e gasta quase tudo com a equipe.
  const maisClientes = await Promise.all(
    [
      { nome: "Construtora Aurora", documento: "44.444.444/0001-44" },
      { nome: "Escola Pequeno Saber", documento: "55.555.555/0001-55" },
    ].map((c) => db.cliente.create({ data: { ...c, empresaId: empresa.id } }))
  );
  const freelas = await db.fornecedor.create({
    data: { nome: "Estúdio de edição (freela)", categoria: Categoria.FORNECEDORES },
  });

  // Mês corrente: as duas contas novas.
  {
    const aurora = await db.titulo.create({
      data: {
        empresaId: empresa.id, direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS,
        descricao: "Gestão de marca, mensalidade", valor: reais(9800), competencia,
        vencimento: d(ANO, MES, 10), forma: FormaPagamento.PIX, clienteId: maisClientes[0].id,
      },
    });
    await db.baixa.create({
      data: { tituloId: aurora.id, valor: reais(9800), data: d(ANO, MES, 10), forma: FormaPagamento.PIX, contaId: conta.id },
    });
    await db.titulo.create({
      data: {
        empresaId: empresa.id, direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS,
        descricao: "Campanha de matrículas 2027", valor: reais(6500), competencia,
        vencimento: d(ANO, MES, 28), forma: FormaPagamento.BOLETO, clienteId: maisClientes[1].id,
      },
    });
  }

  const variacao = [0.92, 1.04, 0.97, 1.08, 1.0];
  for (let k = 5; k >= 1; k--) {
    const base = new Date(Date.UTC(ANO, MES - 1 - k, 1));
    const a = base.getUTCFullYear();
    const m = base.getUTCMonth() + 1;
    const f = variacao[5 - k];
    const entradas = [
      { c: clientes[0], descricao: "Social media, mensalidade", valor: reais(3200), dia: 5 },
      { c: clientes[1], descricao: "Tráfego pago, mensalidade", valor: reais(2800), dia: 10 },
      { c: clientes[2], descricao: "Identidade visual, parcela", valor: reais(2500), dia: 15 },
      { c: maisClientes[0], descricao: "Gestão de marca, mensalidade", valor: reais(9800), dia: 10 },
      { c: maisClientes[1], descricao: "Conteúdo e campanhas", valor: Math.round(reais(6500) * f), dia: 12 },
      { c: clientes[0], descricao: "Produção de vídeo", valor: Math.round(reais(11000) * f * f), dia: 22 },
    ];
    const saidas = [
      { forn: fornecedores[0], cat: Categoria.ALUGUEL, descricao: "Aluguel da sala", valor: reais(2400), dia: 5 },
      { forn: fornecedores[1], cat: Categoria.SERVICOS_ASSINATURAS, descricao: "Creative Cloud, 3 licenças", valor: reais(389.7), dia: 8 },
      { forn: fornecedores[2], cat: Categoria.IMPOSTOS_ENCARGOS, descricao: "DAS e encargos", valor: Math.round(reais(1870.4) * f), dia: 20 },
      { forn: fornecedores[3], cat: Categoria.SALARIOS, descricao: "Folha líquida, 8 colaboradores", valor: reais(21480), dia: 5, origem: Origem.FOLHA, origemId: `folha-${a}-${m}` },
      { forn: freelas, cat: Categoria.FORNECEDORES, descricao: "Edição de vídeo, freela", valor: Math.round(reais(2600) * f * f), dia: 18 },
      { forn: null, cat: Categoria.PRO_LABORE, descricao: "Pró-labore do sócio", valor: reais(4000), dia: 6 },
    ];
    for (const e of entradas) {
      const t = await db.titulo.create({
        data: {
          empresaId: empresa.id, direcao: Direcao.RECEBER, categoria: Categoria.SERVICOS_PRESTADOS,
          descricao: e.descricao, valor: e.valor, competencia: base, vencimento: d(a, m, e.dia),
          forma: FormaPagamento.PIX, clienteId: e.c.id,
        },
      });
      await db.baixa.create({
        data: { tituloId: t.id, valor: e.valor, data: d(a, m, e.dia), forma: FormaPagamento.PIX, contaId: conta.id },
      });
    }
    for (const s_ of saidas) {
      const t = await db.titulo.create({
        data: {
          empresaId: empresa.id, direcao: Direcao.PAGAR, categoria: s_.cat,
          descricao: s_.descricao, valor: s_.valor, competencia: base, vencimento: d(a, m, s_.dia),
          forma: FormaPagamento.PIX, fornecedorId: s_.forn?.id ?? null,
          origem: s_.origem ?? Origem.MANUAL, origemId: s_.origemId ?? null,
        },
      });
      await db.baixa.create({
        data: { tituloId: t.id, valor: s_.valor, data: d(a, m, s_.dia), forma: FormaPagamento.PIX, contaId: conta.id },
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

  // ─────────────────────────────────────────────────── RH de exemplo
  //
  // Pessoas e valores fictícios. Serve para as telas de RH mostrarem como
  // ficam cheias; não roda em produção.
  const equipe = [
    { nome: "Equipe Exemplo 1", cargo: "Social media", setor: "Criação", salario: reais(2400) },
    { nome: "Equipe Exemplo 2", cargo: "Designer", setor: "Criação", salario: reais(3100) },
    { nome: "Equipe Exemplo 3", cargo: "Gestor de tráfego", setor: "Mídia", salario: reais(3800) },
  ];
  const colaboradores = [];
  for (const [i, pessoa] of equipe.entries()) {
    colaboradores.push(
      await db.colaborador.create({
        data: {
          ...pessoa,
          admissao: d(ANO - 2 + i, 3, 10),
          status: StatusColaborador.ATIVO,
          email: `exemplo${i + 1}@sampsdigital.com`,
        },
      })
    );
  }

  for (const colaborador of colaboradores) {
    await db.beneficioMensal.createMany({
      data: [
        {
          colaboradorId: colaborador.id,
          tipo: TipoBeneficio.VALE_ALIMENTACAO,
          competencia,
          previsto: reais(600),
        },
        {
          colaboradorId: colaborador.id,
          tipo: TipoBeneficio.VALE_TRANSPORTE,
          competencia,
          previsto: reais(220),
        },
      ],
    });
  }

  await db.bonificacao.create({
    data: {
      colaboradorId: colaboradores[0].id,
      referencia: "Clínica Oceano",
      valorConta: reais(3200),
      valor: reais(320),
      competencia,
      naFolha: true,
    },
  });

  const folha = await db.folha.create({ data: { competencia } });
  for (const colaborador of colaboradores) {
    const bonus = colaborador.id === colaboradores[0].id ? reais(320) : 0;
    const inss = Math.round(colaborador.salario * 0.09);
    const conta = calcularItemFolha({
      salarioBruto: colaborador.salario,
      bonificacoes: bonus,
      inss,
    });
    await db.itemFolha.create({
      data: {
        folhaId: folha.id,
        colaboradorId: colaborador.id,
        salarioBruto: colaborador.salario,
        bonificacoes: bonus,
        inss,
        valeAlimentacao: reais(600),
        valeTransporte: reais(220),
        liquido: conta.liquido,
      },
    });
  }

  await db.ferias.create({
    data: {
      colaboradorId: colaboradores[1].id,
      periodoAquisitivoInicio: d(ANO - 1, 3, 10),
      periodoAquisitivoFim: d(ANO, 3, 9),
      inicio: d(ANO, MES + 1, 5),
      fim: d(ANO, MES + 1, 24),
      diasVendidos: 10,
      abonoPecuniario: true,
      status: StatusFerias.PROGRAMADA,
    },
  });

  await db.exameOcupacional.createMany({
    data: colaboradores.map((c, i) => ({
      colaboradorId: c.id,
      tipo: i === 0 ? TipoExame.PERIODICO : TipoExame.ADMISSIONAL,
      realizado: d(ANO - 1, 11, 10 + i),
      proximo: d(ANO, MES, 25),
      clinica: "Clínica exemplo",
      apto: true,
      laudo: "laudo-exemplo.pdf",
      custo: reais(120),
    })),
  });

  await db.documentoRH.create({
    data: {
      colaboradorId: colaboradores[0].id,
      tipo: "Contrato de trabalho",
      arquivo: "contrato-exemplo.pdf",
      emitidoEm: d(ANO - 2, 3, 10),
      restrito: true,
    },
  });

  await db.contracheque.create({
    data: {
      colaboradorId: colaboradores[0].id,
      competencia,
      arquivo: "contracheque-exemplo.pdf",
      disponibilizadoEm: hoje,
    },
  });

  // Voucher e extrato, para as telas de voucher e de conciliação não nascerem vazias.
  await db.voucher.create({
    data: {
      emissor: "Sebrae exemplo",
      codigo: "VCH-0001",
      valor: reais(1500),
      emissao: d(ANO, MES, 3),
      repassePrevisto: d(ANO, MES + 1, 10),
      clienteId: null,
    },
  });

  await db.movimentoExtrato.createMany({
    data: [
      {
        contaId: conta.id,
        data: d(ANO, MES, 5),
        descricao: "PIX RECEBIDO CLINICA OCEANO",
        valor: reais(3200),
        fitid: "EX-0001",
      },
      {
        contaId: conta.id,
        data: d(ANO, MES, 7),
        descricao: "ALUGUEL SALA",
        valor: -reais(2000),
        fitid: "EX-0002",
      },
      {
        contaId: conta.id,
        data: d(ANO, MES, 9),
        descricao: "TARIFA PACOTE SERVICOS",
        valor: -reais(79),
        fitid: "EX-0003",
      },
    ],
  });

  console.log("Seed pronto. Entre com admin@sampsdigital.com / financeiro123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
