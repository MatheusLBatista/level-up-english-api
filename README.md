# LevelUp English

API REST para uma plataforma de gamificação do aprendizado de inglês, desenvolvida como Trabalho de Conclusão de Curso (TCC).

## Sobre o projeto

O **LevelUp English** ajuda professores de inglês a engajar turmas através de gamificação: alunos ganham **XP** e sobem de **nível** ao concluir missões (quizzes) e ao terem atitudes positivas registradas em sala, e podem acompanhar sua posição em **rankings** globais e por turma.

Existem três papéis de usuário, com permissões diferentes em cada rota:

* **student (aluno)** — vê suas turmas, missões e atitudes; submete o progresso de missões; consulta seu próprio ranking.
* **teacher (professor)** — cadastra alunos, turmas, missões e atitudes; registra ocorrências de atitude dos alunos (`attitude-logs`).
* **admin** — acesso total, incluindo exclusão de turmas/atitudes, revogação de sessões e recálculo de níveis.

### Domínios da API

| Domínio | O que faz |
| :------ | :-------- |
| **Auth** | Login, refresh/revogação de token, cadastro de aluno, recuperação e troca de senha |
| **User** | CRUD de usuários; XP, nível e progresso são calculados a partir daqui. Também expõe o histórico de XP e o desempenho do aluno por tipo de missão (radar), com a média da turma e filtro por período |
| **Class** | Turmas às quais os alunos pertencem |
| **Mission** | Missões (quizzes); o aluno submete respostas e o servidor corrige contra o gabarito, creditando XP pelo melhor score |
| **Attitude** | Catálogo de atitudes (comportamentos) que podem ser registradas |
| **AttitudeLog** | Registro de uma atitude aplicada a um aluno |
| **Ranking** | Ranking global, por turma e do próprio usuário; o aluno pode sair do ranking global e continua no da turma |
| **Notification** | Avisos ao aluno: atitude aplicada, corrigida ou desfeita, ajuste manual de XP e missão nova na turma. Listagem paginada, contador de não lidas e marcação como lida; apagadas após 90 dias |

## Arquitetura

Camadas no padrão **Controller → Service → Repository**, com:

* **Zod** para validação de schema e, via `@asteasolutions/zod-to-openapi`, geração automática do Swagger a partir dos mesmos schemas.
* **JWT** com access token + refresh token; tokens de recuperação de senha também são JWT com expiração curta.
* Erros tratados de forma centralizada (`CustomError` + `errorHandler`) e respostas padronizadas (`CommonResponse`).
* **Winston** para log em arquivo (rotação diária) e console.

## Tecnologias utilizadas

* Node.js (ESM) + Express 5
* MongoDB + Mongoose (paginação via `mongoose-paginate-v2`)
* Zod + zod-to-openapi (validação e Swagger)
* JWT (`jsonwebtoken`) + Bcrypt
* Nodemailer + Gmail (envio de e-mail via SMTP)
* Helmet, CORS, Compression
* Docker / Docker Compose
* Jest + Supertest + `mongodb-memory-server` (testes)
* ESLint

## Estrutura de pastas

```
src/
├── app.js            # monta o Express: middlewares globais, rotas, Swagger, 404, errorHandler
├── config/           # conexão com o MongoDB
├── controllers/      # recebem a requisição e delegam para o service
├── service/          # regras de negócio
├── repository/       # acesso a dados (Mongoose)
├── models/           # schemas Mongoose
├── schemas/          # schemas Zod (validação de entrada + geração do Swagger)
├── middlewares/       # auth, autorização por papel, log de rotas
├── routes/           # definição das rotas por domínio
├── docs/             # configuração do Swagger (registry.js gera o spec a partir dos schemas Zod)
├── utils/            # helpers (JWT, nível/XP, envio de e-mail, respostas padrão, erros)
├── seeds/            # popula o banco com dados fake para desenvolvimento
├── migrations/       # scripts avulsos que ajustam dados ou índices de um banco existente
└── tests/            # suíte de testes, espelhando as camadas acima
```

## Como rodar localmente

Pré-requisitos: Node.js 22+ e um banco MongoDB (local, Docker ou Atlas).

```bash
# Clone este repositório
git clone https://github.com/MatheusLBatista/level-up-english-api.git
cd level-up-english-api

# Instale as dependências
npm install

# Copie o .env.example e preencha as variáveis (veja a seção abaixo)
cp .env.example .env

# Popule o banco com dados de exemplo
npm run seed

# Suba a aplicação em modo desenvolvimento (recarrega sozinho)
npm run dev
```

A API sobe em `http://localhost:$APP_PORT` (padrão `5011`, definido no `.env`).

> ⚠️ `npm run seed` apaga (`deleteMany`) e recria usuários, turmas, missões, atitudes e attitude-logs. Não rode em um banco com dados que você queira manter.

Para apresentações, `npm run seed:demo` monta uma escola realista: um semestre simulado pelos próprios services, com turmas, missões, atitudes, ranking, as notificações de cada aluno (com a data do evento e as da última semana como não lidas) e uma foto de perfil ilustrada para cada pessoa (estilo [Lorelei](https://www.dicebear.com/styles/lorelei/) do DiceBear, licença CC0, gerada a partir do e-mail e tratada como um upload comum). Ele também apaga o banco e as fotos dos usuários apagados. Com `NODE_ENV=production`, ou em um banco com "prod" no nome, só roda se receber o nome exato do banco em `SEED_DEMO_CONFIRM`:

```bash
# no Docker, para as fotos irem para o volume vol-uploads
docker-compose exec -e SEED_DEMO_CONFIRM=level-up-english api npm run seed:demo
```

### Variáveis de ambiente

Todas as variáveis, com comentários, estão em `.env.example`. As obrigatórias para subir a aplicação:

* `DB_URL` — string de conexão do MongoDB.
* `APP_PORT` — porta da aplicação (padrão `5011`).
* `JWT_SECRET_ACCESS_TOKEN`, `JWT_SECRET_REFRESH_TOKEN`, `JWT_SECRET_PASSWORD_RECOVERY` — gere com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
* `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME` — envio de e-mail (recuperação de senha) via SMTP do Gmail, com senha de app. Use `DISABLED_EMAIL=true` para desativar o envio (ex.: em testes locais).
* `FRONTEND_URL` — usada para montar o link de reset de senha enviado por e-mail.

Opcionais (têm valor padrão ou só fazem sentido em produção):

* `SWAGGER_SERVER_URL` — URL exibida como servidor no Swagger; sem ela, usa `http://localhost:$APP_PORT`.
* `TRUST_PROXY` — número de proxies reversos na frente da API (ex.: `1` atrás de um nginx). Ausente ou `0`, o `X-Forwarded-For` é ignorado e o rate limit usa o IP da conexão; ligar sem proxy deixaria o cliente forjar o IP.
* `DB_URL_TEST`, `MONGO_*`, `LOG_*` — ajustes de teste, timeouts do Mongo e do logger.

## Rodando com Docker

Requer Docker instalado.

```bash
# Sobe API + MongoDB
docker-compose up -d

# Reconstruir a imagem e subir
docker-compose up --build

# Parar
docker-compose down
```

O `docker-compose.yml` sobe um MongoDB local (`mongo:8`) e a API lendo o restante das variáveis do `.env` — não é preciso configurar `DB_URL` para esse cenário.

## Documentação da API

Com a aplicação rodando, a documentação interativa (Swagger UI) fica em:

```
http://localhost:5011/api-docs
```

O spec em JSON puro está em `/api-docs.json`. Ambos são gerados automaticamente a partir dos schemas Zod (`src/docs/registry.js`), então ficam sincronizados com a validação real das rotas.

## Testes

```bash
npm run test
```

Roda a suíte Jest (unitária + integração via Supertest, banco em memória com `mongodb-memory-server`) com relatório de cobertura. A suíte cobre models, repositories, services, controllers e rotas de todos os domínios; a convenção de organização de `src/tests/` e o mapeamento de cada caso de teste documentado estão em `documentacao/testes/`.

## CI/CD

O pipeline (`.gitlab-ci.yml`) roda em cada push: lint (`eslint .`) e testes (`npm test`), com cache de dependências e do binário do `mongodb-memory-server`.

## Deploy

A API roda em Docker: o `Dockerfile` gera a imagem (Node 22, `npm ci --omit=dev`) e o `docker-compose.yml` sobe a API junto com um MongoDB 8, como em [Rodando com Docker](#rodando-com-docker).

* **Volumes:** `vol-mongodb` guarda os dados do banco e `vol-uploads` guarda as fotos de perfil (`/node-app/uploads` no container). Os dois precisam entrar no backup; sem o `vol-uploads`, as fotos se perdem a cada nova imagem.
* **Banco:** o compose força o `DB_URL` para o MongoDB do próprio compose. Para usar um banco externo (ex.: MongoDB Atlas), tire o serviço `mongodb` e o `DB_URL` do bloco `environment`, e deixe o `DB_URL` no `.env` — em um database separado do de desenvolvimento, para o `npm run seed` nunca atingir produção.
* **Proxy reverso:** atrás de um nginx (ou outro proxy), defina `TRUST_PROXY=1` no `.env` e ajuste o limite de corpo do proxy para pelo menos 2 MB (`client_max_body_size` no nginx, que por padrão aceita 1 MB), senão o upload de foto é barrado antes de chegar à API.

### Migrações

Fora do desenvolvimento o `autoIndex` do Mongoose fica desligado (`src/config/dbConnect.js`): mudar um índice no model não muda o banco. E mesmo em desenvolvimento o `autoIndex` só cria índices, nunca apaga um que saiu do model. Por isso as mudanças de índice vêm com uma migração, rodada à mão contra o banco do `.env` — em produção e em qualquer banco de desenvolvimento que já exista. Todas são idempotentes — rodar de novo não muda nada.

**`npm run migrate:mission-title-index`** — rodar **uma vez, logo depois do deploy** que tornou o título da missão único por turma. Apaga o índice antigo `title_1` (título único na escola inteira) e cria o `class_id_1_title_1` (único por turma, sem diferenciar maiúsculas). Antes de mexer em qualquer coisa, procura títulos repetidos na mesma turma; se achar, lista as missões e aborta sem alterar nenhum índice — renomeie as repetidas e rode de novo. Enquanto a migração não roda, o `title_1` continua barrando o mesmo título em turmas diferentes.

```bash
# com o DB_URL do banco de produção no .env
npm run migrate:mission-title-index
```

**`npm run migrate:notification-indexes`** — rodar **uma vez, logo depois do deploy** das notificações. Cria os índices da coleção `notifications`: o `{ user, read, createdAt }`, usado pela listagem e pelo contador de não lidas, e o TTL em `createdAt`, que apaga as notificações com mais de 90 dias. Sem a migração, a listagem funciona, mas sem índice, e as notificações nunca são apagadas.

```bash
# com o DB_URL do banco de produção no .env
npm run migrate:notification-indexes
```

**`npm run sync:class-students`** — reconstrói `Class.students` a partir de `User.class`.

## Equipe

| Nome                | Função   | E-mail                 |
| :------------------ | :------ | :--------------------- |
| Matheus Lucas Batista | Analista e Líder do projeto | matheusifro2020@gmail.com |
