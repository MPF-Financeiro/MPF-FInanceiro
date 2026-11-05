# Samps Financeiro

Financeiro e RH da Samps Digital. É um app **separado** do SampsOS: repositório
de build, banco e deploy próprios. O SampsOS só encaminha `/financeiro` para
cá por multi-zones — se este app cair, cai só `/financeiro`, e o sistema da
agência continua de pé. Essa era a condição número um do pedido.

## O que já está de pé

- Modelo de dados completo do que a cliente pediu, Financeiro e RH.
- Login espelhado (marca à esquerda, formulário à direita) e o botão de troca
  na tela do SampsOS.
- Telas ligadas ao banco: painel, contas a receber, contas a pagar e vendas do
  site do Giovanni Pacelli, com a conta do líquido aberta linha a linha.
- `lib/money.ts` com a conta do líquido e os testes dela.

As outras telas do catálogo (vouchers, folha, benefícios, pró-labore, valores a
acertar, conciliação e todo o RH) têm tabela no banco e ainda não têm interface.

## Rodar aqui

```bash
cp .env.example .env     # preencha DATABASE_URL e AUTH_SECRET
npm install
npm run db:push
npm run db:seed          # dados FICTÍCIOS, iguais aos das telas aprovadas
npm run dev              # http://localhost:3001/financeiro
npm test
```

O seed cria `admin@sampsdigital.com` com a senha `financeiro123`. É dado de
desenvolvimento: **não rode o seed em produção.**

## Publicar

1. Crie um **banco próprio** no Neon. Nunca o mesmo do SampsOS: é o banco
   separado que garante que uma migration daqui não alcance a agência.
2. Crie um **projeto próprio** na Vercel apontando para este repositório. Se a
   pasta `financeiro/` ainda estiver dentro do repositório do SampsOS, use
   **Root Directory = `financeiro`** nas configurações do projeto.
3. Variáveis do projeto do Financeiro: `DATABASE_URL`, `DIRECT_URL`,
   `AUTH_SECRET`, `AUTH_TRUST_HOST=true`.
4. No projeto do **SampsOS**, defina `FINANCEIRO_URL` com a URL do deploy
   acima (ex.: `https://samps-financeiro.vercel.app`). Sem essa variável o
   SampsOS não encaminha nada e segue exatamente como hoje — ou seja, o
   rewrite é opcional e reversível apagando uma variável.
5. `npm run db:push` (ou `prisma migrate deploy`) contra o banco novo.

## Decisões que valem para qualquer tela nova

- **Dinheiro é `Int` em centavos.** Nunca float.
- **Título + baixa.** O título é o que se espera; a baixa é o que andou.
  Status nunca é coluna editável: sai do valor, das baixas e da data.
- **Nada é apagado.** Cancelar preenche `canceladoEm` e o motivo; baixa errada
  é estornada por outra baixa, negativa e com motivo.
- **Duas datas em tudo:** `competencia` (a que mês pertence) e a data da baixa
  (quando bateu na conta).
- **Uma dona por fato.** `@@unique([origem, origemId])` impede o lançamento
  duplicado na raiz: reenviar a folha atualiza o mesmo título.
- **Cascata sempre, carimbo só no que fechou.** Toda conta de dinheiro pode ser
  aberta linha a linha; o carimbo fica para mês fechado, folha enviada e
  rescisão homologada. Status do dia a dia é o chip da Samps.

## O que ainda depende da cliente

- A logo e as cores do Financeiro. Hoje a marca é provisória e a cor de ação é
  a tinta `#1E3A6E`.
- Se "Paga-me" é o Pagar.me e quais são as taxas reais. As do seed (1% no PIX,
  4,5% no cartão) são **exemplo**, e ficam em `ConfigTaxa` com data de início,
  para que trocar a taxa não mude venda antiga.
- Cadastro de curso com preço e cupom, ou valor pago digitado em cada venda.
  As telas mostram a primeira; dá para começar pela segunda sem refazer nada.
- Quantos CNPJs e quais bancos; se o contador fecha a folha e em que formato;
  VA e VT por operadora ou em dinheiro; quem acessa o quê.

## Dados pessoais

Nada de dado real de pessoa neste repositório. CPF, salário, contracheque e
laudo de exame vivem só no banco de produção. Exame ocupacional é dado de
saúde: o painel mostra aptidão e validade, e abrir o laudo deixa registro em
`AcessoDocumento`.
