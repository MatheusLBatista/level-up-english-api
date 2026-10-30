# Catálogo de Casos de Teste

**LevelUp English - Plataforma Gamificada de Aprendizado de Inglês**

_versão 2.19 — complementa o [Plano de Teste](planoTeste.md) v3.10_

## Histórico das alterações

| Data       | Versão | Descrição                                                                                                  | Autor(a)      |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------ | ------------- |
| 14/08/2026 | 1.0    | Primeira versão do catálogo, extraída do comportamento atual da API                                          | Matheus Lucas |
| 19/08/2026 | 2.0    | Suíte automatizada implementada: cada caso passa a apontar a suíte que o cobre; situações e status revisados | Matheus Lucas |
| 24/09/2026 | 2.1    | Ajuste manual de XP (`POST /xp-adjustments`, RF-013): casos `CT-XP-011` a `021` e `CT-PERM-041`              | Matheus Lucas |
| 26/09/2026 | 2.2    | Piso de XP em 0 também nas atitudes aplicadas (`/attitude-logs`): casos `CT-ATT-018` a `022`                 | Matheus Lucas |
| 26/09/2026 | 2.3    | Filtro por turma em `GET /users`: casos `CT-USER-018` a `021` e posse da turma no `CT-PERM-009`             | Matheus Lucas |
| 30/09/2026 | 2.4    | Regras de conteúdo por tipo no `PATCH /missions/{id}` e `content_url` só http/https: casos `CT-MISSION-017` a `022` | Matheus Lucas |
| 02/10/2026 | 2.5    | Sincronização aluno ↔ turma, professor válido na turma, `class=none` e migração `sync:class-students`: casos `CT-AUTH-023` a `025`, `CT-USER-022` a `030` e `CT-CLASS-013` a `021`; `class=none` no `CT-PERM-009`; mensagens em português nos `CT-CLASS-002`, `006` e `009` | Matheus Lucas |
| 02/10/2026 | 2.6    | Cadastro de professor pelo admin (`POST /auth/register-teacher`) e `teacher: null` no `PATCH /classes/{id}`: casos `CT-AUTH-026` a `030` e `CT-CLASS-022` a `024` | Matheus Lucas |
| 07/10/2026 | 2.7    | Posse da turma no cadastro e na exclusão de aluno pelo professor: casos `CT-AUTH-031` a `034` e `CT-USER-031` a `035`; `CT-AUTH-019`, `024`, `025` e `CT-USER-006`, `016` ajustados; células de professor nos `CT-PERM-002`, `010` e `013` | Matheus Lucas |
| 09/10/2026 | 2.8    | Melhor nota gravada no progresso da missão e logout só com o refresh token: casos `CT-XP-022` a `024` e `CT-AUTH-035` a `038`; `CT-AUTH-009` e `CT-PERM-007` ajustados | Matheus Lucas |
| 13/10/2026 | 2.9    | Nomes e buscas com caracteres especiais de regex tratados como texto literal: casos `CT-USER-036` e `037`, `CT-CLASS-025` a `028`, `CT-MISSION-023` a `025` e `CT-ATT-023` e `024` | Matheus Lucas |
| 13/10/2026 | 2.10   | Senha atual errada no `PATCH /auth/change-password` passa de 401 para 400: `CT-AUTH-014` ajustado | Matheus Lucas |
| 13/10/2026 | 2.11   | Login de conta que ainda não definiu a senha responde 401, e não 500: caso `CT-AUTH-039` | Matheus Lucas |
| 13/10/2026 | 2.12   | Perguntas de checagem em vocabulário e áudio e correção pelo servidor nos três tipos: casos `CT-MISSION-026` a `033` e `CT-XP-025` a `028`; `CT-XP-008` ajustado (o score do corpo deixou de ser obrigatório) | Matheus Lucas |
| 14/10/2026 | 2.13   | Histórico de XP do aluno (`GET /users/{id}/xp-history`, RF-014): casos `CT-XP-029` a `039` e `CT-PERM-042` | Matheus Lucas |
| 14/10/2026 | 2.14   | Rate limit no login, no `forgot-password` e no `reset-password` (RNF-007): casos `CT-AUTH-040` a `050`; o `CT-RATE-001` deixa de estar bloqueado e é substituído por eles | Matheus Lucas |
| 14/10/2026 | 2.15   | Título da missão único por turma, e não na escola inteira: casos `CT-MISSION-034` a `042`; `CT-MISSION-007` e `025` ajustados para a nova regra e a nova mensagem | Matheus Lucas |
| 16/10/2026 | 2.16   | RF-009 atendido no frontend: `CT-BADGE-001` e `002` saem dos casos bloqueados por estarem fora do escopo do backend; o `CT-STREAK-001` continua bloqueado | Matheus Lucas |
| 16/10/2026 | 2.17   | Token expirado e token inválido exercitados em rota: `CT-AUTH-012` automatizado e caso `CT-AUTH-051`; o `AuthMiddleware` fica sem linha descoberta | Matheus Lucas |
| 16/10/2026 | 2.18   | Célula restritiva do `GET /attitude-logs/{id}` exercitada: `CT-PERM-033` automatizado e a matriz de permissões fica completa | Matheus Lucas |
| 29/10/2026 | 2.19   | Limite de caracteres das perguntas (`CT-MISSION-043` a `047`), desempenho por tipo de missão para o radar (RF-015, `CT-XP-040` a `049`), saída do ranking global (`CT-RANK-009` a `012`) e notificações (RF-016, nova seção 8 com `CT-NOTIF-001` a `019`); `CT-PERM-043` a `047`; as seções seguintes passam a 9 a 12 | Matheus Lucas |

## Como ler este documento

Cada caso tem um identificador estável (`CT-<MÓDULO>-<NNN>`), que é o que aparece no relatório de bug e no rastreio da suíte.

**Nível**: `Unit` (lógica isolada, com dublês), `Int` (requisição HTTP real contra banco em memória), `E2E` (vários endpoints encadeados).

**Suíte**: o arquivo que cobre o caso, relativo a `src/tests/`. É a coluna de rastreabilidade — dado um caso, ela diz onde ele é verificado; dada uma falha na suíte, o caminho inverso diz qual regra de negócio quebrou.

**Situação**:

- ✅ — **automatizado**: coberto pela suíte, executado a cada `npm run test`.
- ⬜ — **pendente**: cenário descrito e válido, ainda sem teste que o exercite.
- ⛔ — **bloqueado**: depende de funcionalidade que ainda não existe (seção 11).

Todos os casos de nível `Int` pressupõem banco limpo, cenário montado pelas factories e token obtido pelo helper de autenticação. Onde não se diz o contrário, o corpo da resposta segue o envelope padrão `{ message, data, errors }`.

### Critério de cobertura da matriz de permissões

A seção 9 tem três células por operação (student / teacher / admin). Um caso da matriz é considerado **automatizado** quando:

1. toda célula **restritiva** (403, ou 403 condicionado à posse do recurso) tem teste; e
2. pelo menos uma célula **permissiva** tem teste.

A justificativa é que `authorize(...roles)` é um portão único por rota: se o papel barrado recebe 403, o portão está provado. As diferenças entre os papéis liberados, quando existem, são regra de posse e ficam nos casos de módulo — não na matriz. Onde a célula restritiva não tem teste, o caso fica ⬜ mesmo que as permissivas estejam cobertas.

### Cenário base

Os casos usam o mesmo elenco, montado pelas factories:

| Apelido      | Papel   | Turma   | Observação                                  |
| ------------ | ------- | ------- | ------------------------------------------- |
| `admin`      | admin   | —       |                                             |
| `profA`      | teacher | Turma A | dono da Turma A                             |
| `profB`      | teacher | Turma B | dono da Turma B                             |
| `alunoA`     | student | Turma A |                                             |
| `alunoB`     | student | Turma B |                                             |
| `semTurma`   | student | —       | usado nos casos de aluno sem vínculo        |
| `inativo`    | teacher | —       | `active: false`, usado nos casos de bloqueio |

### Uma observação sobre o 498

Token ausente, malformado, expirado ou inválido responde **498**, e não 401. O 498 ("Invalid Token") não é do padrão HTTP — vem da convenção herdada do projeto base e está materializado em `AuthenticationError`, `TokenExpiredError` e em `HttpStatusCodes.INVALID_TOKEN`. O 401 fica reservado para o que é credencial recusada com token bem formado: login errado, refresh já rotacionado e sessão encerrada. A v1.0 deste catálogo documentava 401 nos três casos de token; a correção está nos casos `CT-AUTH-010` a `CT-AUTH-012`.

---

## 1 - Autenticação e sessão (`CT-AUTH`)

| ID           | Cenário                                | Entrada / passos                                                    | Resultado esperado                                                                    | RF     | Nível | Suíte                              | Situação |
| ------------ | -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ----- | ---------------------------------- | -------- |
| CT-AUTH-001  | Login com credenciais válidas          | `POST /auth/login` com e-mail e senha corretos                      | 200, `accessToken` e `refreshToken` presentes, `user` sem o campo `password`             | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-002  | Login com senha incorreta              | senha errada para um e-mail existente                               | 401, "Credenciais inválidas. Verifique seu usuário e senha."                             | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-003  | Login com e-mail inexistente           | e-mail que não está na base                                         | 401 com a **mesma** mensagem do CT-AUTH-002 — não revela se a conta existe               | RF-002 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-004  | Login de conta desativada              | usuário `inativo` com a senha correta                               | 401, "Conta bloqueada. Entre em contato com o suporte."                                  | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-005  | Login com corpo inválido               | e-mail sem formato válido, ou senha com menos de 6 caracteres       | 400, `errors` apontando o campo                                                          | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-006  | Renovação de tokens                    | `POST /auth/refresh` com o refresh token vigente                    | 200, novo par de tokens, ambos diferentes dos anteriores                                 | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-007  | Refresh token já rotacionado           | reutilizar o refresh token anterior após uma renovação              | 401, "Token inválido. Faça login novamente."                                             | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-008  | Refresh de conta desativada            | desativar a conta e tentar renovar                                  | 401, "Conta bloqueada. Entre em contato com o suporte."                                  | RF-010 | Unit  | `services/AuthService`             | ✅       |
| CT-AUTH-009  | Logout encerra a sessão                | `POST /auth/logout` com `{ refreshToken }` e depois qualquer rota autenticada | logout 200 com os tokens removidos do banco; a requisição seguinte com o mesmo access token responde 401 e o refresh token não renova mais | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-010  | Requisição sem token                   | rota autenticada sem cabeçalho `Authorization`                      | **498**, "O token de autenticação não existe!"                                           | RF-011 | Int   | `routes/authRoutes` e as 6 demais suítes de rota | ✅ |
| CT-AUTH-011  | Token malformado                       | `Authorization: Token abc`, ou Bearer sem valor                     | **498**, "Formato do token de autenticação inválido!"                                    | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-012  | Token expirado                         | access token com `exp` no passado                                   | **498**, "O token JWT está expirado!"                                                    | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-013  | Troca de senha pelo próprio usuário    | `PATCH /auth/change-password` com a senha atual correta             | 200; o login passa a funcionar com a nova senha e falha com a antiga                     | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-014  | Troca de senha com senha atual errada  | `currentPassword` incorreta                                         | 400 com `{ path: "currentPassword", message: "Senha atual incorreta." }` em `errors`; a senha no banco não muda. Não é 401: o usuário está autenticado, e o front trata 401 como sessão expirada | RF-002 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-015  | Recuperação de senha, e-mail existente | `POST /auth/forgot-password`                                        | 200; código de recuperação gravado com validade de 30 minutos                            | RF-002 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-016  | Recuperação com e-mail inexistente     | e-mail fora da base                                                 | 200 silencioso, sem código gravado e sem revelar que a conta não existe                  | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-017  | Redefinição com código válido          | `POST /auth/reset-password` com o código recebido                   | 200; login com a nova senha funciona e o código é invalidado após o uso                  | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-018  | Redefinição com código expirado        | código com `exp_password_recovery_code` no passado                  | 400, "Código de recuperação inválido ou expirado."                                       | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-019  | Cadastro de aluno pelo professor       | `POST /auth/register-student` como `profA` com nome, e-mail e a `turmaA` | 201, usuário criado com `role: "student"`, sem senha definida e com e-mail de boas-vindas | RF-001 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-020  | Cadastro com e-mail duplicado          | e-mail já usado por outro usuário                                   | 400, "Este e-mail já está cadastrado."                                                   | RF-001 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-021  | Cadastro de aluno por aluno            | `alunoA` chamando `register-student`                                | 403, "Permissão insuficiente para executar a operação."                                  | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-022  | Revogação de sessão pelo admin         | `POST /auth/revoke/{userId}` sobre uma sessão ativa                 | 200; o token do alvo deixa de ser aceito na requisição seguinte                          | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-023  | Cadastro de aluno sincroniza a turma   | `POST /auth/register-student` com `class` de uma turma ativa        | 201; o id do aluno criado passa a constar em `Class.students` da turma                   | RF-001 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-024  | Cadastro com turma inexistente         | `class` com id válido que não existe, como `admin`                  | 400 no path `class`, "Turma não encontrada ou inativa."; nenhum usuário criado e nenhum e-mail enviado | RF-001 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-025  | Cadastro com turma inativa             | `class` de uma turma com `active: false`, como `admin`              | 400 com a mesma mensagem do CT-AUTH-024; nenhum usuário criado                           | RF-001 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-026  | Cadastro de professor pelo admin       | `POST /auth/register-teacher` com nome e e-mail como `admin`        | 201 com `role: "teacher"` e sem `password`; nenhuma senha gravada, código de definição válido por 24 h e e-mail de boas-vindas com o link `/set-password?code=` | RF-001 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-027  | Cadastro de professor com turmas       | `classes` com a Turma A (dona: `profA`) e uma turma sem professor   | 201; o novo professor passa a ser o `teacher` das duas turmas — o `profA` é substituído na Turma A | RF-001 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-028  | Cadastro de professor com turma inválida | `classes` com uma turma válida e outra inexistente ou inativa     | 400 no path `classes`, "Turma não encontrada ou inativa."; nenhum usuário criado, nenhuma turma alterada e nenhum e-mail enviado | RF-001 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-029  | Cadastro de professor com e-mail duplicado | e-mail já usado por outro usuário                               | 400 no path `email`, "Este e-mail já está cadastrado."                                  | RF-001 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-030  | Cadastro de professor sem ser admin    | `profA` ou `alunoA` chamando `register-teacher`                     | 403; nenhum usuário criado                                                               | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-031  | Professor cadastra aluno sem turma     | `POST /auth/register-student` como `profA` sem `class`              | 400 no path `class`, "Escolha uma das suas turmas."; nenhum usuário criado e nenhum e-mail enviado | RF-011 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-032  | Professor cadastra aluno em turma alheia | `register-student` como `profA` com `class` da `turmaB`           | 403, "Você só pode cadastrar alunos nas suas turmas."; nenhum usuário criado e nenhum e-mail enviado | RF-011 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-033  | Professor usa turma sem professor, inexistente ou inativa | `register-student` como `profA` com cada uma dessas turmas (a inativa sendo dele) | 403 com a mesma mensagem do CT-AUTH-032 — para o professor, a posse é conferida antes da validação da turma | RF-011 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-034  | Admin cadastra aluno sem turma         | `register-student` como `admin` sem `class`                         | 201; o admin não passa pela regra de posse e pode cadastrar em qualquer turma ou sem turma | RF-001 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-035  | Logout com access token expirado       | `POST /auth/logout` com `{ refreshToken }` e um access token vencido no cabeçalho | 200; o cabeçalho é ignorado e os tokens são removidos — o logout não depende do access token | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-036  | Logout com refresh token inválido      | `refreshToken` malformado ou expirado                                | 200 com a mesma mensagem do CT-AUTH-009; os tokens salvos não mudam — não revela se a sessão existia | RF-010 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-037  | Logout com refresh token que não é o salvo | refresh token válido, mas já substituído no banco, ou de usuário sem sessão; repetir o logout | 200; os tokens salvos não mudam e o logout repetido também responde 200 (idempotente) | RF-010 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-038  | Logout sem corpo                       | `POST /auth/logout` sem `refreshToken`                              | 400; só corpo malformado é recusado                                                      | RF-010 | Int   | `routes/authRoutes`, `controllers/AuthController` | ✅ |
| CT-AUTH-039  | Login de conta sem senha definida      | usuário criado por `register-student` ou `register-teacher` que ainda não usou o link de definição de senha | 401 com a **mesma** mensagem do CT-AUTH-002, e não 500; nenhum token é gravado — não revela que a conta existe e aguarda a senha | RF-002 | Int | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-040  | Login bloqueado após falhas | 3 senhas erradas para `aluno@escola.com` e depois a senha certa, do mesmo IP (limite reduzido a 3 no teste; 10 em produção) | a 4ª tentativa responde 429 mesmo com a senha certa, com `{ message: "Muitas tentativas de login. Tente de novo em 15 minutos.", data: null, errors: [] }` | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-041  | Cabeçalhos do 429 | a 4ª tentativa do CT-AUTH-040 | `Retry-After` com os segundos até liberar e `RateLimit` (draft-7); sem os cabeçalhos legados `X-RateLimit-*` | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-042  | Login certo não conta | 5 logins certos, 2 errados e mais um certo | todos os certos respondem 200 — só a falha consome o limite | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-043  | Outro e-mail do mesmo IP | `aluno@escola.com` bloqueado; `colega@escola.com` tenta do mesmo IP | 200 para o colega — o caso do laboratório, em que a turma sai pelo mesmo IP público | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-044  | E-mail normalizado na chave | 2 falhas com `aluno@escola.com` e 1 com `  ALUNO@escola.com ` | a próxima tentativa de `aluno@escola.com` responde 429 — maiúsculas e espaços não abrem um contador novo | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-045  | Barreira por IP | falhas com e-mails diferentes, do mesmo IP, até o limite do IP (5 no teste; 100 em produção) | a tentativa seguinte responde 429 com a mensagem do login, mesmo para e-mail sem falha | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-046  | Bloqueio do e-mail não gasta a cota do IP | `aluno@escola.com` bloqueado insiste 5 vezes | as 5 respondem 429 e o colega, do mesmo IP, ainda entra — o limite por e-mail barra antes de o do IP contar | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-047  | IPs contados separadamente | `aluno@escola.com` bloqueado num IP tenta de outro | 200 no outro IP | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-048  | Pedidos demais no `forgot-password` | 4 pedidos para o mesmo e-mail e IP (limite 3 no teste; 5 por hora em produção) | o 4º responde 429, "Muitos pedidos de recuperação. Tente de novo em 1 hora.", com `Retry-After`, e nenhum e-mail a mais é enviado; outro e-mail do mesmo IP continua sendo atendido | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-049  | Códigos errados demais no `reset-password` | 3 códigos inválidos e um 4º (limite 3 no teste; 10 em produção) | os 3 respondem 400 e o 4º 429, "Muitas tentativas. Tente de novo em 15 minutos." — vale também para o primeiro acesso, que define a senha por esta rota | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-050  | Refresh nunca é limitado | login estourado e 10 `refresh` com token inválido do mesmo IP | todos os `refresh` respondem 401, nenhum 429, e o refresh com o token válido responde 200 — bloquear o refresh derrubaria sessões válidas | RNF-007 | Int | `routes/rateLimitRoutes` | ✅ |
| CT-AUTH-051 | Token inválido | access token assinado com o segredo do refresh token, ou um valor que não é JWT (`Bearer abc`) | **498**, "Token JWT inválido!" — o refresh token tem o mesmo payload do access token, e só o segredo impede que um valha pelo outro | RF-011 | Int | `routes/authRoutes` | ✅ |
**Token expirado e inválido (`CT-AUTH-012` e `CT-AUTH-051`).** Não dá para esperar o token vencer dentro da suíte, então o teste assina um access token com `expiresIn` negativo; o token inválido é assinado com o segredo do refresh token. Os dois são recusados pelo `jwt.verify` antes de o banco ser consultado, e cobrem os dois ramos do `catch` do `AuthMiddleware`, do token até o corpo da resposta.

**Rate limit (`CT-AUTH-040` a `050`).** Os limites de produção são altos demais para a suíte exercitar, e a suíte faz muitos logins seguidos que não podem esbarrar neles. Por isso o `RateLimitMiddleware` expõe fábricas que recebem `{ limit, windowMs }`: em `NODE_ENV=test` as instâncias da rota sobem com limite 10000 — o `authRoutes` confere que o login continua passando pelo middleware —, e o `routes/rateLimitRoutes` troca essas instâncias, por `jest.mock`, por outras de limite baixo montadas pelas mesmas fábricas. Cada teste sai por um IP próprio via `X-Forwarded-For`, porque os contadores ficam na memória do limitador e não são zerados entre os testes. O `trust proxy` do `app.js` não é exercido, pelo mesmo motivo que deixa o `app.js` sem cobertura (seção 6 do plano); o teste monta o próprio Express com a mesma configuração.

---

## 2 - Usuários (`CT-USER`)

| ID           | Cenário                              | Entrada / passos                                                        | Resultado esperado                                                                     | RF     | Nível | Suíte                 | Situação |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ | ----- | --------------------- | -------- |
| CT-USER-001  | Listagem com filtro e paginação      | `GET /users?role=student&active=true&page=1&limit=10` como admin        | 200, apenas alunos ativos, no máximo 10 por página, com metadados de paginação            | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-002  | Listagem por aluno                   | `GET /users` com token de `alunoA`                                      | 403 — a base inteira não é visível para aluno                                             | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-003  | Aluno consulta o próprio perfil      | `GET /users/{id do alunoA}` como `alunoA`                               | 200 com os dados dele, sem `password`                                                     | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-004  | Aluno consulta perfil alheio         | `GET /users/{id do alunoB}` como `alunoA`                               | 403, "Students can only view their own profile."                                          | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-005  | Consulta de usuário inexistente      | id válido que não existe                                                | 404, "Recurso não encontrado em User."                                                    | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-006  | Professor cria aluno                 | `POST /users` como `profA` com `role: "student"`, senha e a `turmaA`    | 201; a senha é gravada com hash bcrypt e nunca retorna na resposta                        | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-007  | Professor tenta criar admin          | `POST /users` com `role: "admin"`                                       | 403, "Only admins can create users with a role other than student."                       | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-008  | Criação com e-mail duplicado         | e-mail já cadastrado                                                    | 400, "Email already registered."                                                          | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-009  | Atualização do próprio perfil        | `PATCH /users/{próprio id}` com `{ name }`                              | 200 com o nome atualizado                                                                 | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-010  | Atualização de perfil alheio         | `alunoA` alterando `alunoB`; professor alterando outro usuário          | 403, "You do not have permission to update another user."                                 | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-011  | Escalada de privilégio pelo PATCH    | `alunoA` envia `{ role: "admin", xp: 99999, class, active }` no próprio  | 200, porém os quatro campos são descartados: papel, XP, turma e situação seguem iguais    | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-012  | Aluno exclui a própria conta         | `DELETE /users/{próprio id}` como `alunoB`                              | 200 e o usuário some da base                                                              | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-013  | Aluno exclui conta alheia            | `alunoA` excluindo `alunoB`                                             | 403, "Students can only delete their own account."                                        | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-014  | Professor exclui conta de admin      | `profA` excluindo `admin`                                               | 403, "Teachers can only delete student accounts."                                         | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-015  | Professor exclui outro professor     | `profA` excluindo `profB`                                               | 403, mesma mensagem do CT-USER-014                                                        | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-016  | Professor exclui aluno da turma dele | `profA` excluindo `alunoA`                                              | 200; o aluno some da base e sai de `Class.students` da `turmaA`                           | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-017  | Recálculo de níveis pelo admin       | `POST /users/recalculate-levels` com usuários de nível defasado          | 200 e `updated` igual à quantidade de usuários corrigidos                                 | RF-006 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-018  | Professor lista alunos da turma dele | `GET /users?role=student&class={turmaA}&active=true&limit=100` como `profA` | 200, apenas os alunos ativos da `turmaA` — sem o filtro de papel e situação, vêm todos os usuários da turma | RF-001 | Int | `routes/userRoutes`, `repository/filters/UserFilterBuild` | ✅ |
| CT-USER-019  | Professor filtra turma alheia        | `GET /users?class={turmaB}` como `profA`                                | 403, "Você só pode listar alunos das suas turmas."                                        | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-020  | Filtro por turma inexistente         | `GET /users?class={id válido que não existe}`                          | 404, turma não encontrada                                                                 | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-021  | Admin filtra qualquer turma          | `GET /users?class={turmaB}` como `admin`                                | 200, apenas os usuários da `turmaB` — o admin não passa pela checagem de posse            | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-022  | Criação de aluno com turma           | `POST /users` como `admin` com `class` de uma turma ativa               | 201; o id do aluno criado passa a constar em `Class.students` da turma                    | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-023  | Criação com turma inválida           | `class` inexistente ou inativa, ou `class` num usuário que não é aluno  | 400 no path `class`; nenhum usuário criado                                               | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-024  | Admin troca o aluno de turma         | `PATCH /users/{alunoA}` com `{ class: turmaB }` como `admin`             | 200; o id do aluno sai de `Class.students` da `turmaA` e entra no da `turmaB`             | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-025  | Admin tira o aluno da turma          | `PATCH /users/{alunoA}` com `{ class: null }` como `admin`               | 200 com `class: null`; o id do aluno sai de `Class.students` da `turmaA`                  | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-026  | Troca para turma inexistente         | `PATCH /users/{alunoA}` com `class` de id válido que não existe          | 400, "Turma não encontrada."; `User.class` e os arrays das turmas não mudam               | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-027  | Turma atribuída a quem não é aluno   | `PATCH /users/{profA}` com `class` como `admin`                          | 400 no path `class`, "Apenas alunos podem ser vinculados a uma turma."                    | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-028  | Exclusão de aluno com turma          | `DELETE /users/{alunoA}` como `admin`                                   | 200; o id do aluno sai de `Class.students` da `turmaA`                                    | RF-001 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-029  | Admin lista usuários sem turma       | `GET /users?class=none&role=student` como `admin`                       | 200, apenas os alunos com `class` nulo ou ausente; nenhuma turma é consultada              | RF-001 | Int   | `routes/userRoutes`, `services/UserService`, `repository/filters/UserFilterBuild` | ✅ |
| CT-USER-030  | Professor usa `class=none`           | `GET /users?class=none` como `profA`                                    | 403, "Só o admin pode listar alunos sem turma."                                           | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-031  | Professor cria aluno sem turma       | `POST /users` como `profA` sem `class`                                  | 400 no path `class`, "Escolha uma das suas turmas."; nenhum usuário criado                | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-032  | Professor cria aluno em turma alheia | `POST /users` como `profA` com `class` da `turmaB`                      | 403, "Você só pode cadastrar alunos nas suas turmas."; nenhum usuário criado              | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-033  | Admin cria aluno sem turma           | `POST /users` como `admin` sem `class`                                  | 201; o admin não passa pela regra de posse                                                | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-034  | Professor exclui aluno de turma alheia | `profA` excluindo `alunoB`                                            | 403, "Você só pode excluir alunos das suas turmas."; o aluno segue na base e em `Class.students` da `turmaB` | RF-011 | Int | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-035  | Professor exclui aluno sem turma     | `profA` excluindo `semTurma`                                            | 403 com a mesma mensagem do CT-USER-034; o aluno segue na base                            | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-036  | Busca por nome com caractere especial | `GET /users?name=Ana.` como admin, com `Ana.` e `Anax` cadastrados     | 200 apenas com `Ana.` — o ponto é texto literal, não "qualquer caractere"; a busca parcial comum segue funcionando | RF-001 | Int | `routes/userRoutes`, `repository/filters/UserFilterBuild` | ✅ |
| CT-USER-037  | Busca com parêntese sem par          | `GET /users?name=Ana (` como admin                                      | 200 com lista vazia, e não 500 por regex inválida                                         | RF-001 | Int   | `routes/userRoutes`   | ✅       |

---

## 3 - Turmas (`CT-CLASS`)

| ID            | Cenário                                | Entrada / passos                                             | Resultado esperado                                                              | RF     | Nível | Suíte                  | Situação |
| ------------- | -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | ----- | ---------------------- | -------- |
| CT-CLASS-001  | Professor cria turma                   | `POST /classes` com `{ name }`                                | 201 com `teacher` preenchido com o id de quem criou, ignorando o que veio no corpo | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-002  | Nome de turma duplicado                | nome já existente, com outra caixa (`turma a` x `Turma A`)    | 400 no path `name`, "Já existe uma turma com este nome." — a validação é insensível a maiúsculas | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-003  | Listagem por admin                     | `GET /classes?page=1&limit=10`                                | 200 com todas as turmas paginadas e o professor populado                          | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-004  | Listagem por aluno                     | `GET /classes` como `alunoA`                                  | 200 contendo exatamente uma turma: a dele                                         | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-005  | Aluno forçando outra turma na query    | `GET /classes?id={id da Turma B}` como `alunoA`               | 200 ainda com a Turma A — o filtro do aluno prevalece sobre a querystring          | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-006  | Aluno consulta turma alheia por id     | `GET /classes/{id da Turma B}` como `alunoA`                  | 403, "Você só pode ver a sua turma."                                              | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-007  | Aluno sem turma lista turmas           | `GET /classes` como `semTurma`                                | 200 com lista vazia, sem erro                                                     | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-008  | Professor atualiza a própria turma     | `PATCH /classes/{Turma A}` como `profA`                       | 200 com os dados atualizados                                                      | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-009  | Professor atualiza turma alheia        | `PATCH /classes/{Turma B}` como `profA`                       | 403, "Você só pode editar as suas turmas."                                        | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-010  | Professor tenta trocar o dono da turma | `PATCH` da própria turma enviando outro `teacher`             | 200, porém o campo `teacher` é descartado e a turma continua com o mesmo dono      | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-011  | Professor exclui turma                 | `DELETE /classes/{Turma A}` como `profA`                      | 403 — a exclusão é exclusiva do admin                                             | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-012  | Admin exclui turma                     | `DELETE /classes/{Turma A}` como `admin`                      | 200 e a turma some da base                                                        | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-013  | Turma criada com alunos                | `POST /classes` com `students: [semTurma]` como `admin`       | 201; `User.class` do aluno passa a apontar para a turma criada                    | RF-003 | Int   | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-014  | Aluno de outra turma adicionado        | `PATCH /classes/{Turma B}` com `students: [alunoA]` como `admin` | 200; `User.class` do `alunoA` vira a Turma B e o id dele sai de `Class.students` da Turma A | RF-003 | Int | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-015  | Aluno removido da turma                | `PATCH /classes/{Turma A}` com `students: []` como `profA`    | 200; `User.class` do `alunoA` fica nulo — só é limpo se ainda apontar para a Turma A | RF-003 | Int | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-016  | `students` com id que não é de aluno   | `PATCH /classes/{Turma A}` com o id de `profB` em `students`  | 400 no path `students`, "Todos os ids devem ser de alunos cadastrados."; nada é gravado | RF-003 | Int | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-017  | Admin define professor ativo           | `POST /classes` com `teacher: profB` como `admin`             | 201 com `teacher` igual ao id de `profB`                                          | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-018  | Admin define professor inválido        | `POST /classes` com `teacher` inexistente ou de um aluno       | 400 no path `teacher`, "Escolha um professor ativo."; a turma não é criada         | RF-003 | Int   | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-019  | Admin troca para professor inativo     | `PATCH /classes/{Turma A}` com `teacher: inativo` como `admin` | 400 no path `teacher`; a turma continua com o mesmo dono                          | RF-003 | Int   | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-020  | Migração corrige dados divergentes     | `npm run sync:class-students` com `Class.students` faltando, sobrando e repetindo alunos | `Class.students` reconstruído a partir de `User.class`; devolve quantas turmas mudaram e conta, sem alterar, os alunos que apontam para turma inexistente | RF-003 | Int | `migrations/syncClassStudents` | ✅ |
| CT-CLASS-021  | Migração é idempotente                 | rodar a migração duas vezes seguidas                          | a segunda execução não altera nenhuma turma                                       | RF-003 | Int   | `migrations/syncClassStudents` | ✅ |
| CT-CLASS-022  | Admin deixa a turma sem professor      | `PATCH /classes/{Turma A}` com `{ teacher: null }` como `admin` | 200 com `teacher: null`; a turma fica sem professor                               | RF-003 | Int   | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-023  | Professor envia `teacher: null`        | `PATCH /classes/{Turma A}` com `{ teacher: null }` como `profA` | 200, porém o campo é descartado e a turma continua com o `profA`                  | RF-011 | Int   | `routes/classRoutes`, `services/ClassService` | ✅ |
| CT-CLASS-024  | `teacher: null` na criação             | `POST /classes` com `{ name, teacher: null }` como `admin`    | 400 no path `teacher` — só o `PATCH` aceita `null`                                | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-025  | Nome de turma com parêntese            | `POST /classes` com `name: "Turma A (manhã"`                | 201 com o nome gravado como enviado, e não 500 por regex inválida                  | RF-003 | Int   | `routes/classRoutes`, `repository/ClassRepository` | ✅ |
| CT-CLASS-026  | Ponto no nome não gera duplicado falso | `3º ano1` cadastrada; `POST /classes` com `name: "3º ano."`   | 201 — a checagem de duplicado compara o texto literal                              | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-027  | Duplicado com caracteres especiais     | `Turma A (manhã)` cadastrada; `POST` com `turma a (MANHÃ)`    | 400, "Já existe uma turma com este nome." — o escape não desliga a comparação sem caixa do CT-CLASS-002 | RF-003 | Int | `routes/classRoutes` | ✅ |
| CT-CLASS-028  | Filtro de nome literal na listagem     | `GET /classes?name=3º ano.` com `3º ano.` e `3º ano1`; `GET /classes?name=Turma (` | 200 só com `3º ano.`; com o parêntese sem par, 200 com lista vazia | RF-003 | Int | `routes/classRoutes`, `repository/ClassRepository` | ✅ |

---

## 4 - Missões (`CT-MISSION`)

| ID              | Cenário                                  | Entrada / passos                                                          | Resultado esperado                                                                        | RF     | Nível | Suíte                                     | Situação |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ----- | ----------------------------------------- | -------- |
| CT-MISSION-001  | Criação de quiz válido                   | `POST /missions` com `type: "quiz"` e 5 questões, na turma do professor    | 201; a missão nasce ativa e o id é adicionado ao array `missions` da turma                   | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-002  | Quiz com menos de 5 questões             | 4 questões                                                                 | 400, "Missões do tipo quiz precisam de no mínimo 5 perguntas."                               | RF-004 | Int   | `routes/missionRoutes`, `controllers/MissionController` | ✅ |
| CT-MISSION-003  | Tipo de missão inválido                  | `type: "invalid"`                                                          | 400 — apenas `quiz`, `vocabulary` e `audio` são aceitos                                      | RF-004 | Unit  | `controllers/MissionController`           | ✅       |
| CT-MISSION-004  | Vocabulário sem conteúdo                 | `type: "vocabulary"` sem `content`                                         | 400, "Missões do tipo vocabulário precisam de conteúdo (content)."                           | RF-004 | Unit  | `controllers/MissionController`           | ✅       |
| CT-MISSION-005  | Áudio sem URL                            | `type: "audio"` sem `content_url`                                          | 400, "Missões do tipo áudio precisam de uma URL (content_url)."                              | RF-004 | Unit  | `controllers/MissionController`           | ✅       |
| CT-MISSION-006  | Missão em turma de outro professor       | `profA` criando missão na Turma B                                          | 403, "Você só pode criar missões nas suas turmas."                                           | RF-011 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-007  | Título de missão duplicado na turma      | `POST /missions` na Turma A com o título de outra missão da Turma A        | 400, "Título já cadastrado nesta turma.", com `errors: [{ path: "title", message: "Já existe uma missão com este título nesta turma." }]`; a regra vale também no `PATCH` | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅       |
| CT-MISSION-008  | Listagem pelo aluno                      | `GET /missions` como `alunoA`, com missões nas duas turmas                 | 200 apenas com as missões da Turma A, e **sem** `questions[].correct_answer`                 | RF-012 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-009  | Listagem pelo professor                  | `GET /missions` como `profA`                                              | 200 com o gabarito presente nas questões                                                     | RF-012 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-010  | Aluno abre missão da própria turma       | `GET /missions/{id}` como `alunoA`                                        | 200 com `question` e `options` preservados e `correct_answer` ausente                        | RF-012 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-011  | Aluno abre missão de outra turma         | `GET /missions/{missão da Turma B}` como `alunoA`                         | 403, "Você não tem acesso a esta missão."                                                    | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-012  | Professor edita missão que criou         | `PATCH /missions/{id}` como autor                                         | 200 com os campos atualizados                                                                | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-013  | Professor edita missão de outro          | `PATCH /missions/{missão do profA}` como `profB`                          | 403, "Você só pode editar missões que criou."                                                | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-014  | Troca da turma da missão                 | `PATCH` alterando `class_id` para outra turma do mesmo professor          | 200; o id sai do array `missions` da turma antiga e entra no da nova                          | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-015  | Exclusão pelo autor                      | `DELETE /missions/{id}` como autor                                        | 200; a missão some e o id é removido do array `missions` da turma                            | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-016  | Exclusão por outro professor             | `DELETE /missions/{missão do profA}` como `profB`                         | 403, "Você só pode excluir missões que criou."                                               | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-017  | Quiz editado com menos de 5 questões     | `PATCH /missions/{quiz}` com 4 questões                                   | 400 com `errors: [{ path: "questions", message: "Missões do tipo quiz precisam de no mínimo 5 perguntas." }]`; as questões salvas não mudam | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-018  | Vocabulário editado com content em branco | `PATCH /missions/{vocabulário}` com `content: "   "`                      | 400 com `path: "content"`; o conteúdo salvo não muda                                         | RF-004 | Int   | `routes/missionRoutes`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-019  | Áudio editado com content_url vazio      | `PATCH /missions/{áudio}` com `content_url: ""`                           | 400 com `path: "content_url"`; a URL salva não muda                                          | RF-004 | Int   | `routes/missionRoutes`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-020  | Edição parcial não exige conteúdo        | `PATCH /missions/{quiz}` enviando só `title`                              | 200; as regras de conteúdo só valem para os campos enviados                                  | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-021  | Conteúdo inválido junto com troca de turma | `PATCH /missions/{quiz}` com `class_id` da Turma B e `questions: []`    | 400; a missão continua na Turma A e o id não entra no array `missions` da Turma B            | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-022  | URL de áudio com esquema não http        | `POST /missions` com `type: "audio"` e `content_url: "javascript:alert(1)"` | 400, "URL inválida." em `content_url`; só `http` e `https` são aceitos, no POST e no PATCH  | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-023  | Título de missão com parêntese           | `POST /missions` com `title: "Animais (parte 1"`                          | 201 com o título gravado como enviado, e não 500 por regex inválida                        | RF-004 | Int   | `routes/missionRoutes`, `repository/MissionRepository` | ✅ |
| CT-MISSION-024  | Ponto no título não gera duplicado falso | `Unidade1` cadastrada; `POST /missions` com `title: "Unidade."`             | 201 — a checagem de duplicado compara o texto literal                                      | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-025  | Título duplicado com outra caixa         | `Animais` cadastrada na Turma A; `POST /missions` na Turma A com `title: "animais"` | 400 em `title`, como no CT-MISSION-007 — a comparação é insensível a maiúsculas | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-026  | Vocabulário ou áudio sem perguntas de checagem | `POST /missions` com `type: "vocabulary"` (ou `"audio"`) sem `questions` | 400 em `questions`, "Missões de vocabulário precisam de 1 a 3 perguntas de checagem." (no áudio, "Missões de áudio…"); nada é gravado | RF-004 | Int | `routes/missionRoutes`, `controllers/MissionController`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-027  | Mais de três perguntas de checagem       | `POST /missions` com `type: "audio"` e 4 perguntas                         | 400 em `questions`, "Missões de áudio precisam de 1 a 3 perguntas de checagem."            | RF-004 | Int   | `routes/missionRoutes`, `controllers/MissionController` | ✅ |
| CT-MISSION-028  | Limites de 1 e 3 perguntas aceitos       | vocabulário com 1 pergunta e áudio com 3                                    | 201 nos dois, com as perguntas gravadas                                                      | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-029  | Missão antiga editada sem perguntas      | vocabulário salvo sem `questions`; `PATCH` com `{ title }`                  | 400 em `questions` com a mensagem do CT-MISSION-026; o título salvo não muda. Vale para `title`, `description`, `content`, `content_url`, `xp_reward` e `questions` | RF-004 | Int | `routes/missionRoutes`, `services/MissionService`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-030  | Missão antiga editada com perguntas      | mesmo vocabulário; `PATCH` com `{ title, questions }` e 2 perguntas         | 200; a missão passa a ter as 2 perguntas e sai da condição de antiga                         | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-031  | Missão antiga só ativada ou desativada   | mesmo vocabulário; `PATCH` com `{ active: false }` (ou só `class_id`)       | 200 sem exigir perguntas — não é edição de conteúdo                                          | RF-004 | Int   | `routes/missionRoutes`, `schemas/MissionSchema` | ✅ |
| CT-MISSION-032  | Edição parcial de vocabulário com perguntas | vocabulário salvo com perguntas; `PATCH` só com `title`                  | 200; as perguntas salvas continuam valendo, como no quiz (CT-MISSION-020)                    | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-033  | Aluno não recebe gabarito de vocabulário e áudio | `GET /missions` e `GET /missions/{id}` como `alunoA`, em vocabulário e áudio com perguntas | 200 com `question` e `options`, sem `correct_answer` — a mesma regra do quiz (CT-MISSION-008 e 010) | RF-012 | Int | `routes/missionRoutes` | ✅ |
| CT-MISSION-034  | Mesmo título em outra turma | `Animais` na Turma A; `profB` cria `Animais` na Turma B | 201 — turmas diferentes têm missões independentes; antes desta versão respondia 400 | RF-004 | Int | `routes/missionRoutes` | ✅ |
| CT-MISSION-035  | Missão desativada ocupa o título | `Animais` da Turma A com `active: false`; nova `Animais` na Turma A | 400 em `title` — o título continua ocupado, para a missão poder ser reativada sem conflito | RF-004 | Int | `routes/missionRoutes` | ✅ |
| CT-MISSION-036  | Edição mantendo o próprio título | `PATCH /missions/{quiz}` com o título atual e `xp_reward: 120` | 200 — a missão não conflita consigo mesma | RF-004 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-037  | Mover para turma que já tem o título | `quiz de cores` na Turma B; `PATCH /missions/{Quiz de Cores da Turma A}` só com `class_id` da Turma B | 400 em `title` — a checagem usa o título atual e a turma nova; a missão continua na Turma A e nenhuma turma muda o array `missions`. Sem conflito, a troca segue o CT-MISSION-014 | RF-004 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-038  | Título e turma alterados juntos | `PATCH` com `title` e `class_id` novos | a checagem usa o título novo na turma nova, excluindo a própria missão | RF-004 | Unit | `services/MissionService` | ✅ |
| CT-MISSION-039  | Turma conferida antes do título | `PATCH` com `class_id` de turma inexistente ou de outra professora, cujo título também conflitaria | 404 ou 403 da turma, e não 400 do título — a checagem de título nem chega a rodar | RF-004 | Unit | `services/MissionService` | ✅ |
| CT-MISSION-040  | Duplicata barrada pelo índice | duas requisições com o mesmo título na mesma turma passam juntas pela checagem (simulado deixando a checagem passar) | o índice único `{ class_id, title }`, com collation que ignora maiúsculas, recusa a segunda com E11000, e a resposta é o mesmo 400 em `title`; outros E11000 continuam 409 | RF-004 | Int | `routes/missionRoutes`, `utils/helpers/errorHandler` | ✅ |
| CT-MISSION-041  | Migração do índice | `npm run migrate:mission-title-index` num banco só com o índice antigo `title_1`; depois, de novo | apaga o `title_1` e cria o `class_id_1_title_1` (único, collation `pt`/strength 2); a segunda execução não muda nada; também roda num banco ainda sem a coleção | RF-004 | Int | `migrations/migrateMissionTitleIndex` | ✅ |
| CT-MISSION-042  | Migração com título repetido na turma | `Lesson 1` e `lesson 1` na mesma turma (o `title_1` diferencia maiúsculas e deixou passar) | lista as duplicatas (turma, títulos e ids) e aborta sem mexer em nenhum índice; o mesmo título em turmas diferentes não conta como duplicata | RF-004 | Int | `migrations/migrateMissionTitleIndex` | ✅ |

| CT-MISSION-043  | Enunciado no limite de caracteres | pergunta com exatamente 500 caracteres | aceito pelo schema de criação | RF-004 | Unit | `schemas/MissionSchema` | ✅ |
| CT-MISSION-044  | Enunciado acima do limite | pergunta com 501 caracteres | 400, "A pergunta pode ter no máximo 500 caracteres." | RF-004 | Unit | `schemas/MissionSchema` | ✅ |
| CT-MISSION-045  | Alternativa no limite de caracteres | alternativa com exatamente 200 caracteres | aceita pelo schema de criação | RF-004 | Unit | `schemas/MissionSchema` | ✅ |
| CT-MISSION-046  | Alternativa acima do limite | alternativa com 201 caracteres | 400, "Cada alternativa pode ter no máximo 200 caracteres." | RF-004 | Unit | `schemas/MissionSchema` | ✅ |
| CT-MISSION-047  | Limite também na edição | `PATCH /missions/{id}` com enunciado de 501 caracteres | 400 com a mesma mensagem — o limite está no schema da pergunta, usado no POST e no PATCH | RF-004 | Unit | `schemas/MissionSchema` | ✅ |

**Limite de caracteres (`CT-MISSION-043` a `047`).** O front usa os mesmos limites — 500 para o enunciado e 200 para cada alternativa —, e o backend os repete para valer também para quem chama a API direto. Os testes são de valor-limite: o valor exato passa e o valor + 1 é recusado. As constantes `QUESTION_MAX_LENGTH` e `OPTION_MAX_LENGTH` são exportadas pelo schema e usadas pelos testes, então mudar o limite não exige mexer neles.

**Título por turma (`CT-MISSION-007`, `025` e `034` a `042`).** O título é único dentro da turma, sem diferenciar maiúsculas, e missão desativada continua contando. A regra tem duas camadas: a checagem do `MissionService`, que dá a mensagem, e o índice único composto no banco, que fecha a corrida entre duas requisições simultâneas. Como o `autoIndex` fica desligado em produção, a troca do índice antigo pelo novo é feita pela migração do `CT-MISSION-041`, rodada uma vez depois do deploy (README, seção "Migrações").

---

## 5 - Progressão de XP e nível (`CT-XP`)

| ID         | Cenário                                | Entrada / passos                                                                     | Resultado esperado                                                                        | RF     | Nível | Suíte                                    | Situação |
| ---------- | -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ----- | ---------------------------------------- | -------- |
| CT-XP-001  | Quiz com todos os acertos              | `POST /missions/{id}/progress` com as 5 respostas corretas, `xp_reward: 100`          | 200, `score: 100`, `xp_earned: 100`; o XP do aluno sobe 100                                  | RF-005 | Int   | `routes/missionRoutes`                   | ✅       |
| CT-XP-002  | Quiz com acerto parcial                | 3 acertos em 5 questões, `xp_reward: 100`                                             | `score: 60` e `xp_earned: 60` — proporcional, arredondado                                    | RF-006 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-003  | Score enviado no corpo é ignorado      | todas as respostas erradas, com `score: 100` no corpo                                 | `score: 0` e `xp_earned: 0` — o servidor corrige contra o gabarito                           | RF-005 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-004  | Resubmissão sem melhora                | repetir a submissão que já pagou 100 XP                                               | 200 com `xp_earned: 0`, `already_rewarded: true`; o XP total não muda                        | RF-006 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-005  | Resubmissão com melhora                | primeira submissão 60%, segunda 100%                                                  | a segunda credita apenas a diferença (40), e `credited_so_far` fecha em 100                  | RF-006 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-006  | Missão inativa                         | submeter progresso em missão com `active: false`                                      | 400, "Esta missão está inativa."                                                             | RF-005 | Int   | `routes/missionRoutes`                   | ✅       |
| CT-XP-007  | Quantidade de respostas divergente     | 3 respostas para um quiz de 5 questões                                                | 400, "Envie exatamente 5 respostas, na ordem das questões."                                  | RF-005 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-008  | Missão antiga sem perguntas vale 100   | vocabulário ou áudio salvo sem `questions`, `done: true` e `score: 30` (ou sem `score`) no corpo | 200, `score: 100` e o `xp_reward` inteiro; o `score` do corpo é ignorado. Com `done: false`, `score: 0` | RF-005 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-009  | Subida de nível ao cruzar o limiar     | aluno com 0 XP recebendo 100 XP                                                       | nível passa de 1 para 2 e a resposta traz `leveled_up: true`                                 | RF-006 | Unit  | `utils/LevelHelper`, `services/ProgressionService`, `routes/missionRoutes` | ✅ |
| CT-XP-010  | Piso do nível com XP negativo          | cálculo de nível sobre XP 0 ou negativo (dado legado, anterior ao piso em 0)         | nível não cai abaixo de 1 e o cálculo trata XP negativo como 0                               | RF-006 | Unit  | `utils/LevelHelper`                      | ✅       |
| CT-XP-011  | Ajuste manual que adiciona XP          | `POST /xp-adjustments` com `alunoA` e `amount: 50`                                     | 201 com `amount: 50` e `xp_applied: 50`; o XP do aluno sobe 50                               | RF-013 | Int   | `routes/xpAdjustmentRoutes`, `services/XpAdjustmentService` | ✅ |
| CT-XP-012  | Ajuste manual que remove XP            | aluno com 80 XP, `amount: -30`                                                         | 201 com `xp_applied: -30`; o XP do aluno fica em 50                                          | RF-013 | Int   | `routes/xpAdjustmentRoutes`              | ✅       |
| CT-XP-013  | Remoção maior que o saldo              | aluno com 30 XP, `amount: -50`                                                         | 201 com `amount: -50` e `xp_applied: -30`; o XP para em 0, nunca negativo                     | RF-013 | Int   | `routes/xpAdjustmentRoutes`, `services/ProgressionService` | ✅ |
| CT-XP-014  | Remoções simultâneas                   | aluno com 30 XP, duas requisições de `amount: -20` em paralelo                         | as duas respondem 201, a soma dos `xp_applied` é -30 e o XP termina em 0 — o piso é atômico   | RF-013 | Int   | `routes/xpAdjustmentRoutes`              | ✅       |
| CT-XP-015  | Ajuste que sobe de nível               | aluno com 380 XP no nível 2, `amount: 50`                                              | `progression` com `previous_level: 2`, `level: 3`, `leveled_up: true`; nível gravado no aluno | RF-013 | Int   | `routes/xpAdjustmentRoutes`, `services/ProgressionService` | ✅ |
| CT-XP-016  | Ajuste que desce de nível              | aluno com 430 XP no nível 3, `amount: -500`                                            | `progression` com `previous_level: 3`, `level: 1`, `leveled_down: true`; nível gravado        | RF-013 | Int   | `routes/xpAdjustmentRoutes`, `services/ProgressionService` | ✅ |
| CT-XP-017  | Histórico de auditoria do ajuste       | ajuste com `reason: "  Saldo corrigido  "`                                             | `XpAdjustment` gravado com `student`, `teacher` (quem aplicou), `amount`, `xp_applied`, `reason` sem os espaços e `applied_at` | RF-013 | Int | `routes/xpAdjustmentRoutes` | ✅ |
| CT-XP-018  | Ajuste em aluno de outra turma         | `profA` ajustando `alunoB`, ou `semTurma`                                              | 403, "Você só pode ajustar o XP de alunos das suas turmas."; nada é gravado                  | RF-011 | Int   | `routes/xpAdjustmentRoutes`, `services/XpAdjustmentService` | ✅ |
| CT-XP-019  | Admin ajusta qualquer aluno            | `admin` ajustando `semTurma`                                                           | 201 — o admin não passa pela checagem de turma                                               | RF-011 | Int   | `routes/xpAdjustmentRoutes`              | ✅       |
| CT-XP-020  | Quantidade inválida                    | `amount` igual a 0, fora de ±10000, fracionado ou em texto; `reason` acima de 200 caracteres | 400 com o campo em `errors`, ex.: `{ path: "amount", message: "A quantidade não pode ser zero." }` | RF-013 | Unit | `controllers/XpAdjustmentController`, `routes/xpAdjustmentRoutes` | ✅ |
| CT-XP-021  | Ajuste em quem não é aluno             | `admin` ajustando `profB`                                                              | 400, "O usuário informado não é um aluno."; o XP do professor não muda                       | RF-013 | Int   | `routes/xpAdjustmentRoutes`              | ✅       |
| CT-XP-022  | Resubmissão com piora mantém a melhor nota | primeira submissão 100%, segunda 60%                                               | a resposta traz `score: 60` e `correct_answers: 3` da tentativa e `best_score: 100`; `mission_progress.score` continua 100 e nenhum XP é creditado | RF-006 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-023  | Resubmissão com melhora grava a nova nota | progresso anterior com 40%, nova submissão com 80%                                 | `mission_progress.score` passa a 80, `best_score: 80` e só a diferença (40 XP) é creditada  | RF-006 | Unit  | `services/MissionService`                | ✅       |
| CT-XP-024  | Missão concluída não volta a pendente  | progresso com `done: true`, nova submissão com `done: false`                           | `mission_progress.done` continua `true` e nenhum XP é creditado                              | RF-005 | Unit  | `services/MissionService`                | ✅       |
| CT-XP-025  | Vocabulário com perguntas, tudo certo  | vocabulário com 2 perguntas e `xp_reward: 60`, `answers` corretas                     | 200, `score: 100`, `correct_answers: 2`, `total_questions: 2`, `xp_earned: 60`               | RF-005 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-026  | Vocabulário com metade certa           | mesmo vocabulário, 1 acerto em 2                                                      | `score: 50` e `xp_earned: 30` — proporcional, como o quiz (CT-XP-002)                        | RF-006 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-027  | Só score, sem respostas                | mesmo vocabulário com `{ score: 100 }` no corpo                                       | 400, "Envie exatamente 2 respostas, na ordem das questões."; nenhum XP é creditado — fecha a brecha de concluir sem ver o conteúdo | RF-005 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-028  | Áudio com perguntas corrigido pelo gabarito | áudio com 3 perguntas e `xp_reward: 30`, 2 acertos e `score: 100` no corpo       | `score: 67`, `correct_answers: 2`, `xp_earned: 20`; o score do corpo é ignorado              | RF-005 | Int   | `routes/missionRoutes`                   | ✅       |
| CT-XP-029  | Aluno vê o próprio histórico | `GET /users/{id do alunoA}/xp-history` como `alunoA`, com atitude +10 (01/10), missão 80 XP (02/10), atitude -5 (03/10) e ajuste -3 (04/10) | 200 com os quatro itens da mais recente para a mais antiga: `adjustment`, `attitude`, `mission`, `attitude`; cada um com `id`, `kind`, `xp`, `title`, `detail` e `date` | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-030  | Atitude negativa no histórico | log da atitude "Atraso" com `xp_applied: -5` | item `kind: "attitude"` com `xp: -5`, `title: "Atraso"` e o nome de quem aplicou em `detail` | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-031  | Ajuste que bateu no piso | ajuste com `amount: -50` e `xp_applied: -3` (o aluno tinha 3 XP) | item `kind: "adjustment"` com `xp: -3` — o aplicado de fato, e não o pedido —, `title: "Ajuste de XP"`, o motivo em `detail` e quem ajustou em `teacher` | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-032  | Missão só entra se rendeu XP | `mission_progress` com uma missão de `xp_earned: 80` e outra de `xp_earned: 0` | só a primeira aparece: `id` da missão, `xp: 80`, o título em `title`, `detail: "Melhor nota: 80%"` e `date` igual ao `completed_at` | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-033  | Origem removida ou sem motivo | atitude e missão excluídas depois de render XP; ajuste sem `reason` | os itens continuam no histórico com `title: "Atitude removida"` e `"Missão removida"`; o ajuste vem com `detail: null` | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-034  | Aluno pede o histórico de outro | `GET /users/{id do alunoB}/xp-history` como `alunoA` | 403, "Você só pode ver o seu histórico de XP."; nada é consultado | RF-011 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-035  | Professor e aluno de outra turma | `profA` pedindo o histórico de `alunoB` ou de `semTurma` | 403, "Você só pode ver o histórico de XP de alunos das suas turmas."; o de `alunoA` responde 200 | RF-011 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-036  | Admin vê qualquer aluno | `admin` pedindo o histórico de `alunoB` | 200 — o admin não passa pela checagem de turma | RF-011 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-037  | Alvo que não é aluno | id de `profA`, id inexistente ou `abc` | 404, "Aluno não encontrado." — o id malformado não chega ao banco, onde viraria 500 | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-038  | Paginação | `?page=2&limit=3` com 4 itens; sem parâmetros; `limit=500`; `page=0&limit=abc` | página 2 com 1 item, `totalPages: 2`, `prevPage: 1` e `nextPage: null`; padrão `limit: 10`; `limit` limitado a 50; valores inválidos voltam ao padrão | RF-014 | Int   | `routes/xpHistoryRoutes`, `services/XpHistoryService` | ✅ |
| CT-XP-039  | Aluno sem XP | histórico de `semTurma`, que nunca ganhou XP | 200 com `docs: []`, `totalDocs: 0` e `totalPages: 1` | RF-014 | Int   | `routes/xpHistoryRoutes` | ✅ |
| CT-XP-040  | Aluno vê o próprio desempenho | `GET /users/{id do alunoA}/performance` como `alunoA`, com dois quizzes, um áudio e uma missão já excluída | 200 com a média das melhores notas por tipo e quantas missões entraram: `quiz: { score: 90, missions: 2 }`, `audio: { score: 60, missions: 1 }`, `vocabulary` sem nota; a missão excluída não conta | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-041  | Média da turma | mesmo cenário, com colegas ativos e um desativado na Turma A | `class` com a média das médias dos alunos **ativos** que têm nota no tipo, cada aluno pesando igual, e `students` dizendo quantos entraram | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-042  | Aluno sem progresso | desempenho de `alunoB`, que não concluiu nada | os três tipos com `score: null` e `missions: 0` — sem nota, e não nota 0 | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-043  | Aluno sem turma | desempenho de `semTurma` | 200 com `class: null`; os colegas nem são buscados | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-044  | Aluno pede o desempenho de outro | `GET /users/{id do alunoB}/performance` como `alunoA` | 403, "Você só pode ver o seu desempenho." | RF-011 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-045  | Professor, admin e turma alheia | `profA` pedindo `alunoA`, `alunoB` e `semTurma`; `admin` pedindo `alunoB` | 200 no aluno da turma dele; 403, "Você só pode ver o desempenho de alunos das suas turmas.", nos outros dois; o admin vê qualquer aluno | RF-011 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-046  | Alvo que não é aluno | id de `profA`, id inexistente ou `abc` | 404, "Aluno não encontrado." | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-047  | Filtro por período | `from=2026-10-01T00:00:00-04:00&to=2026-10-31T23:59:59-04:00`, com um quiz concluído em setembro e outro em outubro | só o de outubro entra, para o aluno e para a turma: `quiz: { score: 100, missions: 1 }` e `class.quiz: { score: 100, students: 1 }` | RF-015 | Int | `routes/performanceRoutes`, `services/PerformanceService` | ✅ |
| CT-XP-048  | Sem período usa tudo | mesmo cenário, sem `from` nem `to` | as duas missões entram: `quiz: { score: 70, missions: 2 }` | RF-015 | Int | `routes/performanceRoutes` | ✅ |
| CT-XP-049  | Período inválido | `from=2026-10-01` (sem hora e fuso); `from` depois de `to` | 400 com o erro em `from`; no invertido, 400 com `{ path: "to", message: "O início do período deve ser anterior ao fim." }` | RF-015 | Int | `routes/performanceRoutes` | ✅ |

O ajuste manual (`CT-XP-011` a `021`) e as atitudes aplicadas (`CT-ATT-018` a `022`) passam pela mesma atualização atômica com piso em 0, que grava em `xp_applied` o que foi aplicado de fato — pode ser menor que o `amount` pedido ou que o `xp_value` da atitude. Só a conclusão de missão soma pelo `$inc` direto, porque só credita XP positivo. O `CT-XP-010` continua valendo para dado legado: um aluno que já estava negativo antes do piso ainda tem o nível calculado como 1.

O histórico (`CT-XP-029` a `039`) lê esses mesmos registros: `xp_applied` dos logs de atitude e dos ajustes e `xp_earned` do `mission_progress`. Por isso o XP de cada item é o que entrou de fato no saldo do aluno, e não o valor pedido. As três origens vêm de duas coleções e de um array dentro do usuário, então a junção, a ordenação e a paginação são feitas em memória, no service.

O desempenho (`CT-XP-040` a `049`) é o dado do radar: a média das **melhores** notas do `mission_progress`, por tipo de missão. O tipo vem da missão, então uma missão excluída depois de feita sai da conta. A data usada pelo período é a da primeira conclusão que rendeu XP; uma missão concluída sem render XP não tem data e só aparece sem filtro de período.

A curva de nível é quadrática: nível _n_ exige `100 * (n - 1)²` de XP (nível 2 = 100, nível 3 = 400, nível 4 = 900), com teto no nível 50. Os casos `Unit` cobrem `LevelHelper` direto, sem HTTP — inclusive a coerência entre `xpForLevel` e `calculateLevel` ao longo de toda a curva, que é a propriedade que garante que os dois nunca discordem.

---

## 6 - Atitudes e atitudes aplicadas (`CT-ATT`)

| ID          | Cenário                                   | Entrada / passos                                                          | Resultado esperado                                                                     | RF     | Nível | Suíte                          | Situação |
| ----------- | ----------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------ | -------- |
| CT-ATT-001  | Professor cria atitude                    | `POST /attitudes` com nome, tipo e `xp_value`                              | 201, com `createdBy` preenchido e `active: true`                                          | RF-008 | Int   | `routes/attitudeRoutes`        | ✅       |
| CT-ATT-002  | Nome de atitude duplicado                 | nome já existente                                                          | 400, "Attitude já existe."                                                                | RF-008 | Int   | `routes/attitudeRoutes`        | ✅       |
| CT-ATT-003  | Professor tira atitude de circulação      | `PATCH /attitudes/{id}` com `{ active: false }`                            | 200; a atitude deixa de poder ser aplicada, mas o histórico é preservado                  | RF-008 | Int   | `routes/attitudeRoutes`        | ✅       |
| CT-ATT-004  | Professor exclui atitude                  | `DELETE /attitudes/{id}` como `profA`                                      | 403 — exclusão é exclusiva do admin, justamente para não órfãos nos logs                  | RF-011 | Int   | `routes/attitudeRoutes`        | ✅       |
| CT-ATT-005  | Admin exclui atitude                      | `DELETE /attitudes/{id}` como `admin`                                      | 200                                                                                       | RF-008 | Int   | `routes/attitudeRoutes`        | ✅       |
| CT-ATT-006  | Aplicação de atitude positiva             | `POST /attitude-logs` com aluno da turma do professor e atitude de +20 XP  | 201; XP do aluno sobe 20 e a resposta traz `progression` com o nível recalculado          | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-007  | Aplicação de atitude negativa             | aluno com saldo suficiente, atitude com `type: "negative"` e `xp_value: 20` | 201 com `xp_applied: -20`; o XP do aluno cai 20                                          | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-008  | Aluno de outra turma                      | `profA` aplicando em `alunoB`                                              | 403, "Você só pode aplicar atitudes a alunos das suas turmas."                            | RF-011 | Int   | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-ATT-009  | Aluno sem turma                           | `profA` aplicando em `semTurma`                                            | 403, mesma mensagem do CT-ATT-008                                                         | RF-011 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-010  | Admin aplica em qualquer aluno            | `admin` aplicando em `alunoB`                                              | 201 — o admin não passa pela checagem de turma                                            | RF-011 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-011  | Atitude inativa                           | aplicar atitude com `active: false`                                        | 400, "Esta atitude está inativa."                                                         | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-012  | Alvo que não é aluno                      | aplicar atitude em um professor                                            | 400, "O usuário informado não é um aluno."                                                | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-013  | Correção da atitude aplicada              | `PATCH /attitude-logs/{id}` trocando por atitude de outro valor            | 200; o XP do aluno é ajustado pela **diferença** entre o valor novo e o antigo             | RF-008 | Int   | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-ATT-014  | Correção por outro professor              | `profB` corrigindo log aplicado por `profA`                                | 403, "Teachers can only change logs they applied."                                        | RF-011 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-015  | Desfazer atitude estorna o XP             | `DELETE /attitude-logs/{id}` pelo autor                                    | 200; o XP volta exatamente ao valor anterior à aplicação                                  | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-016  | Exclusão por outro professor              | `profB` apagando log de `profA`                                            | 403, mesma mensagem do CT-ATT-014                                                         | RF-011 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-017  | Aluno lista atitudes aplicadas            | `GET /attitude-logs` como `alunoA`                                         | 403 — o histórico disciplinar não é exposto ao aluno                                      | RF-011 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-018  | Atitude negativa maior que o saldo        | aluno com 30 XP, atitude negativa de `xp_value: 50`                        | 201 com `xp_applied: -30`, gravado assim no log; o XP para em 0, nunca negativo           | RF-008 | Int   | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-ATT-019  | Atitude negativa em quem está com 0 XP    | aluno com 0 XP, atitude negativa de `xp_value: 5`                          | 201 com `xp_applied: 0`; o XP continua 0                                                  | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-020  | Correção que passa do saldo               | log de +10 em aluno que ficou com 4 XP, `PATCH` trocando por atitude de -5 | 200; a diferença pedida (-15) para em -4, o XP fica 0 e o log grava `xp_applied: 6` (10 - 4) | RF-008 | Int | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-ATT-021  | Estorno de positiva que passa do saldo    | log de +10 em aluno que ficou com 4 XP, `DELETE` do log                    | 200; o estorno de -10 para em 0                                                           | RF-008 | Int   | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-ATT-022  | Estorno de negativa que parou no piso     | aluno com 3 XP recebe atitude de -5 (`xp_applied: -3`), depois `DELETE`    | 200; o estorno devolve só os 3 descontados e o XP volta a 3                               | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
| CT-ATT-023  | Nome de atitude com parêntese             | `POST /attitudes` com `name: "Ajudou um colega (extra"`                    | 201 com o nome gravado como enviado, e não 500 por regex inválida                          | RF-008 | Int   | `routes/attitudeRoutes`, `repository/AttitudeRepository` | ✅ |
| CT-ATT-024  | Ponto no nome não gera duplicado falso    | `Leitura1` cadastrada; `POST /attitudes` com `name: "Leitura."`            | 201 — a checagem de duplicado compara o texto literal                                      | RF-008 | Int   | `routes/attitudeRoutes`        | ✅       |

---

## 7 - Ranking (`CT-RANK`)

| ID           | Cenário                            | Entrada / passos                                                    | Resultado esperado                                                              | RF     | Nível | Suíte                                        | Situação |
| ------------ | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | ----- | -------------------------------------------- | -------- |
| CT-RANK-001  | Ranking global                     | `GET /rankings/global`                                              | 200 com as entradas ordenadas por XP decrescente                                  | RF-007 | Int   | `routes/rankingRoutes`                       | ✅       |
| CT-RANK-002  | Corte no top 30                    | base com 35 alunos pontuados                                        | o ranking traz exatamente 30 entradas, as de maior XP                             | RF-007 | Unit  | `services/RankingService`, `routes/rankingRoutes` | ✅  |
| CT-RANK-003  | Atualização após mudança de XP     | aplicar atitude ou concluir missão e consultar o ranking             | a posição do aluno reflete o XP novo sem precisar de refresh manual               | RF-007 | Int   | `routes/missionRoutes`, `routes/attitudeLogRoutes`, `services/ProgressionService` | ✅ |
| CT-RANK-004  | Ranking da própria turma           | `GET /rankings/me` como `alunoA`                                    | 200 apenas com alunos da Turma A                                                  | RF-007 | Int   | `routes/rankingRoutes`                       | ✅       |
| CT-RANK-005  | Ranking da turma sem vínculo       | `GET /rankings/me` como `semTurma`                                  | 404, "Você não está matriculado em nenhuma turma."                                | RF-007 | Int   | `routes/rankingRoutes`, `services/RankingService` | ✅  |
| CT-RANK-006  | Ranking de turma alheia            | `GET /rankings/class/{Turma B}` como `alunoA`                       | 403, "Você só pode ver o ranking da sua própria turma."                           | RF-011 | Int   | `routes/rankingRoutes`, `services/RankingService` | ✅  |
| CT-RANK-007  | Recálculo pelo admin               | `POST /rankings/refresh`                                            | 200 com o ranking global e o de cada turma ativa refeitos a partir do XP atual    | RF-007 | Int   | `routes/rankingRoutes`                       | ✅       |
| CT-RANK-008  | Recálculo por professor            | `POST /rankings/refresh` como `profA`                               | 403                                                                               | RF-011 | Int   | `routes/rankingRoutes`                       | ✅       |

| CT-RANK-009  | Aluno fora do ranking global       | `alunoA` com `show_in_global_ranking: false`, e recálculo dos rankings | `alunoA` não aparece no ranking global, mas continua no da Turma A | RF-007 | Int   | `routes/rankingRoutes`, `repository/RankingRepository` | ✅ |
| CT-RANK-010  | Aluno antigo, sem o campo          | `alunoA` gravado sem `show_in_global_ranking`, e recálculo           | `alunoA` continua no ranking global — a ausência do campo vale como `true`        | RF-007 | Int   | `routes/rankingRoutes`                       | ✅       |
| CT-RANK-011  | Trocar a opção atualiza na hora    | `PATCH /users/{id do alunoA}` como `alunoA` com `show_in_global_ranking: false`, depois `true` | 200; o aluno sai do ranking global sem refresh manual e volta ao religar; se o recálculo falhar, a opção fica gravada e a falha vai para o log | RF-007 | Int   | `routes/userRoutes`, `services/UserService`  | ✅       |
| CT-RANK-012  | Quem pode trocar e valor inválido  | `profA` mudando a opção de `alunoA`; `alunoA` enviando `show_in_global_ranking: "não"` | 403 para a professora (só o próprio aluno ou o admin mudam); 400 com o erro em `show_in_global_ranking` para o valor não booleano | RF-011 | Int   | `routes/userRoutes`, `services/UserService`  | ✅       |

O `CT-RANK-003` é o caso que amarra os três módulos: quem credita o XP é o `ProgressionService`, e o que a suíte prova é que ele atualiza o ranking global e o da turma **na mesma operação** que grava o XP. Há ainda dois testes de resiliência em `services/ProgressionService` sem caso próprio no catálogo: falha ao montar o ranking não invalida o XP já aplicado, nem no global nem no de turma.

---

## 8 - Notificações (`CT-NOTIF`)

| ID            | Cenário                                  | Entrada / passos                                                                 | Resultado esperado                                                                                     | RF     | Nível | Suíte                                              | Situação |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ----- | -------------------------------------------------- | -------- |
| CT-NOTIF-001  | Atitude aplicada notifica o aluno        | `POST /attitude-logs` com a atitude "Participação" (+10) em `alunoA`              | uma notificação `type: "attitude"` para `alunoA`, não lida, com "Atitude registrada: Participação (+10 XP)." e `data: { xp: 10, attitude_log, attitude }` | RF-016 | Int | `routes/attitudeLogRoutes`, `services/AttitudeLogService` | ✅ |
| CT-NOTIF-002  | Mudança de nível na mensagem             | atitude ou ajuste que faz o aluno subir ou descer de nível                          | a mensagem termina com "Você subiu para o nível 4!" ou "Você voltou para o nível 2."; sem mudança, nada é acrescentado | RF-016 | Unit | `services/NotificationService` | ✅ |
| CT-NOTIF-003  | XP 0 por causa do piso não notifica       | atitude negativa em aluno com 0 XP                                                  | nenhuma notificação — o `xp_applied` foi 0                                                              | RF-016 | Int | `routes/attitudeLogRoutes`, `services/NotificationService` | ✅ |
| CT-NOTIF-004  | Correção de atitude                      | `PATCH /attitude-logs/{id}` trocando +10 por +25; outro PATCH sem trocar a atitude | a troca notifica "Uma atitude registrada foi alterada para ... (+15 XP)." — a diferença aplicada; sem troca, nada é notificado | RF-016 | Unit | `services/AttitudeLogService`, `services/NotificationService` | ✅ |
| CT-NOTIF-005  | Desfazer atitude                         | `DELETE /attitude-logs/{id}` de uma "Participação" (+10)                           | "A atitude Participação registrada para você foi removida (-10 XP)."; com a atitude já apagada, "Uma atitude registrada para você foi removida" | RF-016 | Int | `routes/attitudeLogRoutes`, `services/NotificationService` | ✅ |
| CT-NOTIF-006  | Ajuste manual de XP                      | `POST /xp-adjustments` com `amount: 50` e `reason: "Feira de idiomas"`             | uma notificação `type: "xp_adjustment"` com "Motivo: Feira de idiomas." e `data: { xp: 50, xp_adjustment }`; sem motivo, a frase do motivo some | RF-016 | Int | `routes/xpAdjustmentRoutes`, `services/NotificationService` | ✅ |
| CT-NOTIF-007  | Operação barrada não notifica            | atitude inativa, alvo que não é aluno, aluno de outra turma                         | o erro de sempre e nenhuma notificação                                                                   | RF-016 | Unit | `services/AttitudeLogService`, `services/XpAdjustmentService` | ✅ |
| CT-NOTIF-008  | Missão nova avisa a turma                | `POST /missions` na Turma A, que tem `alunoA` ativo e um aluno desativado           | só `alunoA` recebe `type: "new_mission"` com "Nova missão na turma Turma A: ... Vale até 30 XP." e `data: { mission }`; o desativado e `alunoB` não recebem | RF-016 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-NOTIF-009  | Falha ao notificar não derruba a operação | banco de notificações fora do ar ao criar, ou busca dos alunos falhando           | a operação principal (XP, missão) conclui normalmente e a falha vai para o log                          | RF-016 | Unit | `services/NotificationService`, `services/MissionService` | ✅ |
| CT-NOTIF-010  | Excluir missão apaga os avisos dela      | `DELETE /missions/{id}` com avisos dessa missão e de outra                          | os avisos da missão excluída somem; os da outra continuam                                               | RF-016 | Int | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-NOTIF-011  | Listagem só do usuário logado            | `GET /notifications` como `alunoA`, com 3 notificações dele e 1 de `alunoB`        | 200 com as 3 de `alunoA`, da mais recente para a mais antiga                                            | RF-016 | Int | `routes/notificationRoutes` | ✅ |
| CT-NOTIF-012  | Paginação                                | `?page=2&limit=2`; sem parâmetros; `limit=500`; `page=abc&limit=-3`                 | página 2 com 1 item e `totalPages: 2`; padrão `limit: 10`; `limit` limitado a 50; valores inválidos voltam ao padrão | RF-016 | Int | `routes/notificationRoutes`, `services/NotificationService` | ✅ |
| CT-NOTIF-013  | Contador de não lidas                    | `GET /notifications/unread-count` com 2 não lidas e 1 lida                          | 200 com `{ unread: 2 }`                                                                                 | RF-016 | Int | `routes/notificationRoutes` | ✅ |
| CT-NOTIF-014  | Marcar como lida                         | `PATCH /notifications/{id}/read` de uma não lida; de novo numa já lida               | 200 com `read: true`, gravado no banco; repetir também responde 200                                    | RF-016 | Int | `routes/notificationRoutes` | ✅ |
| CT-NOTIF-015  | Notificação de outro usuário             | `alunoA` marcando uma notificação de `alunoB`                                       | 404, "Recurso não encontrado em Notification."; a notificação continua não lida                          | RF-011 | Int | `routes/notificationRoutes`, `repository/NotificationRepository` | ✅ |
| CT-NOTIF-016  | Id inexistente ou malformado             | `PATCH /notifications/{id inexistente}/read` e `/notifications/abc/read`            | 404 nos dois — o id malformado não chega ao banco, onde viraria 500                                     | RF-016 | Int | `routes/notificationRoutes`, `services/NotificationService` | ✅ |
| CT-NOTIF-017  | Marcar todas como lidas                  | `PATCH /notifications/read-all` como `alunoA`                                       | 200 com `{ updated: 2 }`; todas as de `alunoA` ficam lidas e as de `alunoB` não mudam                    | RF-016 | Int | `routes/notificationRoutes` | ✅ |
| CT-NOTIF-018  | Migração dos índices                     | `npm run migrate:notification-indexes` num banco só com o `_id_`; depois, de novo  | cria `user_1_read_1_createdAt_-1` e o TTL `createdAt_1` com 90 dias; a segunda execução não muda nada   | RF-016 | Int | `migrations/migrateNotificationIndexes` | ✅ |
| CT-NOTIF-019  | Sem autenticação                         | `GET /notifications` sem token                                                       | 498                                                                                                      | RF-011 | Int | `routes/notificationRoutes` | ✅ |

**Quem recebe e quando.** As notificações avisam o aluno do que acontece com ele **sem que ele esteja olhando**: atitude aplicada, corrigida ou desfeita, ajuste manual e missão nova na turma. O XP de missão concluída não notifica, porque o próprio aluno acabou de ver o resultado na tela. O XP informado é sempre o aplicado de fato (`xp_applied`), e quando o piso o deixa em 0 nada é notificado (`CT-NOTIF-003`).

**Dono pela rota, e não pelo id.** Nenhuma rota recebe o id do usuário: o dono é sempre o do token. Por isso `CT-NOTIF-015` responde 404, e não 403 — responder 403 diria que aquele id existe para outra pessoa. O filtro por `_id` **e** `user` está na própria consulta do repositório, então não há busca seguida de comparação.

**Notificação nunca derruba a operação (`CT-NOTIF-009`).** A gravação da notificação é feita depois do XP ou da missão e fica dentro de um `try/catch` que só registra no log, no mesmo padrão do recálculo do ranking (`CT-RANK-003`).

**Índices e TTL (`CT-NOTIF-018`).** Com o `autoIndex` desligado em produção, nem o índice da listagem nem o TTL de 90 dias existem até a migração rodar; ela vai na seção "Migrações" do README.

---

## 9 - Matriz de permissões (`CT-PERM`)

Uma linha por operação da API. Cada célula é o status esperado para um token **ativo** daquele papel. Onde há posse, a célula traz os dois desfechos. O critério que decide entre ✅ e ⬜ está descrito em "Como ler este documento".

**Regra transversal**: qualquer conta com `active: false` recebe **403** em toda rota que passa pelo `authorize`, mesmo com token ainda válido (`CT-PERM-040`). As exceções são `change-password`, que é self-service e não passa pelo `authorize`, e `logout`, que é público e identifica a sessão pelo refresh token do corpo — decisão de projeto, para que o usuário consiga trocar a senha e encerrar a sessão mesmo com a conta desativada ou o access token expirado.

| ID           | Operação                          | student                         | teacher                              | admin | Suíte                       | Situação |
| ------------ | --------------------------------- | ------------------------------- | ------------------------------------ | ----- | --------------------------- | -------- |
| CT-PERM-001  | `POST /auth/login`                | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-002  | `POST /auth/register-student`     | 403                             | 201 na própria turma / 403 turma de outro | 201 | `routes/authRoutes`         | ✅       |
| CT-PERM-003  | `POST /auth/refresh`              | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-004  | `POST /auth/forgot-password`      | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-005  | `POST /auth/reset-password`       | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-006  | `PATCH /auth/change-password`     | 200                             | 200                                  | 200   | `routes/authRoutes`         | ✅       |
| CT-PERM-007  | `POST /auth/logout`               | público                         | público                              | público | `routes/authRoutes`         | ✅       |
| CT-PERM-008  | `POST /auth/revoke/{userId}`      | 403                             | 403                                  | 200   | `routes/authRoutes`         | ✅       |
| CT-PERM-009  | `GET /users`                      | 403                             | 200 / 403 com `class` de outra turma ou `class=none` | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-010  | `POST /users`                     | 403                             | 201 aluno na própria turma / 403 teacher, admin ou turma de outro | 201 | `routes/userRoutes`         | ✅       |
| CT-PERM-011  | `GET /users/{id}`                 | 200 próprio / 403 outro         | 200                                  | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-012  | `PATCH /users/{id}`               | 200 próprio / 403 outro         | 200 próprio / 403 outro              | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-013  | `DELETE /users/{id}`              | 200 próprio / 403 outro         | 200 aluno da própria turma e próprio / 403 privilegiado ou aluno de outra turma | 200 | `routes/userRoutes`         | ✅       |
| CT-PERM-014  | `POST /users/recalculate-levels`  | 403                             | 403                                  | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-015  | `GET /classes`                    | 200 só a própria turma          | 200                                  | 200   | `routes/classRoutes`        | ✅       |
| CT-PERM-016  | `POST /classes`                   | 403                             | 201                                  | 201   | `routes/classRoutes`        | ✅       |
| CT-PERM-017  | `GET /classes/{id}`               | 200 própria / 403 outra         | 200                                  | 200   | `routes/classRoutes`        | ✅       |
| CT-PERM-018  | `PATCH /classes/{id}`             | 403                             | 200 própria / 403 de outro           | 200   | `routes/classRoutes`        | ✅       |
| CT-PERM-019  | `DELETE /classes/{id}`            | 403                             | 403                                  | 200   | `routes/classRoutes`        | ✅       |
| CT-PERM-020  | `GET /missions`                   | 200 turma dele, sem gabarito    | 200 com gabarito                     | 200   | `routes/missionRoutes`      | ✅       |
| CT-PERM-021  | `POST /missions`                  | 403                             | 201 turma dele / 403 turma de outro  | 201   | `routes/missionRoutes`      | ✅       |
| CT-PERM-022  | `GET /missions/{id}`              | 200 turma dele / 403 outra      | 200                                  | 200   | `routes/missionRoutes`      | ✅       |
| CT-PERM-023  | `PATCH /missions/{id}`            | 403                             | 200 se criou / 403 se não            | 200   | `routes/missionRoutes`      | ✅       |
| CT-PERM-024  | `DELETE /missions/{id}`           | 403                             | 200 se criou / 403 se não            | 200   | `routes/missionRoutes`      | ✅       |
| CT-PERM-025  | `POST /missions/{id}/progress`    | 200 turma dele / 403 outra      | 403                                  | 403   | `routes/missionRoutes`      | ✅       |
| CT-PERM-026  | `GET /attitudes`                  | 200                             | 200                                  | 200   | `routes/attitudeRoutes`     | ✅       |
| CT-PERM-027  | `POST /attitudes`                 | 403                             | 201                                  | 201   | `routes/attitudeRoutes`     | ✅       |
| CT-PERM-028  | `GET /attitudes/{id}`             | 200                             | 200                                  | 200   | `routes/attitudeRoutes`     | ✅       |
| CT-PERM-029  | `PATCH /attitudes/{id}`           | 403                             | 200                                  | 200   | `routes/attitudeRoutes`     | ✅       |
| CT-PERM-030  | `DELETE /attitudes/{id}`          | 403                             | 403                                  | 200   | `routes/attitudeRoutes`     | ✅       |
| CT-PERM-031  | `GET /attitude-logs`              | 403                             | 200                                  | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-032  | `POST /attitude-logs`             | 403                             | 201 aluno da turma dele / 403 outro  | 201   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-033  | `GET /attitude-logs/{id}`         | 403                             | 200                                  | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-034  | `PATCH /attitude-logs/{id}`       | 403                             | 200 se aplicou / 403 se não          | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-035  | `DELETE /attitude-logs/{id}`      | 403                             | 200 se aplicou / 403 se não          | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-036  | `GET /rankings/global`            | 200                             | 200                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-037  | `GET /rankings/me`                | 200 / 404 sem turma             | 404 sem turma                        | 404 sem turma | `routes/rankingRoutes` | ✅     |
| CT-PERM-038  | `GET /rankings/class/{classId}`   | 200 própria / 403 outra         | 200                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-039  | `POST /rankings/refresh`          | 403                             | 403                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-040  | Conta desativada em rota protegida | 403                            | 403                                  | 403   | `routes/userRoutes`         | ✅       |
| CT-PERM-041  | `POST /xp-adjustments`            | 403                             | 201 aluno da turma dele / 403 outro  | 201   | `routes/xpAdjustmentRoutes` | ✅       |
| CT-PERM-042  | `GET /users/{id}/xp-history`      | 200 próprio / 403 outro         | 200 aluno da turma dele / 403 outro  | 200   | `routes/xpHistoryRoutes`    | ✅       |
| CT-PERM-043  | `GET /users/{id}/performance`     | 200 próprio / 403 outro         | 200 aluno da turma dele / 403 outro  | 200   | `routes/performanceRoutes`  | ✅       |
| CT-PERM-044  | `GET /notifications`              | 200 (só as próprias)            | 200 (só as próprias)                 | 200 (só as próprias) | `routes/notificationRoutes` | ✅ |
| CT-PERM-045  | `GET /notifications/unread-count` | 200 (só as próprias)            | 200 (só as próprias)                 | 200 (só as próprias) | `routes/notificationRoutes` | ✅ |
| CT-PERM-046  | `PATCH /notifications/read-all`   | 200 (só as próprias)            | 200 (só as próprias)                 | 200 (só as próprias) | `routes/notificationRoutes` | ✅ |
| CT-PERM-047  | `PATCH /notifications/{id}/read`  | 200 própria / 404 de outro      | 200 própria / 404 de outro           | 200 própria / 404 de outro | `routes/notificationRoutes` | ✅ |

**Matriz completa.** Desde a v2.18 todas as operações têm a célula restritiva exercida, e as cinco linhas novas da v2.19 entraram completas. As rotas de notificação não restringem papel — o que restringe é a posse, sempre pelo usuário do token —, e a célula restritiva do `CT-PERM-047` é o 404 do `CT-NOTIF-015`. A última célula restritiva a ser coberta antes delas foi a do `CT-PERM-033`: o teste chama `GET /attitude-logs/{id}` com o token do próprio aluno que recebeu a atitude, o caso mais forte, porque é o único aluno com algum vínculo com o log, e espera 403.

---

## 10 - Fluxos ponta a ponta (`CT-E2E`)

Nenhum dos quatro está automatizado. A suíte atual cobre cada endpoint isoladamente, e mesmo os testes de rota que encadeiam duas ou três chamadas o fazem dentro de um só módulo. Estes casos existem para provar que os módulos se compõem — é o nível onde erro de integração entre XP, ranking e progresso apareceria.

### CT-E2E-001: ciclo completo de turma — ⬜

1. `admin` cria o professor; `profA` faz login.
2. `profA` cria a Turma A.
3. `profA` cadastra `alunoA` pelo `register-student`, já vinculado à Turma A.
4. `profA` cria um quiz de 5 questões com `xp_reward: 100` na Turma A.
5. `alunoA` lista as missões e recebe o quiz **sem** o gabarito.
6. `alunoA` submete as 5 respostas corretas.
7. **Verificar**: XP do aluno em 100, nível 2, `progression.leveled_up: true` e o aluno presente no ranking da Turma A e no global.

### CT-E2E-002: onboarding do aluno — ⬜

1. `profA` cadastra o aluno pelo `register-student` — a conta nasce sem senha utilizável.
2. O aluno usa o código recebido no `reset-password` para definir a senha.
3. O aluno faz login com a senha nova.
4. **Verificar**: consegue ver a própria turma e as missões dela, e recebe 403 ao tentar `GET /users`.

### CT-E2E-003: correção de atitude aplicada por engano — ⬜

1. `profA` aplica uma atitude de +20 XP em `alunoA` (XP inicial conhecido).
2. `profA` corrige o log, trocando por uma atitude de -10 XP.
3. `profA` desfaz o log.
4. **Verificar**: o XP volta exatamente ao valor inicial, sem resíduo, e o ranking acompanha cada passo.

### CT-E2E-004: desativação de conta — ⬜

1. `alunoA` faz login e guarda o token.
2. `admin` desativa a conta (`PATCH /users/{id}` com `active: false`).
3. `alunoA` tenta usar o token que já tinha.
4. `alunoA` tenta fazer login de novo.
5. **Verificar**: passo 3 responde 403 ("Conta bloqueada...") e passo 4 responde 401 com a mesma mensagem.

---

## 11 - Casos bloqueados

| ID          | Cenário                              | Depende de                                                          | RF     | Situação |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------- | ------ | -------- |
| CT-STREAK-001 | Streak diária de atividade         | Falta o campo `last_activity_at` no model e a regra de atualização      | RF-009 | ⛔       |

Casos bloqueados não contam como falha nem entram no cálculo de cobertura. Eles ficam registrados para que a lacuna seja uma decisão consciente, e não um esquecimento.

O `CT-RATE-001` saiu desta tabela na v2.14: o rate limit foi implementado (RNF-007) e o caso foi substituído pelos `CT-AUTH-040` a `050`.

O `CT-BADGE-001` (badge no primeiro login) e o `CT-BADGE-002` (badge ao atingir 100 XP) saíram desta tabela na v2.16 por estarem **fora do escopo do backend**: eles testavam a concessão de badge pela API, que não vai existir. As conquistas do RF-009 são calculadas no frontend a partir do `mission_progress` do `GET /users/{id}`, sem gravar nada no campo `badges`, e por isso a regra é verificada lá, e não neste catálogo.

## 12 - Resumo

Situação em 29/10/2026, com a suíte em **68 arquivos de teste e 1483 testes**, executando em cerca de 8 a 12 segundos.

| Módulo                        | Prefixo      | Casos | ✅ Automatizados | ⬜ Pendentes |
| ----------------------------- | ------------ | ----- | ---------------- | ------------ |
| Autenticação e sessão         | `CT-AUTH`    | 51    | 51               | 0            |
| Usuários                      | `CT-USER`    | 37    | 37               | 0            |
| Turmas                        | `CT-CLASS`   | 28    | 28               | 0            |
| Missões                       | `CT-MISSION` | 47    | 47               | 0            |
| Progressão de XP e nível      | `CT-XP`      | 49    | 49               | 0            |
| Atitudes e atitudes aplicadas | `CT-ATT`     | 24    | 24               | 0            |
| Ranking                       | `CT-RANK`    | 12    | 12               | 0            |
| Notificações                  | `CT-NOTIF`   | 19    | 19               | 0            |
| Matriz de permissões          | `CT-PERM`    | 47    | 47               | 0            |
| Fluxos ponta a ponta          | `CT-E2E`     | 4     | 0                | 4            |
| **Total**                     | -            | **318** | **314 (98,7%)** | **4**        |

O caso bloqueado da seção 11 não entra nesta contagem.

### As quatro pendências

1. **CT-E2E-001 a 004** — os quatro fluxos ponta a ponta.

### Rastreabilidade entre catálogo e suíte

A coluna **Suíte** liga cada caso ao arquivo que o cobre, mas o elo ainda é externo à suíte: **nenhum teste cita o ID do caso no `describe`/`it`**. A convenção proposta continua valendo e é o próximo passo do rastreio:

```js
it("CT-MISSION-010: aluno recebe a missão sem o gabarito", async() => { ... });
```

Enquanto os IDs não estiverem nos nomes dos testes, uma falha na execução aponta o comportamento quebrado, mas não o caso de teste correspondente — o caminho de volta precisa desta tabela.

### Casos exercidos pela suíte sem entrada no catálogo

A suíte é mais larga que este documento: cobre filtros de listagem, paginação, populate, campos descartados pelos schemas, resiliência do ranking, e as classes de erro e helpers de resposta. Esses testes não têm ID porque não descrevem regra de negócio do produto — são a malha de proteção em volta dela. O catálogo cataloga requisito; a suíte protege implementação. Os dois não precisam ter o mesmo tamanho.
