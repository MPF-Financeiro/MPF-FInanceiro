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

1. Crie um **projeto próprio no Supabase**, só para o Financeiro. Nunca o
   mesmo banco do SampsOS: é o banco separado que garante que uma migration
   daqui não alcance a agência. Escolha a região mais perto (`sa-east-1`).
2. Em **Project Settings → Database → Connection string**, copie as duas
   URLs. Elas são diferentes de propósito, e trocá-las uma pela outra é o
   erro mais comum aqui:
   - `DATABASE_URL` é o **transaction pooler, porta 6543**, com
     `?pgbouncer=true&connection_limit=1`. É a que a aplicação usa, porque na
     Vercel cada requisição é um processo novo. Sem o `pgbouncer=true` o
     Prisma tenta criar prepared statements, que esse modo não aceita.
   - `DIRECT_URL` é o **session pooler, porta 5432**. Só o Prisma CLI usa, em
     `db push` e `migrate`, que não funcionam pelo pooler de transação.
     Prefira o host `...pooler.supabase.com` ao `db.<ref>.supabase.co`,
     porque o direto só responde em IPv6.
3. Crie um **projeto próprio** na Vercel apontando para este repositório. Se a
   pasta `financeiro/` ainda estiver dentro do repositório do SampsOS, use
   **Root Directory = `financeiro`** nas configurações do projeto.
4. Variáveis do projeto do Financeiro na Vercel: `DATABASE_URL`, `DIRECT_URL`,
   `AUTH_SECRET`, `AUTH_TRUST_HOST=true`.
5. `npm run db:push` (ou `prisma migrate deploy`) contra o banco novo, com o
   `DIRECT_URL` preenchido.
6. No projeto do **SampsOS**, defina `FINANCEIRO_URL` com a URL do deploy
   acima (ex.: `https://samps-financeiro.vercel.app`). Sem essa variável o
   SampsOS não encaminha nada e segue exatamente como hoje — ou seja, o
   rewrite é opcional e reversível apagando uma variável.

### Antes de pôr dado real no Supabase

As tabelas aqui são criadas pelo Prisma, não pelo painel, então não recebem
as permissões que o Supabase dá às tabelas feitas por lá. Ainda assim,
**confira em Settings → API que a Data API não está servindo o schema
`public`**, e nunca publique a `service_role key` em lugar nenhum: este banco
guarda salário, CPF e laudo de exame. O acesso de quem usa o sistema é
decidido pela aplicação, pelo papel do usuário, não por RLS do Postgres.

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
