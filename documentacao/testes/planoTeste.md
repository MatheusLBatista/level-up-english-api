# Plano de Teste

**LevelUp English - Plataforma Gamificada de Aprendizado de Inglês**

_versão 3.0_

## Histórico das alterações

| Data       | Versão | Descrição                                                                                                   | Autor(a)      |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------- | ------------- |
| 25/06/2025 | 1.0    | Primeira versão do plano de teste                                                                            | Matheus Lucas |
| 14/08/2026 | 2.0    | Atualização após os módulos de atitudes, ranking, progresso de missão e controle de acesso por papel e posse | Matheus Lucas |
| 19/08/2026 | 3.0    | Suíte implementada: estrutura real, cobertura medida, RNF-005 atendido e o que ficou fora do plano original  | Matheus Lucas |

## 1 - Introdução

O LevelUp English é uma plataforma de gamificação para aprendizado de inglês que busca tornar o processo educacional mais engajador e interativo. O sistema permite gerenciamento de usuários (alunos, professores e administradores), turmas, missões (quiz, vocabulário e áudio), atitudes em sala e ranking com pontuação por XP.

Este plano descreve a estratégia, os níveis, o ambiente e os critérios de aceitação dos testes aplicados à API. Os cenários em si estão catalogados no documento complementar [casosDeTeste.md](casosDeTeste.md), que é a lista executável — este documento diz **como e por que** testar, o outro diz **o quê**.

O escopo desta versão é a API REST. O front-end e a integração com ele ficam fora, e serão tratados quando existirem.

## 2 - Arquitetura da API

A aplicação é construída em uma arquitetura modular em camadas, utilizando Node.js, Express 5, MongoDB com Mongoose, Zod para validação de dados, JWT para autenticação e Swagger (zod-to-openapi) para documentação.

São **7 domínios**, expostos em **24 caminhos** e **39 operações** documentadas em `/api-docs`.

### Camadas

- **Routes**: definem os endpoints, declaram quem pode chamá-los e direcionam para os controllers.
  - `authRoutes.js`: autenticação e gestão de sessão
  - `userRoutes.js`: gerenciamento de usuários
  - `classRoutes.js`: gerenciamento de turmas
  - `missionRoutes.js`: gerenciamento de missões e submissão de progresso
  - `attitudeRoutes.js`: catálogo de atitudes
  - `attitudeLogRoutes.js`: atitudes aplicadas a alunos
  - `rankingRoutes.js`: ranking global e por turma

- **Controllers**: validam o corpo da requisição com Zod e chamam o service correspondente.
  - `AuthController`, `UserController`, `ClassController`, `MissionController`, `AttitudeController`, `AttitudeLogController`, `RankingController`

- **Services**: concentram as regras de negócio e a verificação de posse do recurso.
  - `AuthService`: login, refresh rotation, recuperação e troca de senha
  - `UserService`: validação de e-mail, permissões de criação/edição/exclusão
  - `ClassService`: turmas, visibilidade por papel, posse do professor
  - `MissionService`: missões, correção do quiz, ocultação do gabarito
  - `AttitudeService` / `AttitudeLogService`: catálogo de atitudes e aplicação de XP
  - `RankingService`: montagem do ranking global e por turma
  - `ProgressionService`: aplica XP, recalcula o nível e atualiza os rankings

- **Repositories**: acessam o MongoDB, isolando a persistência.
  - Paginação com `mongoose-paginate-v2`, populate de referências e filtros dedicados (`repository/filters/`)

- **Models**: definem os schemas das entidades.
  - `User` (role, xp, level, mission_progress, badges, streak, active), `Class`, `Mission`, `Attitude`, `AttitudeLog`, `Ranking`

- **Schemas (validação)**: regras de entrada e contratos de saída em Zod, reaproveitados pelo Swagger.

- **Middlewares**:
  - `AuthMiddleware`: valida o JWT e confirma que a sessão ainda existe no banco
  - `AuthPermission` (`authorize(...roles)`): bloqueia conta desativada e papel fora da lista da rota
  - `asyncWrapper`: captura erros de handlers assíncronos
  - `LogRoutesMiddleware`: log de requisições quando `DEBUGLOG` está ligado

### Regra de autorização

A regra que orienta boa parte dos casos de teste é a divisão em dois estágios:

> **O papel é verificado na rota; a posse do recurso é verificada no service.**

`authorize(...roles)` responde "este papel pode chamar esta rota?" e devolve 403 para papel fora da lista **ou** conta com `active: false`. Passando por ele, o service responde "este recurso é seu?" — a turma é do professor, a missão foi criada por ele, o log foi aplicado por ele, o perfil é o do próprio aluno.

Isso significa que **todo endpoint autenticado tem no mínimo dois casos de teste de acesso** (papel autorizado e papel não autorizado), e os endpoints com posse têm um terceiro (papel certo, dono errado).

## 3 - Categorização dos Requisitos Funcionais e Não Funcionais

### Requisitos Funcionais

| Código | Nome                           | Descrição                                                                                                                          | Prioridade    | Situação        |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------------- |
| RF-001 | Cadastro de Usuários           | Cadastro de alunos com nome, e-mail e senha. Apenas teacher/admin criam usuários, e o professor só cria aluno.                       | Essencial     | Implementado    |
| RF-002 | Login de Usuários              | Login com JWT (access + refresh token). Conta desativada não autentica.                                                              | Essencial     | Implementado    |
| RF-003 | Gestão de Turmas               | Teacher e admin criam, listam e atualizam turmas; a exclusão é exclusiva do admin. O professor só altera as turmas dele.             | Essencial     | Implementado    |
| RF-004 | Criação de Missões             | Teacher e admin criam missões de quiz, vocabulário e áudio, vinculadas a uma turma. O professor só cria nas turmas dele.             | Essencial     | Implementado    |
| RF-005 | Progresso de Missões           | O aluno submete a missão; em quiz o servidor corrige contra o gabarito e ignora o score enviado no corpo.                             | Essencial     | Implementado    |
| RF-006 | Sistema de XP e Nível          | O XP é proporcional ao score sobre o `xp_reward` e paga apenas a diferença do melhor desempenho. O nível segue curva quadrática.     | Essencial     | Implementado    |
| RF-007 | Ranking Global e por Turma     | Ranking dos 30 melhores por XP, global e por turma, recalculado a cada mudança de XP.                                                | Essencial     | Implementado    |
| RF-008 | Registro de Atitudes           | Professor aplica atitudes positivas e negativas a alunos das turmas dele, creditando ou descontando XP; desfazer estorna o XP.       | Essencial     | Implementado    |
| RF-009 | Gerenciamento de Badges        | Alunos recebem badges ao atingir marcos específicos (ex.: primeiro login, 100 XP).                                                    | Não Essencial | Não implementado |
| RF-010 | Autenticação por Refresh Token | Refresh token rotation para renovar a sessão sem novo login, com o token vigente conferido no banco.                                  | Essencial     | Implementado    |
| RF-011 | Controle de Acesso             | Papel declarado na rota e posse do recurso conferida no service; conta desativada perde acesso mesmo com token válido.                | Essencial     | Implementado    |
| RF-012 | Sigilo do Gabarito             | O aluno recebe a missão sem `questions[].correct_answer`; o gabarito fica restrito a teacher e admin.                                 | Essencial     | Implementado    |

`RF-009` continua no plano porque os campos `badges` e `streak` já existem no model, mas nenhuma regra os alimenta. Enquanto for assim, os casos correspondentes ficam marcados como **bloqueados** no catálogo, e não como falha.

### Requisitos Não Funcionais

| Código  | Nome              | Descrição                                                                                                                     | Situação                        |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| RNF-001 | Segurança         | JWT para autenticação, senhas com bcrypt, cabeçalhos com helmet, CORS e rate limiting.                                          | Parcial — sem rate limiting     |
| RNF-002 | Desempenho        | Responder em até 500 ms (p95) nos endpoints comuns, com paginação limitada a 100 registros por página.                          | Parcial — limite aplicado nos 5 repositórios; o p95 ainda não foi medido |
| RNF-003 | Escalabilidade    | Arquitetura preparada para múltiplas turmas e usuários, com índices apropriados no MongoDB.                                     | Implementado                    |
| RNF-004 | Usabilidade da API | Documentação completa via Swagger/OpenAPI, com mensagens de erro claras e padronizadas pelo `CustomError`/`CommonResponse`.    | Implementado                    |
| RNF-005 | Confiabilidade    | Mínimo de 70% de cobertura de linhas na suíte automatizada e todos os endpoints cobertos por teste de integração.               | **Atendido** — 99,67% de linhas e as 39 operações exercitadas por teste de integração (ver seção 7) |
| RNF-006 | Backup & Recovery | Backup automático do MongoDB com plano de recuperação.                                                                          | Fora do escopo desta versão     |

## 4 - Casos de Teste

Os casos estão no documento [casosDeTeste.md](casosDeTeste.md), organizados por módulo e rastreados até o requisito que verificam.

| Módulo                        | Prefixo      | Casos | Requisitos cobertos         |
| ----------------------------- | ------------ | ----- | --------------------------- |
| Autenticação e sessão         | `CT-AUTH`    | 22    | RF-001, RF-002, RF-010      |
| Usuários                      | `CT-USER`    | 17    | RF-001, RF-006, RF-011      |
| Turmas                        | `CT-CLASS`   | 12    | RF-003, RF-011              |
| Missões                       | `CT-MISSION` | 16    | RF-004, RF-011, RF-012      |
| Progressão de XP e nível      | `CT-XP`      | 10    | RF-005, RF-006              |
| Atitudes e atitudes aplicadas | `CT-ATT`     | 17    | RF-008, RF-011              |
| Ranking                       | `CT-RANK`    | 8     | RF-007, RF-011              |
| Matriz de permissões          | `CT-PERM`    | 40    | RF-011                      |
| Fluxos ponta a ponta          | `CT-E2E`     | 4     | integração entre requisitos |
| **Total**                     | -            | **146** | -                         |

Além destes, 4 casos ficam **bloqueados** enquanto badges, streak e rate limiting não existirem (seção 10 do catálogo).

**Situação em 19/08/2026: 140 dos 146 casos estão automatizados (95,9%).** As seis pendências são o token expirado em rota (`CT-AUTH-012`), a célula restritiva de `GET /attitude-logs/{id}` (`CT-PERM-033`) e os quatro fluxos ponta a ponta (`CT-E2E-001` a `004`). A contagem por módulo e o motivo de cada pendência estão na seção 11 do catálogo.

A matriz `CT-PERM` cobre uma linha por operação da API, com o status esperado para cada um dos três papéis. Ela é a rede de segurança contra regressão de permissão: qualquer rota nova entra ali antes de ser considerada pronta.

## 5 - Estratégia de Teste

A estratégia busca garantir qualidade funcional e de segurança através de níveis complementares, do mais barato e específico para o mais caro e abrangente.

### Níveis de Teste

**Testes unitários**

- Verificam lógica isolada, sem banco e sem HTTP, com as dependências substituídas por dublês.
- Responsabilidade: desenvolvedor, durante a implementação.
- Escopo:
  - `LevelHelper`: curva de nível, XP por nível, progresso e limites (nível mínimo 1, máximo 50)
  - `MissionService.resolveScore`: correção do quiz e obrigatoriedade do score fora do quiz
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
    ├── routes/                   # 7 arquivos — nível Int, a pilha completa via Supertest
    ├── controllers/              # 7 arquivos — validação Zod e envelope de resposta
    ├── services/                 # 8 arquivos — regra de negócio e posse, com dublês
    ├── repository/               # 6 arquivos + filters/ com 3
    ├── models/                   # 1 arquivo
    └── utils/                    # 3 arquivos + errors/ com 3 e helpers/ com 3
```

O `jest.setup.js`, na raiz, roda antes de cada arquivo: fixa `NODE_ENV=test`, `DISABLED_EMAIL=true` e `LOG_ENABLED=false`, garante um valor de teste para cada segredo JWT e silencia `console.log`/`console.error` para que a saída da suíte mostre só o que falhou.

Dos três apoios previstos na v2.0 deste plano, **um foi construído e dois não**:

1. `setup/testDatabase.js` — construído. `connectTestDatabase` levanta o `MongoMemoryServer`, `clearTestDatabase` esvazia as coleções entre testes e `disconnectTestDatabase` derruba tudo. Como cada arquivo de teste roda em um processo próprio do Jest, cada um levanta a própria instância e nenhum disputa dados com outro.
2. `factories` e `auth` — **não foram extraídos**. Cada suíte de rota monta o próprio elenco no `beforeEach` e tem a própria função de autenticação. É duplicação assumida: o custo de manter sete cópias apareceu como aceitável perto do risco de um helper compartilhado esconder o que cada teste realmente prepara. Se um oitavo módulo entrar, a conta muda e vale extrair.

Uma consequência dessa estrutura merece registro: **nenhuma suíte carrega `src/app.js` nem `routes/index.js`**. Cada teste de rota monta o próprio Express com o router que vai exercitar. Ficam sem cobertura o handler 404, o `helmet`/`cors`/`compression`, a ordem de montagem dos routers e o `LogRoutesMiddleware`. A causa é o `await DbConnect.conectar()` no topo do módulo de `app.js`, que conecta ao banco só de importar o arquivo; extrair uma função `createApp()` destrava esse teste.

### Cuidados com o ambiente

- **`npm run seed` apaga dados.** O seed roda `deleteMany()` em usuários, turmas, missões, atitudes e logs antes de recriar tudo, e as turmas recriadas ganham ids novos. Ele serve para popular o ambiente de testes manuais, nunca para preparar teste automatizado — estes montam o próprio cenário no `beforeEach`, contra o banco em memória, e nunca tocam o banco de desenvolvimento.
- **Variáveis de ambiente**: a suíte roda com `NODE_ENV=test` e `DISABLED_EMAIL=true`, para não disparar e-mail real em cadastro de aluno e recuperação de senha.
- **Segredos JWT**: os testes usam os mesmos nomes de variável do `.env.example`, com valores próprios de teste.

## 7 - Cobertura de Testes e Métricas

### Metas de cobertura por camada, e o que foi alcançado

Medição de 19/08/2026, com 41 arquivos de teste e 879 testes:

| Camada             | Meta  | Realizado (stmts)  | Prioridade | Justificativa                                                |
| ------------------ | ----- | ------------------ | ---------- | ------------------------------------------------------------ |
| Services           | 85%   | **99,73%**         | Alta       | Concentram regra de negócio e verificação de posse           |
| Middlewares        | 90%   | **94,59%**         | Alta       | `authorize` é a porta de entrada de toda rota autenticada    |
| Schemas/Validators | 95%   | **100%**           | Alta       | Baratos de testar e a primeira barreira contra dado inválido |
| Repositories       | 80%   | **100%**           | Alta       | Filtros e paginação são fonte recorrente de erro sutil       |
| Controllers        | 70%   | **100%**           | Média      | Camada fina; o essencial já passa pela integração            |
| Utils/Helpers      | 75%   | **100%**           | Média      | `LevelHelper` é exceção: cobertura alta, é regra de XP       |
| Routes             | —     | **100%**           | —          | Consequência das 7 suítes de rota                            |
| Models             | —     | **100%**           | —          | Consequência dos testes que gravam de verdade                |
| **Total**          | **~80%** | **99,68% stmts / 98,88% branches / 100% funcs / 99,67% linhas** | - | Piso contratual de 70% no RNF-005 |

Todas as metas foram atingidas. O único arquivo abaixo de 100% que não é meta agregada é o `AuthMiddleware.js`, com 90,9%, e as duas linhas descobertas são conhecidas:

- **linha 39** — o `if (!decoded)` depois de um `jwt.verify` que já lança quando o token não presta. É código inalcançável, não lacuna de teste: a forma de fechá-la é apagar o `if`, não escrever um teste para ele.
- **linha 63** — o `else next(err)`, caminho de um access token válido cujo usuário não tem mais refresh token no banco. Esse é lacuna real, e está registrado como `CT-AUTH-012` no catálogo.

### Uma ressalva sobre o número

O Jest está configurado sem `collectCoverageFrom`, então **a cobertura é medida apenas sobre os arquivos que algum teste importa**. Arquivos que ninguém importa não aparecem na tabela — e existem quatro deles em `src/utils/` (`handleQuery.js`, `Validator.js`, `DateHelper.js`, `getFirstLine.js`), sendo que os dois primeiros nem carregam, porque importam dependências que não estão no projeto. Os 99,68% são honestos sobre o código em uso, mas silenciosos sobre o código morto. Configurar `collectCoverageFrom` faz o número cair e passar a refletir o projeto inteiro; é o ajuste que deve acompanhar a limpeza desses arquivos.

### Métricas de qualidade da suíte

| Métrica              | Alvo                     | Medido em 19/08/2026     |
| -------------------- | ------------------------ | ------------------------ |
| Pass rate na `main`  | mínimo de 95%            | **100%** (879/879)       |
| Flakiness            | máximo de 5%             | **0** casos instáveis observados |
| Tempo de execução    | menos de 60 s            | **~7 s**                 |
| Cobertura de linhas  | mínimo de 70%            | **99,67%**               |
| Cobertura de branches | mínimo de 65%           | **98,88%**               |

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
| Integração       | Suíte por módulo, seguindo a ordem de criticidade                | 5 dias   | ✅ concluído — 7 suítes de rota                 |
| Permissões       | Matriz `CT-PERM` completa                                        | 2 dias   | ✅ 39 de 40 (falta `CT-PERM-033`)               |
| Unitários        | Regras isoladas de XP, nível, correção de quiz e schemas         | 2 dias   | ✅ concluído                                    |
| Ponta a ponta    | Fluxos `CT-E2E`                                                  | 1 dia    | ⬜ pendente                                     |
| Fechamento       | Cobertura, ajuste das metas e revisão do plano                   | 1 dia    | ✅ concluído em 19/08/2026 — esta versão        |

A ordem de criticidade dos módulos na fase de integração é: **auth → permissões → missões e XP → atitudes → turmas → usuários → ranking**. Autenticação vem primeiro porque todo o resto depende de um token válido, e o ranking vem por último porque é consequência do XP, e não fonte dele.

### O que continua aberto

A suíte fecha o RNF-005, mas três frentes de teste seguem em aberto, em ordem de risco:

1. **Os quatro fluxos `CT-E2E`.** É o nível que prova que os módulos se compõem, e o único ainda vazio.
2. **`app.js` e `routes/index.js` sem cobertura**, pelo motivo descrito na seção 6 — handler 404, cabeçalhos de segurança e ordem de montagem nunca são exercitados.
3. **Nenhuma execução automática.** Não existe `.gitlab-ci.yml`: a suíte só roda na máquina do desenvolvedor, por disciplina. Enquanto for assim, o item 6 da Definição de Pronto ("não derruba a cobertura da `main`") depende de alguém lembrar de rodar.

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
