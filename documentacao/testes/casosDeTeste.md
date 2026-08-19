# Catálogo de Casos de Teste

**LevelUp English - Plataforma Gamificada de Aprendizado de Inglês**

_versão 2.0 — complementa o [Plano de Teste](planoTeste.md) v2.0_

## Histórico das alterações

| Data       | Versão | Descrição                                                                                                  | Autor(a)      |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------ | ------------- |
| 14/08/2026 | 1.0    | Primeira versão do catálogo, extraída do comportamento atual da API                                          | Matheus Lucas |
| 19/08/2026 | 2.0    | Suíte automatizada implementada: cada caso passa a apontar a suíte que o cobre; situações e status revisados | Matheus Lucas |

## Como ler este documento

Cada caso tem um identificador estável (`CT-<MÓDULO>-<NNN>`), que é o que aparece no relatório de bug e no rastreio da suíte.

**Nível**: `Unit` (lógica isolada, com dublês), `Int` (requisição HTTP real contra banco em memória), `E2E` (vários endpoints encadeados).

**Suíte**: o arquivo que cobre o caso, relativo a `src/tests/`. É a coluna de rastreabilidade — dado um caso, ela diz onde ele é verificado; dada uma falha na suíte, o caminho inverso diz qual regra de negócio quebrou.

**Situação**:

- ✅ — **automatizado**: coberto pela suíte, executado a cada `npm run test`.
- ⬜ — **pendente**: cenário descrito e válido, ainda sem teste que o exercite.
- ⛔ — **bloqueado**: depende de funcionalidade que ainda não existe (seção 10).

Todos os casos de nível `Int` pressupõem banco limpo, cenário montado pelas factories e token obtido pelo helper de autenticação. Onde não se diz o contrário, o corpo da resposta segue o envelope padrão `{ message, data, errors }`.

### Critério de cobertura da matriz de permissões

A seção 8 tem três células por operação (student / teacher / admin). Um caso da matriz é considerado **automatizado** quando:

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

Token ausente, malformado ou expirado responde **498**, e não 401. O 498 ("Invalid Token") não é do padrão HTTP — vem da convenção herdada do projeto base e está materializado em `AuthenticationError`, `TokenExpiredError` e em `HttpStatusCodes.INVALID_TOKEN`. O 401 fica reservado para o que é credencial recusada com token bem formado: login errado, refresh já rotacionado e sessão encerrada. A v1.0 deste catálogo documentava 401 nos três casos de token; a correção está nos casos `CT-AUTH-010` a `CT-AUTH-012`.

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
| CT-AUTH-009  | Logout encerra a sessão                | `POST /auth/logout` e depois qualquer rota autenticada              | logout 200; a requisição seguinte com o mesmo access token responde 401                  | RF-010 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-010  | Requisição sem token                   | rota autenticada sem cabeçalho `Authorization`                      | **498**, "O token de autenticação não existe!"                                           | RF-011 | Int   | `routes/authRoutes` e as 6 demais suítes de rota | ✅ |
| CT-AUTH-011  | Token malformado                       | `Authorization: Token abc`, ou Bearer sem valor                     | **498**, "Formato do token de autenticação inválido!"                                    | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-012  | Token expirado                         | access token com `exp` no passado                                   | **498**, "O token JWT está expirado!"                                                    | RF-011 | Int   | —                                  | ⬜       |
| CT-AUTH-013  | Troca de senha pelo próprio usuário    | `PATCH /auth/change-password` com a senha atual correta             | 200; o login passa a funcionar com a nova senha e falha com a antiga                     | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-014  | Troca de senha com senha atual errada  | `currentPassword` incorreta                                         | 401, "Senha atual incorreta."; a senha no banco não muda                                 | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-015  | Recuperação de senha, e-mail existente | `POST /auth/forgot-password`                                        | 200; código de recuperação gravado com validade de 30 minutos                            | RF-002 | Int   | `routes/authRoutes`, `services/AuthService` | ✅ |
| CT-AUTH-016  | Recuperação com e-mail inexistente     | e-mail fora da base                                                 | 200 silencioso, sem código gravado e sem revelar que a conta não existe                  | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-017  | Redefinição com código válido          | `POST /auth/reset-password` com o código recebido                   | 200; login com a nova senha funciona e o código é invalidado após o uso                  | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-018  | Redefinição com código expirado        | código com `exp_password_recovery_code` no passado                  | 400, "Código de recuperação inválido ou expirado."                                       | RF-002 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-019  | Cadastro de aluno pelo professor       | `POST /auth/register-student` com nome, e-mail e turma              | 201, usuário criado com `role: "student"`, sem senha definida e com e-mail de boas-vindas | RF-001 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-020  | Cadastro com e-mail duplicado          | e-mail já usado por outro usuário                                   | 400, "Este e-mail já está cadastrado."                                                   | RF-001 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-021  | Cadastro de aluno por aluno            | `alunoA` chamando `register-student`                                | 403, "Permissão insuficiente para executar a operação."                                  | RF-011 | Int   | `routes/authRoutes`                | ✅       |
| CT-AUTH-022  | Revogação de sessão pelo admin         | `POST /auth/revoke/{userId}` sobre uma sessão ativa                 | 200; o token do alvo deixa de ser aceito na requisição seguinte                          | RF-010 | Int   | `routes/authRoutes`                | ✅       |

**Pendência do módulo.** O `CT-AUTH-012` é o único caso de autenticação sem teste. Ele é o caminho que passa pelo `else if (err.name === "TokenExpiredError")` do `AuthMiddleware`, e forçá-lo exige assinar um access token com `expiresIn` negativo — não dá para esperar o token vencer dentro da suíte. A classe `TokenExpiredError` já tem teste próprio em `utils/errors/TokenExpiredError`, mas o caminho da rota, do token vencido até o corpo da resposta, não é exercido por ninguém.

---

## 2 - Usuários (`CT-USER`)

| ID           | Cenário                              | Entrada / passos                                                        | Resultado esperado                                                                     | RF     | Nível | Suíte                 | Situação |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ | ----- | --------------------- | -------- |
| CT-USER-001  | Listagem com filtro e paginação      | `GET /users?role=student&active=true&page=1&limit=10` como admin        | 200, apenas alunos ativos, no máximo 10 por página, com metadados de paginação            | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-002  | Listagem por aluno                   | `GET /users` com token de `alunoA`                                      | 403 — a base inteira não é visível para aluno                                             | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-003  | Aluno consulta o próprio perfil      | `GET /users/{id do alunoA}` como `alunoA`                               | 200 com os dados dele, sem `password`                                                     | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-004  | Aluno consulta perfil alheio         | `GET /users/{id do alunoB}` como `alunoA`                               | 403, "Students can only view their own profile."                                          | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-005  | Consulta de usuário inexistente      | id válido que não existe                                                | 404, "Recurso não encontrado em User."                                                    | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-006  | Professor cria aluno                 | `POST /users` com `role: "student"` e senha                             | 201; a senha é gravada com hash bcrypt e nunca retorna na resposta                        | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-007  | Professor tenta criar admin          | `POST /users` com `role: "admin"`                                       | 403, "Only admins can create users with a role other than student."                       | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-008  | Criação com e-mail duplicado         | e-mail já cadastrado                                                    | 400, "Email already registered."                                                          | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-009  | Atualização do próprio perfil        | `PATCH /users/{próprio id}` com `{ name }`                              | 200 com o nome atualizado                                                                 | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-010  | Atualização de perfil alheio         | `alunoA` alterando `alunoB`; professor alterando outro usuário          | 403, "You do not have permission to update another user."                                 | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-011  | Escalada de privilégio pelo PATCH    | `alunoA` envia `{ role: "admin", xp: 99999, class, active }` no próprio  | 200, porém os quatro campos são descartados: papel, XP, turma e situação seguem iguais    | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-012  | Aluno exclui a própria conta         | `DELETE /users/{próprio id}` como `alunoB`                              | 200 e o usuário some da base                                                              | RF-001 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-013  | Aluno exclui conta alheia            | `alunoA` excluindo `alunoB`                                             | 403, "Students can only delete their own account."                                        | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-014  | Professor exclui conta de admin      | `profA` excluindo `admin`                                               | 403, "Teachers can only delete student accounts."                                         | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-015  | Professor exclui outro professor     | `profA` excluindo `profB`                                               | 403, mesma mensagem do CT-USER-014                                                        | RF-011 | Int   | `routes/userRoutes`, `services/UserService` | ✅ |
| CT-USER-016  | Professor exclui aluno               | `profA` excluindo `alunoA`                                              | 200 e o aluno some da base                                                                | RF-011 | Int   | `routes/userRoutes`   | ✅       |
| CT-USER-017  | Recálculo de níveis pelo admin       | `POST /users/recalculate-levels` com usuários de nível defasado          | 200 e `updated` igual à quantidade de usuários corrigidos                                 | RF-006 | Int   | `routes/userRoutes`   | ✅       |

---

## 3 - Turmas (`CT-CLASS`)

| ID            | Cenário                                | Entrada / passos                                             | Resultado esperado                                                              | RF     | Nível | Suíte                  | Situação |
| ------------- | -------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ | ----- | ---------------------- | -------- |
| CT-CLASS-001  | Professor cria turma                   | `POST /classes` com `{ name }`                                | 201 com `teacher` preenchido com o id de quem criou, ignorando o que veio no corpo | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-002  | Nome de turma duplicado                | nome já existente, com outra caixa (`turma a` x `Turma A`)    | 400, "Class já existe." — a validação é insensível a maiúsculas                    | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-003  | Listagem por admin                     | `GET /classes?page=1&limit=10`                                | 200 com todas as turmas paginadas e o professor populado                          | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-004  | Listagem por aluno                     | `GET /classes` como `alunoA`                                  | 200 contendo exatamente uma turma: a dele                                         | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-005  | Aluno forçando outra turma na query    | `GET /classes?id={id da Turma B}` como `alunoA`               | 200 ainda com a Turma A — o filtro do aluno prevalece sobre a querystring          | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-006  | Aluno consulta turma alheia por id     | `GET /classes/{id da Turma B}` como `alunoA`                  | 403, "Students can only view their own class."                                    | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-007  | Aluno sem turma lista turmas           | `GET /classes` como `semTurma`                                | 200 com lista vazia, sem erro                                                     | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-008  | Professor atualiza a própria turma     | `PATCH /classes/{Turma A}` como `profA`                       | 200 com os dados atualizados                                                      | RF-003 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-009  | Professor atualiza turma alheia        | `PATCH /classes/{Turma B}` como `profA`                       | 403, "Teachers can only update their own classes."                                | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-010  | Professor tenta trocar o dono da turma | `PATCH` da própria turma enviando outro `teacher`             | 200, porém o campo `teacher` é descartado e a turma continua com o mesmo dono      | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-011  | Professor exclui turma                 | `DELETE /classes/{Turma A}` como `profA`                      | 403 — a exclusão é exclusiva do admin                                             | RF-011 | Int   | `routes/classRoutes`   | ✅       |
| CT-CLASS-012  | Admin exclui turma                     | `DELETE /classes/{Turma A}` como `admin`                      | 200 e a turma some da base                                                        | RF-003 | Int   | `routes/classRoutes`   | ✅       |

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
| CT-MISSION-007  | Título de missão duplicado               | título já usado por outra missão                                           | 400, "Título já cadastrado."                                                                 | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-008  | Listagem pelo aluno                      | `GET /missions` como `alunoA`, com missões nas duas turmas                 | 200 apenas com as missões da Turma A, e **sem** `questions[].correct_answer`                 | RF-012 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-009  | Listagem pelo professor                  | `GET /missions` como `profA`                                              | 200 com o gabarito presente nas questões                                                     | RF-012 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-010  | Aluno abre missão da própria turma       | `GET /missions/{id}` como `alunoA`                                        | 200 com `question` e `options` preservados e `correct_answer` ausente                        | RF-012 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-011  | Aluno abre missão de outra turma         | `GET /missions/{missão da Turma B}` como `alunoA`                         | 403, "Você não tem acesso a esta missão."                                                    | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-012  | Professor edita missão que criou         | `PATCH /missions/{id}` como autor                                         | 200 com os campos atualizados                                                                | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-013  | Professor edita missão de outro          | `PATCH /missions/{missão do profA}` como `profB`                          | 403, "Você só pode editar missões que criou."                                                | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-014  | Troca da turma da missão                 | `PATCH` alterando `class_id` para outra turma do mesmo professor          | 200; o id sai do array `missions` da turma antiga e entra no da nova                          | RF-004 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-MISSION-015  | Exclusão pelo autor                      | `DELETE /missions/{id}` como autor                                        | 200; a missão some e o id é removido do array `missions` da turma                            | RF-004 | Int   | `routes/missionRoutes`                    | ✅       |
| CT-MISSION-016  | Exclusão por outro professor             | `DELETE /missions/{missão do profA}` como `profB`                         | 403, "Você só pode excluir missões que criou."                                               | RF-011 | Int   | `routes/missionRoutes`                    | ✅       |

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
| CT-XP-008  | Missão sem quiz exige score            | `type: "vocabulary"` sem `score` no corpo                                             | 400, "O score é obrigatório para missões que não são do tipo quiz."                          | RF-005 | Int   | `routes/missionRoutes`, `services/MissionService` | ✅ |
| CT-XP-009  | Subida de nível ao cruzar o limiar     | aluno com 0 XP recebendo 100 XP                                                       | nível passa de 1 para 2 e a resposta traz `leveled_up: true`                                 | RF-006 | Unit  | `utils/LevelHelper`, `services/ProgressionService`, `routes/missionRoutes` | ✅ |
| CT-XP-010  | Piso do nível com XP negativo          | aluno com XP baixo recebendo atitude negativa que zera ou negativa o total            | nível não cai abaixo de 1 e o cálculo trata XP negativo como 0                               | RF-006 | Unit  | `utils/LevelHelper`                      | ✅       |

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
| CT-ATT-007  | Aplicação de atitude negativa             | atitude com `type: "negative"` e `xp_value: 20`                            | 201 com `xp_applied: -20`; o XP do aluno cai 20                                           | RF-008 | Int   | `routes/attitudeLogRoutes`     | ✅       |
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

O `CT-RANK-003` é o caso que amarra os três módulos: quem credita o XP é o `ProgressionService`, e o que a suíte prova é que ele atualiza o ranking global e o da turma **na mesma operação** que grava o XP. Há ainda dois testes de resiliência em `services/ProgressionService` sem caso próprio no catálogo: falha ao montar o ranking não invalida o XP já aplicado, nem no global nem no de turma.

---

## 8 - Matriz de permissões (`CT-PERM`)

Uma linha por operação da API. Cada célula é o status esperado para um token **ativo** daquele papel. Onde há posse, a célula traz os dois desfechos. O critério que decide entre ✅ e ⬜ está descrito em "Como ler este documento".

**Regra transversal**: qualquer conta com `active: false` recebe **403** em toda rota que passa pelo `authorize`, mesmo com token ainda válido (`CT-PERM-040`). As exceções são `change-password` e `logout`, que são self-service e não passam pelo `authorize` — decisão de projeto, para que o usuário consiga encerrar a sessão e trocar a senha.

| ID           | Operação                          | student                         | teacher                              | admin | Suíte                       | Situação |
| ------------ | --------------------------------- | ------------------------------- | ------------------------------------ | ----- | --------------------------- | -------- |
| CT-PERM-001  | `POST /auth/login`                | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-002  | `POST /auth/register-student`     | 403                             | 201                                  | 201   | `routes/authRoutes`         | ✅       |
| CT-PERM-003  | `POST /auth/refresh`              | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-004  | `POST /auth/forgot-password`      | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-005  | `POST /auth/reset-password`       | público                         | público                              | público | `routes/authRoutes`       | ✅       |
| CT-PERM-006  | `PATCH /auth/change-password`     | 200                             | 200                                  | 200   | `routes/authRoutes`         | ✅       |
| CT-PERM-007  | `POST /auth/logout`               | 200                             | 200                                  | 200   | `routes/authRoutes`         | ✅       |
| CT-PERM-008  | `POST /auth/revoke/{userId}`      | 403                             | 403                                  | 200   | `routes/authRoutes`         | ✅       |
| CT-PERM-009  | `GET /users`                      | 403                             | 200                                  | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-010  | `POST /users`                     | 403                             | 201 aluno / 403 teacher ou admin     | 201   | `routes/userRoutes`         | ✅       |
| CT-PERM-011  | `GET /users/{id}`                 | 200 próprio / 403 outro         | 200                                  | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-012  | `PATCH /users/{id}`               | 200 próprio / 403 outro         | 200 próprio / 403 outro              | 200   | `routes/userRoutes`         | ✅       |
| CT-PERM-013  | `DELETE /users/{id}`              | 200 próprio / 403 outro         | 200 aluno e próprio / 403 privilegiado | 200 | `routes/userRoutes`         | ✅       |
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
| CT-PERM-033  | `GET /attitude-logs/{id}`         | 403                             | 200                                  | 200   | `routes/attitudeLogRoutes` (só a célula permissiva) | ⬜ |
| CT-PERM-034  | `PATCH /attitude-logs/{id}`       | 403                             | 200 se aplicou / 403 se não          | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-035  | `DELETE /attitude-logs/{id}`      | 403                             | 200 se aplicou / 403 se não          | 200   | `routes/attitudeLogRoutes`  | ✅       |
| CT-PERM-036  | `GET /rankings/global`            | 200                             | 200                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-037  | `GET /rankings/me`                | 200 / 404 sem turma             | 404 sem turma                        | 404 sem turma | `routes/rankingRoutes` | ✅     |
| CT-PERM-038  | `GET /rankings/class/{classId}`   | 200 própria / 403 outra         | 200                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-039  | `POST /rankings/refresh`          | 403                             | 403                                  | 200   | `routes/rankingRoutes`      | ✅       |
| CT-PERM-040  | Conta desativada em rota protegida | 403                            | 403                                  | 403   | `routes/userRoutes`         | ✅       |

**Pendência da matriz.** O `CT-PERM-033` é a única operação cuja célula restritiva não é exercida: `GET /attitude-logs/{id}` declara `authorize("teacher", "admin")` na rota, e a suíte cobre o caminho da professora (log populado) e o 404, mas nunca chama a rota com token de aluno. A proteção está no código; o que falta é o teste que a prova.

---

## 9 - Fluxos ponta a ponta (`CT-E2E`)

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

## 10 - Casos bloqueados

| ID          | Cenário                              | Depende de                                                          | RF     | Situação |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------- | ------ | -------- |
| CT-BADGE-001 | Badge concedida no primeiro login   | Nenhuma regra concede badge hoje; o campo existe apenas no model        | RF-009 | ⛔       |
| CT-BADGE-002 | Badge concedida ao atingir 100 XP   | Mesma pendência do CT-BADGE-001                                        | RF-009 | ⛔       |
| CT-STREAK-001 | Streak diária de atividade         | Falta o campo `last_activity_at` no model e a regra de atualização      | RF-009 | ⛔       |
| CT-RATE-001  | Bloqueio por excesso de requisições | Rate limiting ainda não implementado (RNF-001)                          | RNF-001 | ⛔      |

Casos bloqueados não contam como falha nem entram no cálculo de cobertura. Eles ficam registrados para que a lacuna seja uma decisão consciente, e não um esquecimento.

## 11 - Resumo

Situação em 19/08/2026, com a suíte em **41 arquivos de teste e 879 testes**, executando em cerca de 7 segundos.

| Módulo                        | Prefixo      | Casos | ✅ Automatizados | ⬜ Pendentes |
| ----------------------------- | ------------ | ----- | ---------------- | ------------ |
| Autenticação e sessão         | `CT-AUTH`    | 22    | 21               | 1            |
| Usuários                      | `CT-USER`    | 17    | 17               | 0            |
| Turmas                        | `CT-CLASS`   | 12    | 12               | 0            |
| Missões                       | `CT-MISSION` | 16    | 16               | 0            |
| Progressão de XP e nível      | `CT-XP`      | 10    | 10               | 0            |
| Atitudes e atitudes aplicadas | `CT-ATT`     | 17    | 17               | 0            |
| Ranking                       | `CT-RANK`    | 8     | 8                | 0            |
| Matriz de permissões          | `CT-PERM`    | 40    | 39               | 1            |
| Fluxos ponta a ponta          | `CT-E2E`     | 4     | 0                | 4            |
| **Total**                     | -            | **146** | **140 (95,9%)** | **6**        |

Os 4 casos bloqueados da seção 10 não entram nesta contagem.

### As seis pendências, em ordem de risco

1. **CT-PERM-033** — célula restritiva sem teste em `GET /attitude-logs/{id}`. É a única lacuna de controle de acesso, e a mais barata de fechar: uma chamada com token de aluno esperando 403.
2. **CT-AUTH-012** — token expirado não exercitado em rota. Junto com ele fica descoberta a linha 63 do `AuthMiddleware`, o `else next(err)`, que é o caminho do access token válido cujo usuário não tem mais refresh token no banco.
3. **CT-E2E-001 a 004** — os quatro fluxos ponta a ponta.

### Rastreabilidade entre catálogo e suíte

A coluna **Suíte** liga cada caso ao arquivo que o cobre, mas o elo ainda é externo à suíte: **nenhum teste cita o ID do caso no `describe`/`it`**. A convenção proposta continua valendo e é o próximo passo do rastreio:

```js
it("CT-MISSION-010: aluno recebe a missão sem o gabarito", async() => { ... });
```

Enquanto os IDs não estiverem nos nomes dos testes, uma falha na execução aponta o comportamento quebrado, mas não o caso de teste correspondente — o caminho de volta precisa desta tabela.

### Casos exercidos pela suíte sem entrada no catálogo

A suíte é mais larga que este documento: cobre filtros de listagem, paginação, populate, campos descartados pelos schemas, resiliência do ranking, e as classes de erro e helpers de resposta. Esses testes não têm ID porque não descrevem regra de negócio do produto — são a malha de proteção em volta dela. O catálogo cataloga requisito; a suíte protege implementação. Os dois não precisam ter o mesmo tamanho.
