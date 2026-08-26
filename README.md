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
| **User** | CRUD de usuários; XP, nível e progresso são calculados a partir daqui |
| **Class** | Turmas às quais os alunos pertencem |
| **Mission** | Missões (quizzes); o aluno submete respostas e o servidor corrige contra o gabarito, creditando XP pelo melhor score |
| **Attitude** | Catálogo de atitudes (comportamentos) que podem ser registradas |
| **AttitudeLog** | Registro de uma atitude aplicada a um aluno |
| **Ranking** | Ranking global, por turma e do próprio usuário |

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
* MailerSend (envio de e-mail via API HTTP)
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

### Variáveis de ambiente

Todas as variáveis, com comentários, estão em `.env.example`. As obrigatórias para subir a aplicação:

* `DB_URL` — string de conexão do MongoDB.
* `APP_PORT` — porta da aplicação (padrão `5011`).
* `JWT_SECRET_ACCESS_TOKEN`, `JWT_SECRET_REFRESH_TOKEN`, `JWT_SECRET_PASSWORD_RECOVERY` — gere com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
* `MAILERSEND_API_KEY`, `MAILERSEND_FROM_EMAIL`, `MAILERSEND_FROM_NAME` — envio de e-mail (recuperação de senha) via API HTTP do MailerSend. Use `DISABLED_EMAIL=true` para desativar o envio (ex.: em testes locais).
* `FRONTEND_URL` — usada para montar o link de reset de senha enviado por e-mail.

Opcionais (têm valor padrão ou só fazem sentido em produção):

* `SWAGGER_SERVER_URL` — URL exibida como servidor no Swagger; sem ela, usa `http://localhost:$APP_PORT`.
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

* **API:** [Render](https://render.com), build via Docker (usa o `Dockerfile` do repositório). O deploy é disparado a partir deste repositório no GitHub — o desenvolvimento também é espelhado num GitLab self-hosted, mas é o GitHub quem o Render enxerga.
* **Banco:** MongoDB Atlas, com database de produção separado do de desenvolvimento (para o `npm run seed` de desenvolvimento nunca atingir produção).
* O plano gratuito do Render hiberna após 15 minutos sem requisições — a primeira chamada depois disso pode levar dezenas de segundos.

## Equipe

| Nome                | Função   | E-mail                 |
| :------------------ | :------ | :--------------------- |
| Matheus Lucas Batista | Analista e Líder do projeto | matheusifro2020@gmail.com |
