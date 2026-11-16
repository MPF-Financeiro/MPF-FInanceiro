# Samps Financeiro

Financeiro e RH da Samps Digital. É um app **separado** do SampsOS: repositório
de build, banco e deploy próprios. O SampsOS só encaminha `/financeiro` para
cá por multi-zones — se este app cair, cai só `/financeiro`, e o sistema da
agência continua de pé. Essa era a condição número um do pedido.

## O que está de pé

Tudo o que a cliente pediu tem tela e ação, não só tabela no banco.

**Financeiro**

- Painel com os números do mês e a lista do que precisa de atenção hoje.
- Contas a receber e a pagar: lançar (inclusive parcelado), dar baixa parcial,
  estornar com motivo, cancelar com motivo, filtrar e exportar em CSV.
- Vendas do site do Giovanni Pacelli: a conta do líquido aberta linha a linha
  enquanto se digita, repasse de cartão por parcela e baixa quando cai.
- Cursos, cupons e as vigências de nota fiscal e taxa.
- Vouchers, com utilização e repasse como datas separadas.
- Cadastros: clientes, fornecedores, contratos (que geram as parcelas a
  receber), empresas e contas bancárias.
- Banco: importação do extrato colado, conciliação com sugestão, fechamento e
  reabertura do mês.
- Busca em títulos, vendas, cadastros e colaboradores.

**RH**

- Colaboradores, benefícios do mês e bonificações por conta trazida.
- Folha por competência: abre com os ativos, ajusta item a item com o
  contracheque aberto ao lado, fecha, e vai para o Financeiro como uma conta a
  pagar por colaborador — sem duplicar quando é reenviada.
- Ficha de cada pessoa: férias (com conferência dos dias), exames
  ocupacionais (o laudo só abre deixando registro de quem abriu), documentos,
  contracheques e rescisão.

**As regras que seguram tudo**

- Título + baixa: status é calculado, nunca digitado.
- Nada é apagado: cancelamento guarda motivo, erro de baixa vira estorno.
- Dinheiro em centavos inteiros; percentual em pontos-base.
- Chave única por origem: folha, contrato, benefício e venda reenviados
  atualizam o mesmo título em vez de criar outro.
- Mês fechado recusa lançamento e baixa naquela competência.
- Papel do usuário decide o que aparece e o que a ação aceita: ADMIN,
  FINANCEIRO, RH e LEITURA.

Ainda provisório, à espera da cliente: a logo e as cores do Financeiro, e as
taxas reais do "Paga-me" (o sistema usa 10% de nota, 1% no PIX e 4,5% no
cartão até ela confirmar).

## Rodar aqui

```bash
cp .env.example .env     # preencha DATABASE_URL e AUTH_SECRET
npm install
npm run db:push
npm run db:seed          # dados FICTÍCIOS, iguais aos das telas aprovadas
npm run dev              # http://localhost:3001/financeiro
npm test                 # testes das contas: dinheiro, folha, extrato
npm run test:e2e         # testes de navegador (ver e2e/LEIA-ME.md)
npm run db:usuario       # cria um usuário (ver "Primeiro acesso")
```

O seed cria quatro usuários de teste com a senha `financeiro123`, um por papel:
`admin@`, `financeiro@`, `rh@` e `leitura@sampsdigital.com`. É dado de
desenvolvimento: **não rode o seed em produção.**

Fora da Vercel (rodando `next start` na sua máquina, por exemplo), o next-auth
precisa de `AUTH_TRUST_HOST="true"` no `.env`.

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

### Primeiro acesso, depois do deploy

Com as variáveis no lugar, crie as tabelas e um usuário. Os dois comandos
rodam da sua máquina, apontando para o banco de produção — por isso precisam
do `DIRECT_URL` preenchido.

```bash
cd financeiro
cp .env.example .env     # preencha DATABASE_URL e DIRECT_URL do Supabase
npm install
npm run db:push          # cria as tabelas
```

Depois, o seu usuário. **Não rode o seed em produção:** ele apaga as tabelas
e cria contas com senha conhecida.

```bash
 NOME="Seu Nome" EMAIL="voce@sampsdigital.com" SENHA='sua-senha-longa' PAPEL=ADMIN npm run db:usuario
```

O espaço antes do `NOME` é de propósito: na maioria dos shells ele mantém a
linha fora do histórico. Papéis: `ADMIN`, `FINANCEIRO`, `RH`, `LEITURA`. O
comando pode ser repetido — rodar de novo com o mesmo e-mail troca a senha e
o papel daquela pessoa, que é como você reseta uma senha sem mexer no banco.

### A raiz do domínio da Vercel

O app inteiro vive sob `/financeiro`, para poder ser servido no domínio do
SampsOS. Então a raiz do domínio próprio da Vercel não é uma página: quem
abrisse `mpffinanceiro.vercel.app` via um 404 e achava que o deploy tinha
quebrado — a miniatura do painel da Vercel, inclusive, abre justamente a raiz.

O `vercel.json` manda a raiz para `/financeiro/login`. É redirect temporário
(307) de propósito: permanente ficaria no cache do navegador das pessoas e
seria difícil de voltar atrás. Esse arquivo só vale para o domínio próprio
deste deploy; quando o acesso for pelo domínio do SampsOS, a raiz é o SampsOS
e nada disso é usado.

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
- **Caminho com basePath.** `redirect()` do Next já acrescenta `/financeiro`:
  passar o caminho com o prefixo leva a `/financeiro/financeiro` e dá 404. O
  `redirect` do próprio next-auth não conhece o basePath, então `signIn` e
  `signOut` são chamados com `redirect: false` e quem redireciona é o Next.
  Para `<a>` e formulários `method="get"`, que não passam pelo router, o
  caminho vai completo (`rota()` em `lib/acoes/comum.ts`).
- **Papel checado no servidor.** Esconder botão é cortesia; o que protege é o
  `exigir()` no começo de cada ação.
- **Cascata sempre, carimbo só no que fechou.** Toda conta de dinheiro pode ser
  aberta linha a linha; o carimbo fica para mês fechado, folha enviada e
  rescisão homologada. Status do dia a dia é o chip da Samps.

## O que ainda depende da cliente

- A logo e as cores do Financeiro. Hoje a marca é provisória e a cor de ação é
  a tinta `#1E3A6E`.
- Se "Paga-me" é o Pagar.me e quais são as taxas reais. As do seed (1% no PIX,
  4,5% no cartão) são **exemplo**, e ficam em `ConfigTaxa` com data de início,
  para que trocar a taxa não mude venda antiga.
- Confirmar três decisões que divergem um pouco do que ela escreveu: status
  calculado em vez de escolhido, mês fechado que trava de verdade, e o
  cadastro de cursos. O cadastro de cursos ficou **manual dela** (decisão do
  Jorito em 16/11/2026): os cursos atuais entram uma vez e ela cadastra os
  novos; quando o curso não está cadastrado, dá para digitar o valor cobrado
  na própria venda.
- Quantos CNPJs e quais bancos; se o contador fecha a folha e em que formato;
  VA e VT por operadora ou em dinheiro; quem acessa o quê.

## Dados pessoais

Nada de dado real de pessoa neste repositório. CPF, salário, contracheque e
laudo de exame vivem só no banco de produção. Exame ocupacional é dado de
saúde: o painel mostra aptidão e validade, e abrir o laudo deixa registro em
`AcessoDocumento`.
