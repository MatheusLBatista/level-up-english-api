# Plano de Teste

**LevelUp English - Plataforma Gamificada de Aprendizado de Inglês**

_versão 1.0_

## Histórico das alterações

| Data       | Versão | Descrição                         | Autor(a)      |
| ---------- | ------ | --------------------------------- | ------------- |
| 25/06/2025 | 1.0    | Primeira versão do plano de teste | Matheus Lucas |

## 1 - Introdução

O LevelUp English é uma plataforma de gamificação para aprendizado de inglês que busca tornar o processo educacional mais engajador e interativo. O sistema permite gerenciamento de usuários (alunos, professores e administradores), turmas, missões (quiz, vocabulário e áudio) e ranking com pontuação por XP.

Este plano de teste descreve os cenários de teste, critérios de aceitação e verificações que serão aplicados às funcionalidades principais do sistema, visando assegurar o funcionamento correto, a integridade dos dados, a segurança das operações e a experiência do usuário.

## 2 - Arquitetura da API

A aplicação é construída em uma arquitetura modular em camadas, utilizando Node.js, Express, MongoDB com Mongoose, Zod para validação de dados, JWT para autenticação e Swagger para documentação da API.

### Camadas:

- **Routes**: Definem os endpoints da API e direcionam requisições para os controllers.
  - `authRoutes.js`: Autenticação e gestão de sessão
  - `userRoutes.js`: Gerenciamento de usuários
  - `classRoutes.js`: Gerenciamento de turmas
  - `missionRoutes.js`: Gerenciamento de missões

- **Controllers**: Validam requisições e chamam serviços correspondentes.
  - `AuthController`: Login, registro, refresh, mudança de senha
  - `UserController`: CRUD de usuários com filtros
  - `ClassController`: CRUD de turmas
  - `MissionController`: CRUD de missões

- **Services**: Contêm regras de negócio e orquestram operações.
  - `AuthService`: Lógica de autenticação e tokens JWT
  - `UserService`: Validações de usuário, verificação de permissões
  - `ClassService`: Gerenciamento de turmas, vinculação de usuários
  - `MissionService`: Lógica de missões, XP e pontuação

- **Repositories**: Acessam dados no MongoDB, isolando lógica de persistência.
  - Suporte a paginação com `mongoose-paginate-v2`
  - Populate de referências (usuários, turmas, missões)
  - Filtros avançados

- **Models**: Definem schemas das entidades.
  - `User`: Usuários com roles (student, teacher, admin), XP, level, badges
  - `Class`: Turmas com professor e alunos
  - `Mission`: Missões de tipos quiz, vocabulary, audio
  - `Ranking`: Ranking global e por turma
  - `Attitude`: Atitudes/comportamentos dos usuários
  - `AttitudeLog`: Log de atitudes registradas

- **Schemas (Validação)**: Implementam regras com Zod.
  - Validação de entrada com `zod`
  - Schemas OpenAPI para Swagger
  - Custom error handling

- **Middlewares**: Autenticação, autorização e tratamento de erros.
  - `AuthMiddleware`: Validação de JWT
  - `AuthPermission`: Controle de acesso baseado em permissões
  - `asyncWrapper`: Tratamento de erros assíncronos
  - `LogRoutesMiddleware`: Logging de requisições

## 3 - Categorização dos Requisitos Funcionais e Não Funcionais

### Requisitos Funcionais

| Código | Nome                           | Descrição                                                                                                        | Prioridade    |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------- |
| RF-001 | Cadastro de Usuários           | O sistema deve permitir cadastro de alunos com nome, email e senha. Apenas teachers/admins podem criar usuários. | Essencial     |
| RF-002 | Login de Usuários              | Permite login com JWT tokens (access + refresh token) para usuários registrados.                                 | Essencial     |
| RF-003 | Gestão de Turmas               | Teachers e admins podem criar, listar, atualizar e deletar turmas, vincular alunos e missões.                    | Essencial     |
| RF-004 | Criação de Missões             | Teachers e admins podem criar missões de tipos: quiz, vocabulário e áudio, vinculadas a turmas específicas.      | Essencial     |
| RF-005 | Progresso de Missões           | Alunos podem executar missões e o sistema rastreia progresso com score e conclusão.                              | Essencial     |
| RF-006 | Sistema de XP e Pontuação      | O sistema calcula XP baseado na performance em missões e atualiza level dos usuários.                            | Essencial     |
| RF-007 | Ranking Global e por Turma     | O sistema exibe ranking de usuários com melhor pontuação globalmente e por turma.                                | Essencial     |
| RF-008 | Registro de Atitudes           | O sistema registra atitudes/comportamentos dos usuários para análise de engagement.                              | Não Essencial |
| RF-009 | Gerenciamento de Badges        | Alunos recebem badges ao atingir marcos específicos (ex: primeiro login, 100 XP).                                | Não Essencial |
| RF-010 | Autenticação por Refresh Token | Suporte a refresh token rotation para renovar sessão sem re-login.                                               | Essencial     |

### Requisitos Não Funcionais

| Código  | Nome              | Descrição                                                                                                           |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| RNF-001 | Segurança         | Implementar JWT para autenticação, hashing de senhas com bcrypt, proteção CORS e rate limiting conforme necessário. |
| RNF-002 | Desempenho        | Responder requisições em até 500ms (p95) para endpoints comuns, com suporte a paginação de até 100 registros.       |
| RNF-003 | Escalabilidade    | Arquitetura preparada para múltiplas turmas e usuários, com índices apropriados no MongoDB.                         |
| RNF-004 | Usabilidade API   | Documentação completa via Swagger/OpenAPI, mensagens de erro claras e padronizadas.                                 |
| RNF-005 | Confiabilidade    | Cobertura mínima de 70% em testes unitários, todos endpoints cobertos por testes de integração.                     |
| RNF-006 | Backup & Recovery | Backup automático do MongoDB com plano de disaster recovery.                                                        |

## 4 - Casos de Teste

### 4.1 - Testes de Autenticação (Auth Module)

#### CT-AUTH-001: Login com credenciais válidas

- **Cenário**: Usuário fornece email e senha corretos
- **Entrada**: `{ email: "user@example.com", password: "senha123" }`
- **Resultado Esperado**: Status 200, tokens access e refresh retornados
- **Critério de Aceitação**: Token JWT válido pode ser usado em próximas requisições

#### CT-AUTH-002: Login com credenciais inválidas

- **Cenário**: Usuário fornece email ou senha incorretos
- **Entrada**: `{ email: "user@example.com", password: "wrongpass" }`
- **Resultado Esperado**: Status 401, mensagem "Credenciais inválidas"
- **Critério de Aceitação**: Usuário não consegue acessar endpoints protegidos

#### CT-AUTH-003: Registro de aluno por teacher

- **Cenário**: Teacher registra novo aluno via `/auth/register-student`
- **Entrada**: `{ name: "João", email: "joao@example.com", class: "classId" }`
- **Resultado Esperado**: Status 201, usuário criado com role "student"
- **Critério de Aceitação**: Email enviado, senha gerada temporária

#### CT-AUTH-004: Refresh token rotation

- **Cenário**: Usuário usa refresh token para renovar access token
- **Entrada**: `{ refreshToken: "validRefreshToken" }`
- **Resultado Esperado**: Status 200, novo access + refresh token
- **Critério de Aceitação**: Novo refresh token diferente do anterior

#### CT-AUTH-005: Token expirado

- **Cenário**: Usuário tenta usar access token expirado
- **Resultado Esperado**: Status 401, mensagem "Token expirado"
- **Critério de Aceitação**: Usuário precisa fazer refresh ou re-login

### 4.2 - Testes de Usuários (User Module)

#### CT-USER-001: Listar usuários com filtros

- **Cenário**: Admin lista usuários com filtro por role e ativo
- **Entrada**: `GET /users?role=student&active=true&page=1&limit=10`
- **Resultado Esperado**: Status 200, array de usuários com paginação
- **Critério de Aceitação**: Apenas students ativos retornados

#### CT-USER-002: Criar usuário sem permissão

- **Cenário**: Student tenta criar novo usuário
- **Entrada**: `POST /users` com dados de novo usuário
- **Resultado Esperado**: Status 403, "Students cannot create users"
- **Critério de Aceitação**: Operação rejeitada por falta de permissão

#### CT-USER-003: Atualizar perfil próprio

- **Cenário**: Usuário atualiza seus próprios dados
- **Entrada**: `PATCH /users/myId` com `{ name: "Novo Nome" }`
- **Resultado Esperado**: Status 200, dados atualizados
- **Critério de Aceitação**: Campos sensíveis (role, xp) não são atualizáveis por students

#### CT-USER-004: Deletar usuário

- **Cenário**: Admin deleta usuário do sistema
- **Entrada**: `DELETE /users/userId`
- **Resultado Esperado**: Status 200, usuário removido
- **Critério de Aceitação**: Usuário não aparece mais em listagens

### 4.3 - Testes de Turmas (Class Module)

#### CT-CLASS-001: Criar turma como teacher

- **Cenário**: Teacher cria nova turma
- **Entrada**: `POST /classes` com `{ name: "Turma A", active: true }`
- **Resultado Esperado**: Status 201, turma criada com teacher como proprietário
- **Critério de Aceitação**: Teacher field preenchido automaticamente com user_id

#### CT-CLASS-002: Listar turmas com paginação

- **Cenário**: Usuário lista todas as turmas
- **Entrada**: `GET /classes?page=1&limit=10`
- **Resultado Esperado**: Status 200, array com até 10 turmas
- **Critério de Aceitação**: Teacher poblado com dados do usuário

#### CT-CLASS-003: Atualizar turma

- **Cenário**: Teacher atualiza dados da turma
- **Entrada**: `PATCH /classes/classId` com `{ name: "Turma A - 2025" }`
- **Resultado Esperado**: Status 200, turma atualizada
- **Critério de Aceitação**: Nome único validado

#### CT-CLASS-004: Nome duplicado

- **Cenário**: Tenta criar turma com nome já existente
- **Entrada**: `POST /classes` com `{ name: "Turma Existente" }`
- **Resultado Esperado**: Status 400, "Class already exists"
- **Critério de Aceitação**: Validação case-insensitive

#### CT-CLASS-005: Deletar turma

- **Cenário**: Admin deleta turma do sistema
- **Entrada**: `DELETE /classes/classId`
- **Resultado Esperado**: Status 200
- **Critério de Aceitação**: Turma removida do banco, missões órfãs tratadas

### 4.4 - Testes de Missões (Mission Module)

#### CT-MISSION-001: Criar missão com validação

- **Cenário**: Teacher cria quiz para sua turma
- **Entrada**: `POST /missions` com tipo "quiz", turma válida, questions array
- **Resultado Esperado**: Status 201, missão criada
- **Critério de Aceitação**: XP reward padrão atribuído

#### CT-MISSION-002: Listar missões por turma

- **Cenário**: Aluno vê missões da sua turma
- **Entrada**: `GET /missions?class_id=classId`
- **Resultado Esperado**: Status 200, apenas missões ativas da turma
- **Critério de Aceitação**: Filter automático por turma do student

#### CT-MISSION-003: Atualizar missão

- **Cenário**: Teacher edita detalhes da missão
- **Entrada**: `PATCH /missions/missionId` com novos dados
- **Resultado Esperado**: Status 200
- **Critério de Aceitação**: Mudança de turma atualiza referências

#### CT-MISSION-004: Missão com tipo inválido

- **Cenário**: Tenta criar missão com tipo não suportado
- **Entrada**: `POST /missions` com `type: "invalid"`
- **Resultado Esperado**: Status 400, mensagem de validação
- **Critério de Aceitação**: Apenas quiz, vocabulary, audio aceitos

### 4.5 - Testes de Ranking

#### CT-RANKING-001: Ranking global

- **Cenário**: Listar ranking global dos usuários
- **Entrada**: `GET /rankings?type=global`
- **Resultado Esperado**: Status 200, usuários ordenados por XP desc
- **Critério de Aceitação**: Top 100 retornado com paginação

#### CT-RANKING-002: Ranking por turma

- **Cenário**: Listar ranking específico de uma turma
- **Entrada**: `GET /rankings?type=class&class_id=classId`
- **Resultado Esperado**: Status 200, apenas alunos da turma
- **Critério de Aceitação**: Ordenação correta por XP

### 4.6 - Casos de Teste de Integração (End-to-end)

#### CT-E2E-001: Fluxo completo de turma

1. Teacher cria turma
2. Teacher cria missão quiz para turma
3. Student acessa turma
4. Student executa missão
5. XP atualizado, ranking recalculado

#### CT-E2E-002: Fluxo de onboarding

1. Admin registra novo student via email
2. Student faz login com password temporário
3. Student muda password
4. Student recebe badge "First Login"
5. Student vê turma atribuída

## 5 - Estratégia de Teste

A estratégia de teste adotada busca garantir qualidade funcional, de performance e segurança do LevelUp English através de múltiplos níveis de teste alinhados ao ciclo de desenvolvimento.

### Níveis de Teste

**Testes Unitários** (70% de cobertura)

- Focados em verificar lógica isolada de funções, serviços e regras de negócio
- Responsabilidade: Desenvolvedor durante implementação
- Escopo:
  - Validações de schemas (Zod)
  - Lógica de services (cálculo XP, validações)
  - Métodos de repositories
  - Helpers e utilities

**Testes de Integração** (100% de endpoints)

- Verificam interação entre camadas (controller → service → repository → DB)
- Usam MongoDB Memory Server para isolamento
- Responsabilidade: Desenvolvedor e QA
- Escopo:
  - Endpoints completos CRUD
  - Fluxos de autenticação
  - Perguntas/respostas com status corretos
  - Validações de permissões

**Testes de API** (Manual com Swagger/Postman)

- Validam diferentes fluxos de uso real
- Executados durante desenvolvimento e após features
- Responsabilidade: Desenvolvedor e QA
- Escopo:
  - Cenários de sucesso
  - Casos edge (valores limite, null, etc)
  - Fluxos completos de negócio
  - Performance com dados reais

**Testes de Segurança** (Spot-check)

- Verificam proteções de autenticação e autorização
- Validam tratamento de dados sensíveis
- Responsabilidade: QA/Security team
- Escopo:
  - JWT válido/inválido/expirado
  - Acesso a endpoints sem token
  - Escalação de privilégio (student → admin)
  - SQL/NoSQL injection (nível básico)

### Execução de Testes

1. **Durante desenvolvimento**: Developer executa testes locais
2. **Antes de commit**: Validação mínima (lint + testes afetados)
3. **Antes de merge**: Suite completa (CI/CD pipeline)
4. **Pre-release**: Smoke tests e testes e2e

### Ciclo de Correção

- Bug encontrado em teste → Ticket criado
- Fix implementado → Teste adicionado/atualizado
- Validação em dev → Merge para main

## 6 - Ambiente e Ferramentas

Os testes serão executados localmente no ambiente de desenvolvimento com mesmas configurações do ambiente de produção.

### Ferramentas de Teste

| Ferramenta                | Propósito                                      | Responsável       |
| ------------------------- | ---------------------------------------------- | ----------------- |
| **Jest**                  | Framework para testes unitários e integração   | Desenvolvedor     |
| **Supertest**             | Framework para testes de endpoints REST/HTTP   | Desenvolvedor     |
| **MongoDB Memory Server** | Banco de dados em memória para testes isolados | Desenvolvedor     |
| **Postman/Swagger UI**    | Testes manuais de API                          | Desenvolvedor/QA  |
| **ESLint**                | Linting e detecção de código problemático      | Desenvolvedor     |
| **Winston**               | Logging para análise de comportamento          | Desenvolvedor/QA  |
| **bcrypt**                | Validação de senhas durante testes             | Framework interno |

### Configuração do Ambiente de Teste

```bash
# Instalar dependências
npm install

# Executar todos os testes com cobertura
npm run test

# Executar testes em modo watch (desenvolvimento)
npm run test -- --watch

# Executar apenas um arquivo de teste
npm run test -- src/__tests__/modules/auth.test.js

# Verificar cobertura
npm run test -- --coverage
```

### Estrutura de Testes

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── classes/
│   │   └── missions/
│   └── fixtures/
│       ├── users.json
│       ├── classes.json
│       └── missions.json
```

### Executar Testes

```bash
# Desenvolvimento
npm run dev

# Testes com cobertura
npm run test -- --coverage

# Seed do banco (para testes manuais)
npm run seed

# Build e start produção
npm run start
```

## 7 - Cobertura de Testes e Métricas

### Metas de Cobertura

| Módulo             | Cobertura Esperada | Prioridade |
| ------------------ | ------------------ | ---------- |
| Services           | 85%                | Alta       |
| Repositories       | 80%                | Alta       |
| Controllers        | 70%                | Média      |
| Middlewares        | 90%                | Alta       |
| Schemas/Validators | 95%                | Alta       |
| Utils/Helpers      | 75%                | Média      |
| **Total**          | **~80%**           | -          |

### Métricas de Teste

- **Pass Rate**: Mínimo 95% em main branch
- **Flakiness**: Máximo 5% (testes que falham aleatoriamente)
- **Execution Time**: Suite completa em < 60s
- **Code Coverage**: Mínimo 70% lines, 65% branches

## 8 - Classificação de Bugs

Os bugs serão classificados por severidade para priorização de correção:

| Nível | Severidade   | Descrição                                                                            | Exemplo                                                                                               |
| ----- | ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1     | **Blocker**  | Bug que impede funcionalidade crítica ou causa crash da aplicação. Bloqueia entrega. | • Login não funciona • Banco de dados down • Erro 500 em rota essencial                               |
| 2     | **Grave**    | Funcionalidade não funciona como esperado. Impacta fluxo principal de negócio.       | • XP não é calculado corretamente • Turma não vincula alunos • Token não faz refresh                  |
| 3     | **Moderada** | Funcionalidade tem comportamento inesperado mas alternativa existe. Impacto parcial. | • Filtro de listagem com bug edge case • Mensagem de erro incompleta • Paginação com offset incorreto |
| 4     | **Pequena**  | Impacto mínimo na funcionalidade. Afeta experiência mas não bloqueia uso.            | • Erro ortográfico em mensagem • Campo com styling incorreto • Ordem de campos em resposta            |
| 5     | **Trivial**  | Sugestão de melhoria sem impacto funcional.                                          | • Melhorar log de debug • Refactor de código limpo                                                    |

### SLA de Correção por Severidade

- **Blocker**: Máximo 2 horas
- **Grave**: Máximo 24 horas
- **Moderada**: Máximo 72 horas
- **Pequena**: Próximo sprint
- **Trivial**: Sem prazo

## 9 - Cronograma de Testes

| Fase            | Atividade                         | Duração  | Responsável        |
| --------------- | --------------------------------- | -------- | ------------------ |
| Planejamento    | Definição de casos de teste       | 2 dias   | QA Lead + Dev Lead |
| Desenvolvimento | Implementação de testes unitários | Contínuo | Desenvolvedor      |
| Integration     | Testes de integração de módulos   | Semanal  | Desenvolvedor + QA |
| Sistema         | Testes e2e de fluxos completos    | Semanal  | QA                 |
| Regressão       | Smoke tests ante release          | 1 dia    | QA                 |
| UAT             | Testes de aceitação do usuário    | 3 dias   | Cliente + QA       |

## 10 - Documentação de Bugs

### Formato de Relatório de Bug

```
ID: BUG-XXX
Título: [Breve descrição]
Severidade: [Blocker/Grave/Moderada/Pequena/Trivial]
Status: [Open/In Progress/Fixed/Closed]
Módulo: [Auth/Users/Classes/Missions/Ranking]
Data Identificação: YYYY-MM-DD
Ambiente: [Dev/Staging/Prod]
Reprodução:
  1. Passo 1
  2. Passo 2
  3. Resultado esperado vs. resultado atual
Logs/Screenshots: [Anexar]
Análise: [Root cause análise se disponível]
Correção: [PR link]
```

## 11 - Referências e Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/typegoose/mongodb-memory-server)
- [Zod Validation](https://zod.dev/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

### 8 - Definição de Pronto

Será considerada pronta as funcionalidades que passarem pelas verificações e testes descritas nos casos de teste, não apresentarem bugs com a severidade acima de moderada, e passarem por uma validação da equipe.
