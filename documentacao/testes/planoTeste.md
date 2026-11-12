# Plano de Teste

**LevelUp English - Plataforma Gamificada de Aprendizado de Inglês**

_versão 3.16_

## Histórico das alterações

| Data       | Versão | Descrição                                                                                                   | Autor(a)      |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------- | ------------- |
| 25/06/2025 | 1.0    | Primeira versão do plano de teste                                                                            | Matheus Lucas |
| 14/08/2026 | 2.0    | Atualização após os módulos de atitudes, ranking, progresso de missão e controle de acesso por papel e posse | Matheus Lucas |
| 19/08/2026 | 3.0    | Suíte implementada: estrutura real, cobertura medida, RNF-005 atendido e o que ficou fora do plano original  | Matheus Lucas |
| 24/09/2026 | 3.1    | Ajuste manual de XP (RF-013, `POST /xp-adjustments`): arquitetura, casos, estrutura da suíte e métricas atualizadas | Matheus Lucas |
| 13/10/2026 | 3.2    | RF-005: score apurado pelo servidor nos três tipos de missão, com perguntas de checagem em vocabulário e áudio | Matheus Lucas |
| 14/10/2026 | 3.3    | Histórico de XP do aluno (RF-014, `GET /users/{id}/xp-history`): requisito, arquitetura e casos | Matheus Lucas |
| 14/10/2026 | 3.4    | RNF-007: rate limit no login e na recuperação de senha; RNF-001 passa a Implementado e o `CT-RATE-001` deixa de estar bloqueado | Matheus Lucas |
| 16/10/2026 | 3.5    | RF-009 passa a Parcial: conquistas calculadas no frontend a partir do `mission_progress`; streak segue como trabalho futuro e os casos de badge saem do escopo do backend | Matheus Lucas |
| 16/10/2026 | 3.6    | Seção 4 alinhada à seção 11 do catálogo (274 casos, 268 automatizados); RF-004 com o título de missão único por turma; métricas da seção 7 medidas de novo | Matheus Lucas |
| 16/10/2026 | 3.7    | Seção 7 medida de novo depois do teste do `CT-AUTH-011`: a linha 32 do `AuthMiddleware` deixa de estar descoberta | Matheus Lucas |
| 16/10/2026 | 3.8    | `CT-AUTH-012` automatizado e caso `CT-AUTH-051` (token inválido); o `AuthMiddleware` chega a 100% e o `if (!decoded)` inalcançável é removido | Matheus Lucas |
| 16/10/2026 | 3.9    | `CT-PERM-033` automatizado: a matriz de permissões fica completa e só os fluxos ponta a ponta seguem pendentes | Matheus Lucas |
| 29/10/2026 | 3.10   | RF-015 (desempenho por tipo de missão, para o radar) e RF-016 (notificações); RF-004 com o limite de caracteres das perguntas e RF-007 com a saída do ranking global; seção 4 alinhada à seção 12 do catálogo (318 casos, 314 automatizados); seções 6, 7 e 10 medidas de novo | Matheus Lucas |
| 31/10/2026 | 3.11   | RF-017 (foto de perfil); seção 2 alinhada à API atual (9 domínios, 33 caminhos e 49 operações, com notificações, desempenho e upload); RNF-005 com as 49 operações; seção 4 alinhada à seção 12 do catálogo (341 casos, 337 automatizados) | Matheus Lucas |
| 09/11/2026 | 3.12   | Streak retirado do escopo do RF-009 e removido da API, por nunca ter tido regra que o alimentasse; RF-009 passa a Implementado e o streak fica como trabalho futuro | Matheus Lucas |
| 09/11/2026 | 3.13   | RNF-002 atendido com o p95 medido na VM de produção; RNF-006 implementado, com backup diário e plano de recuperação; seções 1 e 10 alinhadas ao projeto atual (frontend e pipeline existem) | Matheus Lucas |
| 12/11/2026 | 3.14   | RF-018 (adequação à LGPD): termo dos responsáveis, revogação, desativação no lugar da exclusão, retenção com anonimização, eliminação e exportação a pedido; RF-007 com o ranking da turma ocultável pelo professor e sem e-mail; seção 2 alinhada à API atual (37 caminhos e 53 operações); seção 4 alinhada à seção 13 do catálogo (391 casos, 387 automatizados); seções 6, 7 e 10 medidas de novo | Matheus Lucas |
| 12/11/2026 | 3.15   | A LGPD passa a ser também requisito não funcional: RNF-008 (conformidade com a LGPD, com retenção, minimização, backups e registro das eliminações) e RF-018 restrito ao que o usuário faz (termo, revogação, desativação, eliminação e exportação); a retirada do e-mail do ranking sai do RF-007 e vai para o RNF-008 | Matheus Lucas |
| 12/11/2026 | 3.16   | Termo dos responsáveis obrigatório para todo aluno, sem estado pendente (os ambientes são recriados pelos seeds): sai o registro posterior do termo, e reativar aluno revogado exige termo novo; RNF-008 com a conferência `check:guardian-consent`; seção 2 com 36 caminhos e 52 operações; seção 4 alinhada à seção 13 do catálogo (384 casos, 380 automatizados); seções 7 e 10 medidas de novo | Matheus Lucas |

## 1 - Introdução

O LevelUp English é uma plataforma de gamificação para aprendizado de inglês que busca tornar o processo educacional mais engajador e interativo. O sistema permite gerenciamento de usuários (alunos, professores e administradores), turmas, missões (quiz, vocabulário e áudio), atitudes em sala e ranking com pontuação por XP.

Este plano descreve a estratégia, os níveis, o ambiente e os critérios de aceitação dos testes aplicados à API. Os cenários em si estão catalogados no documento complementar [casosDeTeste.md](casosDeTeste.md), que é a lista executável — este documento diz **como e por que** testar, o outro diz **o quê**.

O escopo deste plano é a API REST. O front-end fica em repositório próprio, com testes próprios, e não é coberto aqui.

## 2 - Arquitetura da API

A aplicação é construída em uma arquitetura modular em camadas, utilizando Node.js, Express 5, MongoDB com Mongoose, Zod para validação de dados, JWT para autenticação e Swagger (zod-to-openapi) para documentação.

São **9 domínios**, expostos em **36 caminhos** e **52 operações** documentadas em `/api-docs`.

### Camadas

- **Routes**: definem os endpoints, declaram quem pode chamá-los e direcionam para os controllers.
  - `authRoutes.js`: autenticação e gestão de sessão
  - `userRoutes.js`: gerenciamento de usuários, foto de perfil, histórico de XP, desempenho do aluno e as rotas da LGPD (revogação do consentimento, eliminação e exportação)
  - `classRoutes.js`: gerenciamento de turmas
  - `missionRoutes.js`: gerenciamento de missões e submissão de progresso
  - `attitudeRoutes.js`: catálogo de atitudes
  - `attitudeLogRoutes.js`: atitudes aplicadas a alunos
  - `rankingRoutes.js`: ranking global e por turma
  - `xpAdjustmentRoutes.js`: ajuste manual de XP pelo professor
  - `notificationRoutes.js`: notificações do usuário logado

- **Controllers**: validam o corpo da requisição com Zod e chamam o service correspondente.
  - `AuthController`, `UserController`, `ClassController`, `MissionController`, `AttitudeController`, `AttitudeLogController`, `RankingController`, `XpAdjustmentController`, `XpHistoryController`, `PerformanceController`, `NotificationController`, `PrivacyController`

- **Services**: concentram as regras de negócio e a verificação de posse do recurso.
  - `AuthService`: login, refresh rotation, recuperação e troca de senha
  - `UserService`: validação de e-mail, permissões de criação, edição e desativação, termo dos responsáveis e revogação, troca e remoção da foto de perfil
  - `ClassService`: turmas, visibilidade por papel, posse do professor
  - `MissionService`: missões, correção do quiz, ocultação do gabarito
  - `AttitudeService` / `AttitudeLogService`: catálogo de atitudes e aplicação de XP
  - `RankingService`: montagem do ranking global e por turma
  - `XpAdjustmentService`: ajuste manual de XP, com posse do professor e histórico de auditoria
  - `XpHistoryService`: linha do tempo do XP do aluno (atitudes, ajustes e missões), paginada em memória
  - `ProgressionService`: aplica XP, recalcula o nível e atualiza os rankings; no ajuste manual, com piso em 0 XP
  - `PerformanceService`: média das melhores notas por tipo de missão, comparada à da turma, para o radar
  - `NotificationService`: cria, lista e marca como lidas as notificações; os textos de cada aviso ficam nos métodos `notify*`
  - `AnonymizationService`: anonimiza o aluno (nome, e-mail, foto, credenciais, notificações e motivos dos ajustes de XP) e registra a eliminação em `DataErasureLog`
  - `RetentionService`: aplica o prazo de retenção (`RETENTION_MONTHS`) e reaplica a anonimização depois de restaurar um backup; executado pelo `npm run retention:anonymize` (`src/jobs/run_retention.js`), agendado no cron da VM
  - `PrivacyService`: eliminação a pedido do titular e exportação dos dados do aluno em JSON

- **Repositories**: acessam o MongoDB, isolando a persistência.
  - Paginação com `mongoose-paginate-v2`, populate de referências e filtros dedicados (`repository/filters/`)

- **Models**: definem os schemas das entidades.
  - `User` (role, xp, level, mission_progress, avatar_url, badges, active, deactivated_at, anonymized_at e os três campos do termo dos responsáveis), `Class` (com `class_ranking_visible`), `Mission`, `Attitude`, `AttitudeLog`, `XpAdjustment`, `Ranking`, `Notification`, `DataErasureLog` (quem teve os dados eliminados, por quê, por quem e quando, sem dado pessoal)

- **Schemas (validação)**: regras de entrada e contratos de saída em Zod, reaproveitados pelo Swagger.

- **Middlewares**:
  - `AuthMiddleware`: valida o JWT e confirma que a sessão ainda existe no banco
  - `AuthPermission` (`authorize(...roles)`): bloqueia conta desativada e papel fora da lista da rota
  - `asyncWrapper`: captura erros de handlers assíncronos
  - `LogRoutesMiddleware`: log de requisições quando `DEBUGLOG` está ligado
  - `RateLimitMiddleware`: limita as tentativas de login, `forgot-password` e `reset-password` (RNF-007)
  - `AvatarUploadMiddleware`: recebe a foto em memória, só JPEG, PNG ou WebP e até 2 MB
  - `UploadsStaticMiddleware`: serve as fotos em `/uploads`, sem token, liberadas para outra origem e com cache de 7 dias

- **Armazenamento da foto**: `AvatarImage` converte para WebP 256×256 sem metadados, e `LocalDiskStorage` grava no disco do servidor atrás de uma interface (`save`, `delete`, `getUrl`, `keyFromUrl`) que permite trocar por outro armazenamento sem mexer no service.

### Regra de autorização

A regra que orienta boa parte dos casos de teste é a divisão em dois estágios:

> **O papel é verificado na rota; a posse do recurso é verificada no service.**

`authorize(...roles)` responde "este papel pode chamar esta rota?" e devolve 403 para papel fora da lista **ou** conta com `active: false`. Passando por ele, o service responde "este recurso é seu?" — a turma é do professor, a missão foi criada por ele, o log foi aplicado por ele, o perfil é o do próprio aluno.

Isso significa que **todo endpoint autenticado tem no mínimo dois casos de teste de acesso** (papel autorizado e papel não autorizado), e os endpoints com posse têm um terceiro (papel certo, dono errado).

## 3 - Categorização dos Requisitos Funcionais e Não Funcionais

### Requisitos Funcionais

| Código | Nome                           | Descrição                                                                                                                          | Prioridade    | Situação        |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------------- |
| RF-001 | Cadastro de Usuários           | Cadastro de alunos com nome, e-mail e senha. Apenas teacher/admin criam usuários, e o professor só cria aluno. O cadastro de aluno exige a confirmação do termo dos responsáveis (RF-018). | Essencial     | Implementado    |
| RF-002 | Login de Usuários              | Login com JWT (access + refresh token). Conta desativada não autentica.                                                              | Essencial     | Implementado    |
| RF-003 | Gestão de Turmas               | Teacher e admin criam, listam e atualizam turmas; a exclusão é exclusiva do admin. O professor só altera as turmas dele.             | Essencial     | Implementado    |
| RF-004 | Criação de Missões             | Teacher e admin criam missões de quiz, vocabulário e áudio, vinculadas a uma turma. O professor só cria nas turmas dele. O título é único por turma, sem diferenciar maiúsculas, e não na escola inteira. O enunciado de cada pergunta tem até 500 caracteres e cada alternativa até 200. | Essencial     | Implementado    |
| RF-005 | Progresso de Missões           | O aluno submete a missão e o servidor apura o score nos três tipos, ignorando o enviado no corpo: quiz e vocabulário ou áudio com perguntas de checagem são corrigidos contra o gabarito; vocabulário ou áudio antigo, sem perguntas, vale 100 na conclusão. | Essencial     | Implementado    |
| RF-006 | Sistema de XP e Nível          | O XP é proporcional ao score sobre o `xp_reward` e paga apenas a diferença do melhor desempenho. O nível segue curva quadrática.     | Essencial     | Implementado    |
| RF-007 | Ranking Global e por Turma     | Ranking dos 30 melhores por XP, global e por turma, recalculado a cada mudança de XP. O aluno pode sair do ranking global, e a mudança vale na hora; ele continua no ranking da turma. O professor pode esconder o ranking da turma dos alunos (`class_ranking_visible`), e continua vendo. | Essencial     | Implementado    |
| RF-008 | Registro de Atitudes           | Professor aplica atitudes positivas e negativas a alunos das turmas dele, creditando ou descontando XP; desfazer estorna o XP.       | Essencial     | Implementado    |
| RF-009 | Gerenciamento de Badges        | O aluno vê conquistas por marcos de progresso — missões concluídas, missões com nota 100% e XP ganho em missões —, calculadas no frontend a partir do `mission_progress` que já vem no `GET /users/{id}`. | Não Essencial | Implementado    |
| RF-010 | Autenticação por Refresh Token | Refresh token rotation para renovar a sessão sem novo login, com o token vigente conferido no banco.                                  | Essencial     | Implementado    |
| RF-011 | Controle de Acesso             | Papel declarado na rota e posse do recurso conferida no service; conta desativada perde acesso mesmo com token válido.                | Essencial     | Implementado    |
| RF-012 | Sigilo do Gabarito             | O aluno recebe a missão sem `questions[].correct_answer`; o gabarito fica restrito a teacher e admin.                                 | Essencial     | Implementado    |
| RF-013 | Ajuste Manual de XP            | Professor adiciona ou remove XP de aluno das turmas dele sem atitude cadastrada; o XP nunca fica negativo e cada ajuste fica registrado. | Essencial     | Implementado    |
| RF-014 | Histórico de XP                | O aluno vê de onde veio o próprio XP — atitudes, ajustes manuais e missões —, com o valor efetivamente aplicado, do mais recente ao mais antigo e paginado. O professor vê o dos alunos das turmas dele; o admin, o de qualquer aluno. | Essencial     | Implementado    |
| RF-015 | Desempenho por Tipo de Missão  | O aluno vê a média das melhores notas por tipo de missão (quiz, vocabulário e áudio), para o gráfico de radar, comparada à média dos alunos ativos da turma e com filtro opcional por período de conclusão. Mesma regra de acesso do RF-014. | Não Essencial | Implementado    |
| RF-016 | Notificações                   | O aluno é avisado de atitude aplicada, corrigida ou desfeita, de ajuste manual de XP e de missão nova na turma, com o XP aplicado de fato e a mudança de nível. Ele lista as próprias notificações, vê quantas não leu e marca uma ou todas como lidas; as notificações são apagadas após 90 dias. | Não Essencial | Implementado    |
| RF-017 | Foto de Perfil                 | O usuário envia a própria foto (JPEG, PNG ou WebP, até 2 MB), que o servidor converte para WebP 256×256 sem metadados e entrega em `/uploads`. Ele pode trocá-la ou removê-la, e a foto antiga sai do disco; o admin troca ou remove a de qualquer usuário. | Não Essencial | Implementado    |
| RF-018 | Direitos do titular e consentimento | O cadastro de aluno exige a confirmação do termo assinado pelos responsáveis e registra a data e quem registrou; sem ela, o cadastro é recusado. Professor e admin revogam o consentimento, o que desativa a conta, e reativar o aluno exige um termo novo. A exclusão vira desativação, e o aluno não desativa a própria conta. A pedido do titular, o admin elimina os dados do aluno na hora (anonimização irreversível) e exporta os dados dele em JSON. | Essencial     | Implementado    |

`RF-018` reúne as ações que um usuário dispara por causa da LGPD; a obrigação de cumprir a lei, que vale para o sistema inteiro, está no `RNF-008`. A divisão segue a classificação de Sommerville, em que a exigência legal é requisito não funcional externo: ela não descreve uma função, e sim uma restrição sobre como todas as funções tratam os dados. A retenção automática fica no RNF-008 porque ninguém a dispara — ela existe só para cumprir o prazo da lei.

`RF-009` é atendido no frontend, e o backend não persiste conquistas: o campo `badges` do model segue sem uso. Como as conquistas são derivadas do progresso de missão e não alteram XP nem ranking, gravá-las seria duplicar um dado que a API já entrega. Nenhuma conquista regride, e por isso não há conquista de nível — o nível pode cair com uma atitude negativa. O `streak` saiu do escopo do requisito na v3.12 e foi removido da API, porque nenhuma regra o alimentava. Fica como trabalho futuro: exigiria um campo `last_activity_at` no model e a regra de atualização.

### Requisitos Não Funcionais

| Código  | Nome              | Descrição                                                                                                                     | Situação                        |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| RNF-001 | Segurança         | JWT para autenticação, senhas com bcrypt, cabeçalhos com helmet, CORS e rate limiting.                                          | Implementado — rate limiting detalhado no RNF-007 |
| RNF-002 | Desempenho        | Responder em até 500 ms (p95) nos endpoints comuns, com paginação limitada a 100 registros por página.                          | **Atendido** — limite aplicado nos 5 repositórios e p95 de até 33,38 ms na VM de produção (detalhe abaixo) |
| RNF-003 | Escalabilidade    | Arquitetura preparada para múltiplas turmas e usuários, com índices apropriados no MongoDB.                                     | Implementado                    |
| RNF-004 | Usabilidade da API | Documentação completa via Swagger/OpenAPI, com mensagens de erro claras e padronizadas pelo `CustomError`/`CommonResponse`.    | Implementado                    |
| RNF-005 | Confiabilidade    | Mínimo de 70% de cobertura de linhas na suíte automatizada e todos os endpoints cobertos por teste de integração.               | **Atendido** — 99,94% de linhas e as 52 operações exercitadas por teste de integração (ver seção 7) |
| RNF-006 | Backup & Recovery | Backup automático do MongoDB com plano de recuperação.                                                                          | Implementado — backup diário e plano de recuperação (detalhe abaixo) |
| RNF-007 | Proteção contra força bruta | Limite de tentativas com resposta 429 e `Retry-After`. Login: 10 falhas em 15 minutos por IP + e-mail, para um aluno não bloquear o laboratório que sai pelo mesmo IP, e 100 por IP. `forgot-password`: 5 pedidos por hora por IP + e-mail. `reset-password`, que também é o primeiro acesso: 10 falhas em 15 minutos por IP. `refresh` e `logout` não são limitados. | Implementado |
| RNF-008 | Conformidade com a LGPD | Tratamento dos dados dos alunos conforme a Lei 13.709/2018: consentimento dos responsáveis para menores (art. 14, pelo RF-018), sem nenhum aluno ativo sem termo — conferido pelo `npm run check:guardian-consent` depois de cada reseed; minimização — o ranking não traz e-mail, a foto é opcional e sem metadados, as notificações somem após 90 dias; retenção de 12 meses após a desativação (`RETENTION_MONTHS`), com anonimização automática diária (art. 16); dados anonimizados nos backups por no máximo 7 dias; registro de cada eliminação sem dado pessoal; atendimento aos direitos do titular (art. 18, pelo RF-018). | Implementado — o texto jurídico da política e do termo é modelo e exige revisão antes do uso real (detalhe abaixo) |

`RNF-008` é verificado pelos casos `CT-LGPD` (seção 9 do catálogo) e pelo `CT-RANK-017`. A anonimização mantém XP, progresso, turma e logs de atitude ligados ao registro anonimizado, para os rankings e as médias da turma não mudarem, e apaga o que identifica o aluno: nome, e-mail, foto, credenciais, notificações e o texto livre dos ajustes de XP (o único campo de texto livre ligado ao aluno; `AttitudeLog` não tem). O `DataErasureLog` guarda só o id, o motivo, quem executou e a data, e serve também para a retenção reaplicar a anonimização se um backup antigo for restaurado. A API não decide quem é o controlador dos dados: isso, a política de privacidade, os termos de uso e o modelo do termo ficam no frontend, como textos-modelo.

`RNF-007` guarda os contadores em memória: um restart ou deploy da API os zera, e com mais de uma instância cada uma contaria separado. Para a escala do projeto, com uma instância, é aceitável; o passo seguinte seria um store compartilhado (Redis ou o próprio MongoDB).

#### Medição do RNF-002

Medido em 09/11/2026 com o k6 (`documentacao/testes/carga/p95.js`), contra a API pública em HTTPS. A API e o MongoDB rodam na mesma VM, com 2 vCPU e 4 GB de memória, e o k6 rodou em uma máquina externa, de modo que o tempo inclui a rede. A carga foi de 40 usuários simultâneos, o tamanho de uma turma, por 4 minutos (30 s de subida, 3 min estáveis e 30 s de descida), com 1 a 3 s de pausa entre as requisições e um em cada dez usuários no papel de professor. O banco continha os dados de demonstração, com 30 usuários.

| Endpoint                          | p95      | Limite |
| --------------------------------- | -------- | ------ |
| `GET /users`                      | 33,38 ms | 500 ms |
| `GET /rankings/me`                | 29,59 ms | 500 ms |
| `GET /missions`                   | 29,16 ms | 500 ms |
| `GET /classes`                    | 28,89 ms | 500 ms |
| `GET /rankings/global`            | 28,04 ms | 500 ms |
| `GET /users/{id}`                 | 25,93 ms | 500 ms |
| `GET /notifications/unread-count` | 22,73 ms | 500 ms |

Foram 4.287 requisições, sem nenhuma falha. A medição cobre as leituras mais frequentes: o login fica fora porque o bcrypt é lento por design e o rate limit barraria a repetição, e a submissão de missão fica fora porque alteraria XP e ranking em produção. Com um banco maior, os tempos podem subir.

#### Backup e recuperação (RNF-006)

O `scripts/backup-mongo.sh` roda todo dia às 3h pelo cron da VM. Ele gera em `~/backups` um dump do banco e um arquivo com as fotos de perfil, só publica arquivos que passaram na verificação de integridade e mantém os últimos 7 dias. Em 09/11/2026, o backup foi restaurado em um container separado: 439 documentos, nenhuma falha, índices recriados e a mesma contagem de usuários do banco original.

Para recuperar, na pasta do projeto na VM, escolhendo os arquivos em `~/backups`:

1. Parar a API: `docker compose stop api`.
2. Restaurar o banco, substituindo as coleções: `docker exec -i level-up-english-db mongorestore --archive --gzip --drop < ARQUIVO_DB`.
3. Subir a API: `docker compose start api`.
4. Restaurar as fotos: `docker exec -i level-up-english-api tar -xzf - -C /node-app < ARQUIVO_UPLOADS`.
5. Conferir `GET /` e um login.

Limitação: os backups ficam no disco da própria VM, então protegem contra perda de dados e erro de operação, mas não contra a perda da VM.

## 4 - Casos de Teste

Os casos estão no documento [casosDeTeste.md](casosDeTeste.md), organizados por módulo e rastreados até o requisito que verificam.

| Módulo                        | Prefixo      | Casos | Requisitos cobertos         |
| ----------------------------- | ------------ | ----- | --------------------------- |
| Autenticação e sessão         | `CT-AUTH`    | 51    | RF-001, RF-002, RF-010, RF-011, RNF-007 |
| Usuários                      | `CT-USER`    | 57    | RF-001, RF-006, RF-011, RF-017 |
| Turmas                        | `CT-CLASS`   | 28    | RF-003, RF-011              |
| Missões                       | `CT-MISSION` | 47    | RF-004, RF-011, RF-012      |
| Progressão de XP e nível      | `CT-XP`      | 49    | RF-005, RF-006, RF-011, RF-013, RF-014, RF-015 |
| Atitudes e atitudes aplicadas | `CT-ATT`     | 24    | RF-008, RF-011              |
| Ranking                       | `CT-RANK`    | 17    | RF-007, RF-011, RNF-008     |
| Notificações                  | `CT-NOTIF`   | 19    | RF-011, RF-016              |
| Privacidade e LGPD            | `CT-LGPD`    | 35    | RF-011, RF-018, RNF-008     |
| Matriz de permissões          | `CT-PERM`    | 53    | RF-011                      |
| Fluxos ponta a ponta          | `CT-E2E`     | 4     | integração entre requisitos |
| **Total**                     | -            | **384** | -                         |

**Situação em 12/11/2026: 380 dos 384 casos estão automatizados (99,0%).** As quatro pendências são os fluxos ponta a ponta (`CT-E2E-001` a `004`). A contagem por módulo e o motivo de cada pendência estão na seção 13 do catálogo.

A matriz `CT-PERM` cobre uma linha por operação da API, com o status esperado para cada um dos três papéis. Ela é a rede de segurança contra regressão de permissão: qualquer rota nova entra ali antes de ser considerada pronta.

## 5 - Estratégia de Teste

A estratégia busca garantir qualidade funcional e de segurança através de níveis complementares, do mais barato e específico para o mais caro e abrangente.

### Níveis de Teste

**Testes unitários**

- Verificam lógica isolada, sem banco e sem HTTP, com as dependências substituídas por dublês.
- Responsabilidade: desenvolvedor, durante a implementação.
- Escopo:
  - `LevelHelper`: curva de nível, XP por nível, progresso e limites (nível mínimo 1, máximo 50)
  - `MissionService.resolveScore`: correção pelo gabarito em toda missão com perguntas e score 100 na conclusão de vocabulário ou áudio antigo
  - `RankingService.buildEntries`: ordenação e corte no top 30
  - `ProgressionService`: aplicação do XP com `$inc`, recálculo de nível e resiliência quando o ranking falha
  - Schemas Zod: campos obrigatórios, enums e regras condicionais (quiz exige no mínimo 5 questões). São exercitados **através dos controllers**, que é onde o `parse` acontece — não há suíte própria de schema, e a cobertura deles vem daí
  - Helpers e utilitários (`AuthHelper`, `TokenUtil`, `CustomError`, `CommonResponse`, `errorHandler`, filtros de repositório)

**Testes de integração**

- Exercitam a pilha completa — rota → middleware → controller → service → repository → banco — com requisições HTTP reais via Supertest e MongoDB em memória.
- Responsabilidade: desenvolvedor.
- É o nível principal deste projeto: as regras que mais importam (permissão, posse, XP) só aparecem com as camadas montadas.
- Escopo:
  - Todos os endpoints, em sucesso e em erro
  - Matriz de permissões (`CT-PERM`) com token de cada papel
  - Efeitos colaterais no banco: XP creditado, XP estornado, referência de missão na turma, ranking atualizado

**Testes ponta a ponta**

- Encadeiam vários endpoints para reproduzir um uso real, verificando o estado ao final da jornada.
- Escopo: os fluxos `CT-E2E` (turma completa, onboarding do aluno, correção de atitude, desativação de conta).

**Testes manuais de API**

- Swagger UI e Postman, para explorar casos novos antes de virarem teste automatizado e para conferir a documentação contra o comportamento real.
- Responsabilidade: desenvolvedor, ao fechar cada fatia.

**Testes de segurança (spot-check)**

- Token ausente, malformado, expirado e de sessão encerrada
- Escalação de privilégio: aluno tentando virar admin pelo próprio `PATCH`, aluno alcançando dados de outra turma, professor alcançando conta privilegiada
- Vazamento de dados sensíveis na resposta: `password` nunca serializado, gabarito ausente para o aluno
- Injeção de operadores do MongoDB em filtros de query

### Execução

1. **Durante o desenvolvimento**: o desenvolvedor roda os testes do módulo que está mexendo.
2. **Antes do commit**: `npm run fix` (lint) e a suíte completa.
3. **Antes do merge**: suíte completa com cobertura; nenhuma queda de cobertura em relação à `main`.
4. **Ao fechar uma fatia de permissão**: a matriz `CT-PERM` inteira, porque é o tipo de regra que quebra de longe.

### Ciclo de correção

Bug encontrado → registrado no formato da seção 9 → correção implementada **com um teste que falha antes e passa depois** → validação local → merge.

Nenhuma correção de bug entra sem o teste correspondente. É o que impede o mesmo defeito de voltar.

## 6 - Ambiente e Ferramentas

Os testes rodam localmente, com o mesmo Node e as mesmas configurações do ambiente de desenvolvimento. O banco de teste **nunca** é o de desenvolvimento: a suíte sobe um MongoDB em memória por execução e o descarta ao final.

### Ferramentas

| Ferramenta                | Propósito                                            | Responsável   |
| ------------------------- | ------------------------------------------------------ | ------------- |
| **Jest**                  | Executor de testes, mocks e relatório de cobertura     | Desenvolvedor |
| **Supertest**             | Requisições HTTP contra o app Express, sem subir porta | Desenvolvedor |
| **MongoDB Memory Server** | Banco efêmero e isolado por execução                   | Desenvolvedor |
| **Swagger UI / Postman**  | Testes manuais e conferência do contrato               | Desenvolvedor |
| **ESLint**                | Padrão de código e erros estáticos                     | Desenvolvedor |
| **Winston**               | Logs para análise de comportamento durante os testes   | Desenvolvedor |

### Comandos

```bash
# Instalar dependências
npm install

# Suíte completa com cobertura
npm run test

# Um arquivo específico
npm run test -- src/tests/routes/missionRoutes.test.js

# Modo watch durante o desenvolvimento
npm run test -- --watch

# Lint
npm run fix
```

### Estrutura da suíte

A suíte foi organizada **espelhando as camadas do projeto**, e não separando unitário de integração. Um arquivo de teste tem o nome do arquivo que ele cobre, no mesmo caminho relativo, o que torna óbvio tanto onde escrever um teste novo quanto o que ficou sem teste:

```
src/
└── tests/
    ├── setup/
    │   └── testDatabase.js       # sobe, limpa e derruba o MongoDB em memória
    ├── routes/                   # 13 arquivos — nível Int, a pilha completa via Supertest
    ├── controllers/              # 12 arquivos — validação Zod e envelope de resposta
    ├── services/                 # 15 arquivos — regra de negócio e posse, com dublês
    ├── repository/               # 9 arquivos + filters/ com 4
    ├── schemas/                  # 1 arquivo — limites e regras de conteúdo da missão
    ├── migrations/               # 5 arquivos — índices, sincronização e deactivated_at, contra o Mongo em memória
    ├── middlewares/              # 2 arquivos — upload e entrega das fotos de perfil
    ├── config/                   # 1 arquivo — trust proxy
    ├── models/                   # 2 arquivos — Ranking e DataErasureLog
    └── utils/                    # 6 arquivos + errors/ com 3 e helpers/ com 4
```

O `jest.setup.js`, na raiz, roda antes de cada arquivo: fixa `NODE_ENV=test`, `DISABLED_EMAIL=true` e `LOG_ENABLED=false`, garante um valor de teste para cada segredo JWT e silencia `console.log`/`console.error` para que a saída da suíte mostre só o que falhou.

Dos três apoios previstos na v2.0 deste plano, **um foi construído e dois não**:

1. `setup/testDatabase.js` — construído. `connectTestDatabase` levanta o `MongoMemoryServer`, `clearTestDatabase` esvazia as coleções entre testes e `disconnectTestDatabase` derruba tudo. Como cada arquivo de teste roda em um processo próprio do Jest, cada um levanta a própria instância e nenhum disputa dados com outro.
2. `factories` e `auth` — **não foram extraídos**. Cada suíte de rota monta o próprio elenco no `beforeEach` e tem a própria função de autenticação. É duplicação assumida: o custo de manter sete cópias apareceu como aceitável perto do risco de um helper compartilhado esconder o que cada teste realmente prepara. Se um oitavo módulo entrar, a conta muda e vale extrair.

O `services/RetentionService.test.js` é a exceção à regra de "services com dublês": além dos testes unitários, tem um bloco contra o Mongo em memória e uma pasta de fotos própria, porque o que importa na retenção é o efeito combinado em várias coleções e no disco.

Uma consequência dessa estrutura merece registro: **nenhuma suíte carrega `src/app.js` nem `routes/index.js`**. Cada teste de rota monta o próprio Express com o router que vai exercitar. Ficam sem cobertura o handler 404, o `helmet`/`cors`/`compression`, a ordem de montagem dos routers e o `LogRoutesMiddleware`. A causa é o `await DbConnect.conectar()` no topo do módulo de `app.js`, que conecta ao banco só de importar o arquivo; extrair uma função `createApp()` destrava esse teste.

### Cuidados com o ambiente

- **`npm run seed` apaga dados.** O seed roda `deleteMany()` em usuários, turmas, missões, atitudes e logs antes de recriar tudo, e as turmas recriadas ganham ids novos. Ele serve para popular o ambiente de testes manuais, nunca para preparar teste automatizado — estes montam o próprio cenário no `beforeEach`, contra o banco em memória, e nunca tocam o banco de desenvolvimento.
- **Variáveis de ambiente**: a suíte roda com `NODE_ENV=test` e `DISABLED_EMAIL=true`, para não disparar e-mail real em cadastro de aluno e recuperação de senha.
- **Segredos JWT**: os testes usam os mesmos nomes de variável do `.env.example`, com valores próprios de teste.

## 7 - Cobertura de Testes e Métricas

### Metas de cobertura por camada, e o que foi alcançado

Medição de 12/11/2026, com 77 arquivos de teste e 1661 testes:

| Camada             | Meta  | Realizado (stmts)  | Prioridade | Justificativa                                                |
| ------------------ | ----- | ------------------ | ---------- | ------------------------------------------------------------ |
| Services           | 85%   | **100%**           | Alta       | Concentram regra de negócio e verificação de posse           |
| Middlewares        | 90%   | **100%**           | Alta       | `authorize` é a porta de entrada de toda rota autenticada    |
| Schemas/Validators | 95%   | **100%**           | Alta       | Baratos de testar e a primeira barreira contra dado inválido |
| Repositories       | 80%   | **100%**           | Alta       | Filtros e paginação são fonte recorrente de erro sutil       |
| Controllers        | 70%   | **100%**           | Média      | Camada fina; o essencial já passa pela integração            |
| Utils/Helpers      | 75%   | **100%**           | Média      | `LevelHelper` é exceção: cobertura alta, é regra de XP       |
| Routes             | —     | **100%**           | —          | Consequência das 13 suítes de rota                           |
| Models             | —     | **100%**           | —          | Consequência dos testes que gravam de verdade                |
| Migrations         | —     | **98,11%**         | —          | Rodadas contra o Mongo em memória, como na produção sem `autoIndex` |
| **Total**          | **~80%** | **99,94% stmts / 98,34% branches / 100% funcs / 99,94% linhas** | - | Piso contratual de 70% no RNF-005 |

Todas as metas foram atingidas. Em linhas, só o `migrateMissionTitleIndex.js` fica abaixo de 100% (94,44%, linha 12: o `throw` de erro que não seja coleção inexistente ao listar os índices). O `AuthMiddleware.js` chegou a 100%: o token malformado, o expirado e o inválido passam por teste de rota (`CT-AUTH-011`, `012` e `051`), e o `if (!decoded)` depois do `jwt.verify`, que nunca era alcançado porque o `jwt.verify` já lança quando o token não presta, foi removido.

Os 50% de branches do `RateLimitMiddleware.js` são os valores padrão das fábricas e o limite de `NODE_ENV=test`: a suíte sempre monta os limitadores com `{ limit, windowMs }` próprios, então os limites de produção não são exercidos.

### Uma ressalva sobre o número

O Jest está configurado sem `collectCoverageFrom`, então **a cobertura é medida apenas sobre os arquivos que algum teste importa**. Arquivo que ninguém importa simplesmente não aparece na tabela, e por isso a métrica não distingue "código testado" de "código que ninguém usa".

Em 19/08/2026 essa lacuna foi fechada pelo outro lado: os cinco arquivos que a varredura de referências apontou como órfãos foram removidos do projeto (`utils/handleQuery.js`, `utils/Validator.js`, `utils/DateHelper.js`, `utils/getFirstLine.js` e `repository/filters/UserFilterBuild.js`). Os dois primeiros nem carregavam, porque importavam dependências ausentes; o último tinha sido substituído por um filtro montado direto no `UserRepository`. Com eles fora, os 99,68% passam a descrever o projeto inteiro, e não apenas a parte dele que algum teste alcança.

Configurar `collectCoverageFrom` continua sendo o ajuste correto: ele faz a garantia valer para frente, apontando o próximo arquivo órfão assim que ele aparecer, em vez de depender de uma varredura manual.

### Métricas de qualidade da suíte

| Métrica              | Alvo                     | Medido em 12/11/2026     |
| -------------------- | ------------------------ | ------------------------ |
| Pass rate na `main`  | mínimo de 95%            | **100%** (1661/1661)     |
| Flakiness            | máximo de 5%             | Nenhum caso instável isolado; a suíte cheia tem uma falha intermitente de infraestrutura em testes de rota (~1 em 8 rodadas em 02/10/2026; 2 em 7 em 16/10/2026, com `socket hang up` do supertest; em 29/10/2026, timeouts de 30 s em `missionRoutes` e `classRoutes` e um 401 no lugar de 403 em `performanceRoutes`; em 12/11/2026, uma falha em `middlewares/UploadsStaticMiddleware`, que usa diretório temporário próprio; todos passando isolados e na rodada seguinte) |
| Tempo de execução    | menos de 60 s            | **~11 s**                |
| Cobertura de linhas  | mínimo de 70%            | **99,94%**               |
| Cobertura de branches | mínimo de 65%           | **98,34%**               |

O relatório sai em `coverage/` a cada `npm run test`. A configuração do Jest, no `package.json`, exclui da contagem os arquivos sem regra própria (helpers de resposta, logger, conexão com o banco, seeds e a documentação Swagger) para que a métrica reflita código de negócio.

O tempo de execução ficou uma ordem de grandeza abaixo do alvo por dois motivos que valem registro: o `bcrypt` roda com custo 4 nas suítes de rota, em vez do padrão 10, já que ali a senha é só dado de cenário; e cada arquivo de teste levanta a própria instância do Mongo em memória, o que deixa o Jest paralelizar por processo em vez de serializar tudo num banco compartilhado.

## 8 - Classificação de Bugs

| Nível | Severidade   | Descrição                                                                            | Exemplo                                                                                                          |
| ----- | ------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1     | **Blocker**  | Impede funcionalidade crítica ou derruba a aplicação. Bloqueia a entrega.            | • Login fora do ar • Erro 500 em rota essencial • Aluno consegue se promover a admin                             |
| 2     | **Grave**    | Funcionalidade não se comporta como esperado, atingindo o fluxo principal.           | • XP calculado errado • Gabarito exposto ao aluno • Professor alterando turma de outro • Estorno não devolve XP  |
| 3     | **Moderada** | Comportamento inesperado com alternativa disponível.                                 | • Filtro de listagem errando caso limite • Mensagem de erro incompleta • Paginação com offset incorreto          |
| 4     | **Pequena**  | Impacto mínimo, não bloqueia o uso.                                                  | • Erro ortográfico em mensagem • Ordem dos campos na resposta • Exemplo do Swagger desatualizado                 |
| 5     | **Trivial**  | Sugestão de melhoria sem impacto funcional.                                          | • Melhorar log de depuração • Refatoração de clareza                                                             |

Qualquer falha de controle de acesso entra como **Blocker** ou **Grave**, mesmo quando o caminho de exploração é improvável: é o tipo de defeito que o usuário final não percebe e não reporta.

### Prazo de correção por severidade

- **Blocker**: no mesmo dia, com a branch travada até a correção
- **Grave**: até 2 dias
- **Moderada**: até 1 semana
- **Pequena**: próxima fatia do módulo afetado
- **Trivial**: sem prazo

## 9 - Documentação de Bugs

```
ID: BUG-XXX
Título: [Breve descrição]
Severidade: [Blocker/Grave/Moderada/Pequena/Trivial]
Status: [Aberto/Em andamento/Corrigido/Fechado]
Módulo: [Auth/Users/Classes/Missions/Attitudes/Rankings]
Caso de teste relacionado: [CT-XXX-000, se houver]
Data: AAAA-MM-DD
Ambiente: [Dev/Teste]
Reprodução:
  1. Passo
  2. Passo
  3. Resultado esperado x resultado obtido
Logs: [trecho relevante de logs/ ou da resposta HTTP]
Causa raiz: [quando identificada]
Correção: [commit ou merge request]
Teste de regressão: [caso adicionado à suíte]
```

O campo **Teste de regressão** é obrigatório para severidade Blocker e Grave: o bug só é fechado quando existe um teste que o reproduziria.

## 10 - Cronograma de Testes

| Fase             | Atividade                                                       | Duração  | Situação                                        |
| ---------------- | --------------------------------------------------------------- | -------- | ----------------------------------------------- |
| Planejamento     | Revisão do plano e do catálogo de casos                          | 1 dia    | ✅ concluído em 14/08/2026                      |
| Infraestrutura   | `setupDatabase`, factories e helper de autenticação              | 2 dias   | ✅ concluído — sem factories nem helper de auth, ver seção 6 |
| Integração       | Suíte por módulo, seguindo a ordem de criticidade                | 5 dias   | ✅ concluído — 13 suítes de rota                |
| Permissões       | Matriz `CT-PERM` completa                                        | 2 dias   | ✅ 53 de 53                                     |
| Unitários        | Regras isoladas de XP, nível, correção de quiz e schemas         | 2 dias   | ✅ concluído                                    |
| Ponta a ponta    | Fluxos `CT-E2E`                                                  | 1 dia    | ⬜ pendente                                     |
| Fechamento       | Cobertura, ajuste das metas e revisão do plano                   | 1 dia    | ✅ concluído em 19/08/2026 — esta versão        |

A ordem de criticidade dos módulos na fase de integração é: **auth → permissões → missões e XP → atitudes → turmas → usuários → ranking**. Autenticação vem primeiro porque todo o resto depende de um token válido, e o ranking vem por último porque é consequência do XP, e não fonte dele.

### O que continua aberto

A suíte fecha o RNF-005, mas duas frentes de teste seguem em aberto, em ordem de risco:

1. **Os quatro fluxos `CT-E2E`.** É o nível que prova que os módulos se compõem, e o único ainda vazio.
2. **`app.js` e `routes/index.js` sem cobertura**, pelo motivo descrito na seção 6 — handler 404, cabeçalhos de segurança e ordem de montagem nunca são exercitados.
## 11 - Referências

- [Jest](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/ladjs/supertest)
- [MongoDB Memory Server](https://github.com/typegoose/mongodb-memory-server)
- [Zod](https://zod.dev/)
- [JWT — RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

## 12 - Definição de Pronto

Uma funcionalidade é considerada pronta quando:

1. Passa por todos os casos de teste do seu módulo no catálogo;
2. Tem teste de integração cobrindo o caminho de sucesso e ao menos um de erro;
3. Se toca permissão, tem as linhas correspondentes da matriz `CT-PERM` verdes — papel autorizado, papel negado e, havendo posse, dono errado;
4. Não tem bug aberto com severidade acima de Moderada;
5. Está documentada no Swagger, com os códigos de erro que ela realmente devolve;
6. Passa no lint e não derruba a cobertura da `main`.
