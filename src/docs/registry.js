import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  UserSchema,
  CreateUserBodySchema,
  UpdateUserBodySchema,
  LevelProgressSchema,
} from "../schemas/UserSchema.js";
import {
  LoginBodySchema,
  LoginResponseSchema,
  RevokeParamsSchema,
  RefreshBodySchema,
  RefreshResponseSchema,
  ChangePasswordBodySchema,
  ForgotPasswordBodySchema,
  ResetPasswordBodySchema,
  RegisterStudentBodySchema,
  RegisterTeacherBodySchema,
} from "../schemas/AuthSchema.js";
import {
  MissionSchema,
  CreateMissionBodySchema,
  UpdateMissionBodySchema,
  SubmitMissionProgressBodySchema,
  MissionProgressSchema,
  MissionWriteResponseSchema,
} from "../schemas/MissionSchema.js";
import {
  ClassSchema,
  ClassListItemSchema,
  ClassWriteResponseSchema,
  CreateClassBodySchema,
  UpdateClassBodySchema,
} from "../schemas/ClassSchema.js";
import {
  AttitudeSchema,
  AttitudeWriteResponseSchema,
  CreateAttitudeBodySchema,
  UpdateAttitudeBodySchema,
} from "../schemas/AttitudeSchema.js";
import {
  AttitudeLogSchema,
  CreateAttitudeLogBodySchema,
  UpdateAttitudeLogBodySchema,
  AttitudeLogWithProgressionSchema,
  UpdatedAttitudeLogSchema,
  LevelProgressionSchema,
} from "../schemas/AttitudeLogSchema.js";
import {
  CreateXpAdjustmentBodySchema,
  XpAdjustmentWithProgressionSchema,
} from "../schemas/XpAdjustmentSchema.js";
import {
  RankingSchema,
  RankingEntrySchema,
  RefreshRankingResponseSchema,
  RankingClassIdParamSchema,
} from "../schemas/RankingSchema.js";
import {
  TeacherRefSchema,
  StudentRefSchema,
  UserContactRefSchema,
  UserNameRefSchema,
  ClassRefSchema,
  MissionRefSchema,
  AttitudeRefSchema,
} from "../schemas/PopulatedRefSchemas.js";

const registry = new OpenAPIRegistry();

// Referências populadas — campos que o model declara como ObjectId e a API
// devolve como objeto. Registrados antes dos schemas que os usam.
registry.register("TeacherRef", TeacherRefSchema);
registry.register("StudentRef", StudentRefSchema);
registry.register("UserContactRef", UserContactRefSchema);
registry.register("UserNameRef", UserNameRefSchema);
registry.register("ClassRef", ClassRefSchema);
registry.register("MissionRef", MissionRefSchema);
registry.register("AttitudeRef", AttitudeRefSchema);

registry.register("User", UserSchema);
registry.register("LevelProgress", LevelProgressSchema);
registry.register("LevelProgression", LevelProgressionSchema);
registry.register("AttitudeLogWithProgression", AttitudeLogWithProgressionSchema);
registry.register("Attitude", AttitudeSchema);
registry.register("AttitudeWriteResponse", AttitudeWriteResponseSchema);
registry.register("CreateAttitudeBody", CreateAttitudeBodySchema);
registry.register("UpdateAttitudeBody", UpdateAttitudeBodySchema);
registry.register("AttitudeLog", AttitudeLogSchema);
registry.register("UpdatedAttitudeLog", UpdatedAttitudeLogSchema);
registry.register("CreateAttitudeLogBody", CreateAttitudeLogBodySchema);
registry.register("UpdateAttitudeLogBody", UpdateAttitudeLogBodySchema);
registry.register("CreateXpAdjustmentBody", CreateXpAdjustmentBodySchema);
registry.register("XpAdjustmentWithProgression", XpAdjustmentWithProgressionSchema);
registry.register("Mission", MissionSchema);
registry.register("MissionWriteResponse", MissionWriteResponseSchema);
registry.register("Class", ClassSchema);
registry.register("ClassListItem", ClassListItemSchema);
registry.register("ClassWriteResponse", ClassWriteResponseSchema);
registry.register("CreateMissionBody", CreateMissionBodySchema);
registry.register("UpdateMissionBody", UpdateMissionBodySchema);
registry.register("SubmitMissionProgressBody", SubmitMissionProgressBodySchema);
registry.register("MissionProgress", MissionProgressSchema);
registry.register("CreateClassBody", CreateClassBodySchema);
registry.register("UpdateClassBody", UpdateClassBodySchema);
registry.register("LoginBody", LoginBodySchema);
registry.register("LoginResponse", LoginResponseSchema);
registry.register("RevokeParams", RevokeParamsSchema);
registry.register("RegisterStudentBody", RegisterStudentBodySchema);
registry.register("RegisterTeacherBody", RegisterTeacherBodySchema);
registry.register("ForgotPasswordBody", ForgotPasswordBodySchema);
registry.register("ResetPasswordBody", ResetPasswordBodySchema);
registry.register("ChangePasswordBody", ChangePasswordBodySchema);
registry.register("RefreshBody", RefreshBodySchema);
registry.register("RefreshResponse", RefreshResponseSchema);
registry.register("CreateUserBody", CreateUserBodySchema);
registry.register("UpdateUserBody", UpdateUserBodySchema);
registry.register("Ranking", RankingSchema);
registry.register("RankingEntry", RankingEntrySchema);
registry.register("RefreshRankingResponse", RefreshRankingResponseSchema);

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const commonResponse = (dataSchema, description) => ({
  description,
  content: {
    "application/json": {
      schema: z.object({
        message: z.string(),
        data: dataSchema,
        errors: z.array(z.any()),
      }),
    },
  },
});

const errorResponse = (description, messageExample, errorsExample = []) => ({
  description,
  content: {
    "application/json": {
      schema: z.object({
        message: z.string().openapi({ example: messageExample }),
        data: z.null().openapi({ example: null }),
        errors: z.array(z.any()).openapi({ example: errorsExample }),
      }),
    },
  },
});

const error400 = errorResponse(
  "Dados inválidos",
  "Erro de validação. 1 campo(s) inválido(s).",
  [{ path: "email", message: "Invalid email" }],
);

const error401Credentials = errorResponse(
  "Credenciais inválidas ou conta desativada",
  "Credenciais inválidas. Verifique seu usuário e senha.",
);

const error401Token = errorResponse(
  "Token ausente ou inválido",
  "O token de autenticação não existe!",
  [{ message: "O token de autenticação não existe!" }],
);

const error401TokenExpired = errorResponse(
  "Token expirado",
  "O token JWT está expirado!",
  [{ message: "O token JWT está expirado!" }],
);

// 403 devolvido pelo authorize(), quando a conta está desativada ou o papel do
// usuário não está na lista da rota.
const error403 = errorResponse(
  "Conta desativada, ou papel sem acesso à rota",
  "Permissão insuficiente para executar a operação.",
);

const error404User = errorResponse(
  "Usuário não encontrado",
  "Recurso não encontrado em User.",
);

const classIdParam = z.object({
  id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
});

const error404Class = errorResponse(
  "Turma não encontrada",
  "Recurso não encontrado em Class.",
);

const error400Class = errorResponse(
  "Dados inválidos, nome repetido (path name: \"Já existe uma turma com este nome.\"), "
  + "professor inválido (path teacher: \"Escolha um professor ativo.\") ou algum id de "
  + "students que não é de aluno (path students: \"Todos os ids devem ser de alunos cadastrados.\")",
  "Escolha um professor ativo.",
  [{ path: "teacher", message: "Escolha um professor ativo." }],
);

// ─── Auth ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login",
  request: {
    body: { content: { "application/json": { schema: LoginBodySchema } } },
  },
  responses: {
    200: commonResponse(LoginResponseSchema, "Login realizado com sucesso"),
    400: error400,
    401: error401Credentials,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/register-student",
  tags: ["Auth"],
  summary: "Cadastrar aluno (teacher/admin) — envia e-mail de boas-vindas",
  description:
    "Para professor, class é obrigatório e a turma precisa existir, estar ativa e ser "
    + "dele; admin cadastra em qualquer turma ou sem turma. Se class for informado, a "
    + "turma precisa existir e estar ativa; isso é conferido antes de criar o aluno e "
    + "enviar o e-mail, então uma turma inválida não deixa usuário criado pela metade. "
    + "Criado o aluno, o id dele entra em Class.students da turma.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: RegisterStudentBodySchema } },
    },
  },
  responses: {
    201: commonResponse(UserSchema, "Aluno cadastrado e e-mail enviado"),
    400: errorResponse(
      "Dados inválidos, e-mail já cadastrado (path email), turma inexistente/inativa "
      + "(path class, \"Turma não encontrada ou inativa.\") ou professor sem turma "
      + "(path class, \"Escolha uma das suas turmas.\")",
      "Turma não encontrada ou inativa.",
      [{ path: "class", message: "Turma não encontrada ou inativa." }],
    ),
    401: error401Token,
    403: errorResponse(
      "Conta desativada, papel sem acesso à rota, ou professor usando turma que não é "
      + "dele, inexistente ou inativa",
      "Você só pode cadastrar alunos nas suas turmas.",
    ),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/register-teacher",
  tags: ["Auth"],
  summary: "Cadastrar professor (admin) — envia e-mail de boas-vindas",
  description:
    "Cria o professor sem senha e envia um e-mail com o link /set-password?code=, válido "
    + "por 24 horas — o mesmo fluxo do cadastro de aluno. Se classes for informado, todas "
    + "as turmas precisam existir e estar ativas; isso é conferido antes de criar o "
    + "professor, então um id errado não deixa professor criado sem as turmas. Criado o "
    + "professor, ele passa a ser o teacher de cada turma informada, substituindo o "
    + "professor anterior.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: RegisterTeacherBodySchema } },
    },
  },
  responses: {
    201: commonResponse(UserSchema, "Professor cadastrado e e-mail enviado"),
    400: errorResponse(
      "Dados inválidos, e-mail já cadastrado (path email, \"Este e-mail já está cadastrado.\") "
      + "ou alguma turma inexistente/inativa (path classes, \"Turma não encontrada ou inativa.\")",
      "Turma não encontrada ou inativa.",
      [{ path: "classes", message: "Turma não encontrada ou inativa." }],
    ),
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Renovar tokens (refresh rotation)",
  request: {
    body: { content: { "application/json": { schema: RefreshBodySchema } } },
  },
  responses: {
    200: commonResponse(RefreshResponseSchema, "Tokens renovados com sucesso"),
    401: errorResponse(
      "Refresh token inválido ou expirado, ou conta desativada",
      "Token inválido. Faça login novamente.",
    ),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Auth"],
  summary: "Solicitar redefinição de senha",
  request: {
    body: {
      content: { "application/json": { schema: ForgotPasswordBodySchema } },
    },
  },
  responses: {
    200: commonResponse(z.null(), "Instruções enviadas por e-mail"),
    400: error400,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Auth"],
  summary: "Redefinir senha com código de recuperação",
  request: {
    body: {
      content: { "application/json": { schema: ResetPasswordBodySchema } },
    },
  },
  responses: {
    200: commonResponse(z.null(), "Senha redefinida com sucesso"),
    400: errorResponse(
      "Código inválido ou expirado",
      "Código de recuperação inválido ou expirado.",
      [
        {
          path: "code",
          message: "Código de recuperação inválido ou expirado.",
        },
      ],
    ),
  },
});

registry.registerPath({
  method: "patch",
  path: "/auth/change-password",
  tags: ["Auth"],
  summary: "Alterar senha do usuário logado",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: ChangePasswordBodySchema } },
    },
  },
  responses: {
    200: commonResponse(z.null(), "Senha alterada com sucesso"),
    400: error400,
    401: errorResponse(
      "Senha atual incorreta ou token inválido",
      "Senha atual incorreta.",
      [{ path: "currentPassword", message: "Senha atual incorreta." }],
    ),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout",
  security: [{ bearerAuth: [] }],
  responses: {
    200: commonResponse(z.null(), "Logout realizado com sucesso"),
    401: error401Token,
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/revoke/{userId}",
  tags: ["Auth"],
  summary: "Revogar sessão de um usuário (admin)",
  security: [{ bearerAuth: [] }],
  request: {
    params: RevokeParamsSchema,
  },
  responses: {
    200: commonResponse(z.null(), "Sessão revogada com sucesso"),
    401: error401Token,
    403: error403,
    404: error404User,
  },
});

// ─── Users ───────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/users",
  tags: ["Users"],
  summary: "Listar usuários (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      name: z.string().optional().openapi({ example: "John" }),
      email: z.string().optional().openapi({ example: "john@example.com" }),
      role: z.enum(["student", "teacher", "admin"]).optional(),
      class: z.string().optional().openapi({
        example: "507f1f77bcf86cd799439011",
        description:
          "Id da turma. Professor só pode filtrar turma que é dele; admin filtra qualquer uma. "
          + "O valor none (só admin) lista quem não tem turma (class nulo ou ausente); "
          + "combine com role=student para listar os alunos sem turma.",
      }),
      active: z.string().optional().openapi({ example: "true" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(UserSchema), "Lista de usuários"),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, professor filtrando turma de outro professor, ou professor "
      + "usando class=none (\"Só o admin pode listar alunos sem turma.\")",
      "Você só pode listar alunos das suas turmas.",
    ),
    404: error404Class,
  },
});

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Buscar usuário por ID (aluno só o próprio perfil)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    }),
  },
  responses: {
    200: commonResponse(UserSchema, "Usuário encontrado"),
    401: error401Token,
    403: errorResponse(
      "Aluno consultando o perfil de outro usuário",
      "Students can only view their own profile.",
    ),
    404: error404User,
  },
});

registry.registerPath({
  method: "post",
  path: "/users",
  tags: ["Users"],
  summary: "Criar usuário (teacher/admin; professor só cria aluno)",
  description:
    "Para professor, class é obrigatório e a turma precisa existir, estar ativa e ser "
    + "dele; admin cria em qualquer turma ou sem turma. Se class for informado, o "
    + "usuário precisa ser aluno e a turma precisa existir e estar ativa, conferidos "
    + "antes de criar. Criado o aluno, o id dele entra em Class.students da turma.",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateUserBodySchema } } },
  },
  responses: {
    201: commonResponse(UserSchema, "Usuário criado"),
    400: errorResponse(
      "Dados inválidos, e-mail já cadastrado, ou turma inválida (path class: "
      + "\"Turma não encontrada.\", \"Turma não encontrada ou inativa.\", "
      + "\"Apenas alunos podem ser vinculados a uma turma.\" ou, para professor sem "
      + "turma, \"Escolha uma das suas turmas.\")",
      "Turma não encontrada ou inativa.",
      [{ path: "class", message: "Turma não encontrada ou inativa." }],
    ),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, professor tentando criar teacher/admin (\"Only admins "
      + "can create users with a role other than student.\"), ou professor usando turma "
      + "que não é dele, inexistente ou inativa",
      "Você só pode cadastrar alunos nas suas turmas.",
    ),
  },
});

registry.registerPath({
  method: "post",
  path: "/users/recalculate-levels",
  tags: ["Users"],
  summary: "Recalcular o nível de todos os usuários a partir do XP (admin)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: commonResponse(
      z.object({ updated: z.number().openapi({ example: 12 }) }),
      "Níveis recalculados. updated é a quantidade de usuários que estavam desatualizados",
    ),
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Atualizar usuário",
  description:
    "Trocar a turma (class) é só para admin; nos demais papéis o campo é ignorado. "
    + "Com um id, o alvo precisa ser aluno e a turma precisa existir: o id do aluno sai "
    + "de Class.students da turma antiga e entra no da nova. Com class: null, o aluno "
    + "sai da turma atual e fica sem turma.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    }),
    body: { content: { "application/json": { schema: UpdateUserBodySchema } } },
  },
  responses: {
    200: commonResponse(UserSchema, "Usuário atualizado"),
    400: errorResponse(
      "Dados inválidos, ou turma inválida (path class: \"Turma não encontrada.\" ou "
      + "\"Apenas alunos podem ser vinculados a uma turma.\")",
      "Turma não encontrada.",
      [{ path: "class", message: "Turma não encontrada." }],
    ),
    401: error401Token,
    403: errorResponse(
      "Tentativa de atualizar outro usuário sem ser admin",
      "You do not have permission to update another user.",
    ),
    404: error404User,
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Deletar usuário (aluno só a própria conta; professor, alunos das turmas dele e a própria conta)",
  description:
    "Professor só exclui aluno cuja turma é dele (ativa ou não); aluno sem turma ou de "
    + "turma de outro professor devolve 403. Admin exclui qualquer conta.",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    }),
  },
  responses: {
    200: commonResponse(z.null(), "Usuário deletado"),
    401: error401Token,
    403: errorResponse(
      "Aluno tentando deletar a conta de outro usuário, professor tentando deletar conta "
      + "de teacher/admin (\"Teachers can only delete student accounts.\"), ou professor "
      + "tentando deletar aluno sem turma ou de turma de outro professor",
      "Você só pode excluir alunos das suas turmas.",
    ),
    404: error404User,
  },
});

// ─── Classes ────────────────────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/classes",
  tags: ["Classes"],
  summary: "Listar turmas (aluno recebe apenas a própria)",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      name: z.string().optional().openapi({ example: "Turma A" }),
      active: z.string().optional().openapi({ example: "true" }),
      teacher: z
        .string()
        .optional()
        .openapi({ example: "507f1f77bcf86cd799439011" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(ClassListItemSchema), "Lista de turmas (students e missions vêm como ids)"),
    401: error401Token,
  },
});

registry.registerPath({
  method: "get",
  path: "/classes/{id}",
  tags: ["Classes"],
  summary: "Buscar turma por ID (aluno só a própria turma)",
  security: [{ bearerAuth: [] }],
  request: {
    params: classIdParam,
  },
  responses: {
    200: commonResponse(ClassSchema, "Turma encontrada"),
    401: error401Token,
    403: errorResponse(
      "Aluno consultando turma que não é a dele",
      "Você só pode ver a sua turma.",
    ),
    404: error404Class,
  },
});

registry.registerPath({
  method: "post",
  path: "/classes",
  tags: ["Classes"],
  summary: "Criar turma (teacher/admin)",
  description:
    "Professor logado vira o dono da turma e o teacher enviado é ignorado; o admin pode "
    + "informar um teacher, que precisa ser professor ativo. Os ids em students precisam "
    + "ser de alunos cadastrados: cada um passa a ter class apontando para esta turma e "
    + "sai do Class.students da turma em que estava.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateClassBodySchema } },
    },
  },
  responses: {
    201: commonResponse(ClassWriteResponseSchema, "Turma criada (relacionamentos como ids)"),
    400: error400Class,
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "patch",
  path: "/classes/{id}",
  tags: ["Classes"],
  summary: "Atualizar turma (teacher/admin; professor só a própria turma)",
  description:
    "Professor só altera a própria turma e não troca o teacher; o admin pode trocar, "
    + "desde que seja um professor ativo, ou enviar teacher: null para deixar a turma sem "
    + "professor. Se students for enviado, ele substitui a lista "
    + "inteira: os alunos adicionados passam a ter class apontando para esta turma e saem "
    + "da turma anterior; os removidos ficam com class nulo, a menos que já tenham sido "
    + "movidos para outra turma.",
  security: [{ bearerAuth: [] }],
  request: {
    params: classIdParam,
    body: {
      content: { "application/json": { schema: UpdateClassBodySchema } },
    },
  },
  responses: {
    200: commonResponse(ClassWriteResponseSchema, "Turma atualizada (relacionamentos como ids)"),
    400: error400Class,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou turma de outro professor",
      "Você só pode editar as suas turmas.",
    ),
    404: error404Class,
  },
});

registry.registerPath({
  method: "delete",
  path: "/classes/{id}",
  tags: ["Classes"],
  summary: "Deletar turma (admin)",
  security: [{ bearerAuth: [] }],
  request: {
    params: classIdParam,
  },
  responses: {
    200: commonResponse(z.null(), "Turma deletada"),
    401: error401Token,
    403: error403,
    404: error404Class,
  },
});

// ─── Missions ────────────────────────────────────────────────────────────────

const missionIdParam = z.object({
  id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
});

const error404Mission = errorResponse(
  "Missão não encontrada",
  "Recurso não encontrado em Mission.",
);

registry.registerPath({
  method: "get",
  path: "/missions",
  tags: ["Missions"],
  summary: "Listar missões",
  description:
    "O aluno recebe apenas as missões da própria turma, e sem o gabarito: o campo "
    + "questions[].correct_answer é omitido. Teacher e admin recebem a missão completa.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      title: z.string().optional().openapi({ example: "Explorador" }),
      type: z.enum(["quiz", "vocabulary", "audio"]).optional(),
      class_id: z
        .string()
        .optional()
        .openapi({ example: "507f1f77bcf86cd799439011" }),
      active: z.string().optional().openapi({ example: "true" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(MissionSchema), "Lista de missões"),
    401: error401Token,
  },
});

registry.registerPath({
  method: "get",
  path: "/missions/{id}",
  tags: ["Missions"],
  summary: "Buscar missão por ID",
  description:
    "O aluno só acessa missão da própria turma, e a resposta vem sem o gabarito: o campo "
    + "questions[].correct_answer é omitido. Teacher e admin recebem a missão completa.",
  security: [{ bearerAuth: [] }],
  request: {
    params: missionIdParam,
  },
  responses: {
    200: commonResponse(MissionSchema, "Missão encontrada"),
    401: error401Token,
    403: errorResponse(
      "Missão de outra turma (aluno)",
      "Você não tem acesso a esta missão.",
    ),
    404: error404Mission,
  },
});

registry.registerPath({
  method: "post",
  path: "/missions",
  tags: ["Missions"],
  summary: "Criar missão (teacher/admin; professor só nas turmas dele)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateMissionBodySchema } },
    },
  },
  responses: {
    201: commonResponse(MissionWriteResponseSchema, "Missão criada (class_id e createdBy como ids)"),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou class_id de uma turma de outro professor",
      "Você só pode criar missões nas suas turmas.",
    ),
  },
});

registry.registerPath({
  method: "post",
  path: "/missions/{id}/progress",
  tags: ["Missions"],
  summary: "Registrar progresso do aluno logado em uma missão (student)",
  description:
    "Em missões do tipo quiz o aluno envia answers e o score é apurado pelo servidor "
    + "contra o gabarito (um score enviado no corpo é ignorado); nos tipos vocabulário "
    + "e áudio o score é obrigatório no corpo. O XP é proporcional ao score sobre o "
    + "xp_reward e segue o melhor desempenho: cada submissão credita apenas a diferença "
    + "em relação ao que já foi pago antes (campo credited_so_far). Repetir ou piorar "
    + "o score retorna xp_earned igual a 0. O progresso gravado guarda o melhor score "
    + "(devolvido em best_score) e uma missão concluída não volta a ficar pendente; "
    + "score, correct_answers e total_questions se referem a esta submissão.",
  security: [{ bearerAuth: [] }],
  request: {
    params: missionIdParam,
    body: {
      content: { "application/json": { schema: SubmitMissionProgressBodySchema } },
    },
  },
  responses: {
    200: commonResponse(MissionProgressSchema, "Progresso registrado"),
    400: error400,
    401: error401Token,
    403: error403,
    404: error404Mission,
  },
});

registry.registerPath({
  method: "patch",
  path: "/missions/{id}",
  tags: ["Missions"],
  summary: "Atualizar missão (teacher/admin; professor só as que criou)",
  security: [{ bearerAuth: [] }],
  request: {
    params: missionIdParam,
    body: {
      content: { "application/json": { schema: UpdateMissionBodySchema } },
    },
  },
  responses: {
    200: commonResponse(MissionWriteResponseSchema, "Missão atualizada (class_id e createdBy como ids)"),
    400: errorResponse(
      "Dados inválidos. Além do formato do corpo e do título duplicado, o conteúdo "
      + "enviado é validado pelo type da missão já salva (o type não vem no corpo): "
      + "quiz exige questions com no mínimo 5 itens; vocabulary exige content não "
      + "vazio; audio exige content_url não vazio. Só os campos enviados são "
      + "validados — omitir questions, content ou content_url mantém o valor atual. "
      + "content_url só aceita URLs http ou https. Cada erro vem em errors como "
      + "{ path, message }.",
      "Erro de validação. 1 campo(s) inválido(s).",
      [{ path: "questions", message: "Missões do tipo quiz precisam de no mínimo 5 perguntas." }],
    ),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, missão criada por outro professor, "
      + "ou class_id de destino de uma turma de outro professor",
      "Você só pode editar missões que criou.",
    ),
    404: error404Mission,
  },
});

registry.registerPath({
  method: "delete",
  path: "/missions/{id}",
  tags: ["Missions"],
  summary: "Deletar missão (teacher/admin; professor só as que criou)",
  security: [{ bearerAuth: [] }],
  request: {
    params: missionIdParam,
  },
  responses: {
    200: commonResponse(z.null(), "Missão deletada"),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou missão criada por outro professor",
      "Você só pode excluir missões que criou.",
    ),
    404: error404Mission,
  },
});

// ─── Attitudes ───────────────────────────────────────────────────────────────

const attitudeIdParam = z.object({
  id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
});

const error404Attitude = errorResponse(
  "Atitude não encontrada",
  "Recurso não encontrado em Attitude.",
);

registry.registerPath({
  method: "get",
  path: "/attitudes",
  tags: ["Attitudes"],
  summary: "Listar atitudes",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      name: z.string().optional().openapi({ example: "Participação" }),
      type: z.enum(["positive", "negative"]).optional(),
      active: z.string().optional().openapi({ example: "true" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(AttitudeSchema), "Lista de atitudes"),
    401: error401Token,
  },
});

registry.registerPath({
  method: "get",
  path: "/attitudes/{id}",
  tags: ["Attitudes"],
  summary: "Buscar atitude por ID",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeIdParam,
  },
  responses: {
    200: commonResponse(AttitudeSchema, "Atitude encontrada"),
    401: error401Token,
    404: error404Attitude,
  },
});

registry.registerPath({
  method: "post",
  path: "/attitudes",
  tags: ["Attitudes"],
  summary: "Criar atitude (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateAttitudeBodySchema } },
    },
  },
  responses: {
    201: commonResponse(AttitudeWriteResponseSchema, "Atitude criada (createdBy como id)"),
    400: error400,
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "patch",
  path: "/attitudes/{id}",
  tags: ["Attitudes"],
  summary: "Atualizar atitude (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeIdParam,
    body: {
      content: { "application/json": { schema: UpdateAttitudeBodySchema } },
    },
  },
  responses: {
    200: commonResponse(AttitudeWriteResponseSchema, "Atitude atualizada (createdBy como id)"),
    400: error400,
    401: error401Token,
    403: error403,
    404: error404Attitude,
  },
});

registry.registerPath({
  method: "delete",
  path: "/attitudes/{id}",
  tags: ["Attitudes"],
  summary: "Deletar atitude (admin)",
  description:
    "Restrito a admin porque a exclusão deixa os attitudeLogs apontando para uma "
    + "atitude inexistente, sem desfazer o XP já aplicado. Para tirar uma atitude de "
    + "circulação preservando o histórico, o professor deve marcar active como false "
    + "pelo PATCH.",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeIdParam,
  },
  responses: {
    200: commonResponse(z.null(), "Atitude deletada"),
    401: error401Token,
    403: error403,
    404: error404Attitude,
  },
});

// ─── AttitudeLogs ────────────────────────────────────────────────────────────

const attitudeLogIdParam = z.object({
  id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
});

const error404AttitudeLog = errorResponse(
  "Log não encontrado",
  "Recurso não encontrado em AttitudeLog.",
);

registry.registerPath({
  method: "get",
  path: "/attitude-logs",
  tags: ["AttitudeLogs"],
  summary: "Listar logs de atitudes (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      student: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
      teacher: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
      attitude: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(AttitudeLogSchema), "Lista de logs de atitudes"),
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "get",
  path: "/attitude-logs/{id}",
  tags: ["AttitudeLogs"],
  summary: "Buscar log de atitude por ID (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeLogIdParam,
  },
  responses: {
    200: commonResponse(AttitudeLogSchema, "Log encontrado"),
    401: error401Token,
    403: error403,
    404: error404AttitudeLog,
  },
});

registry.registerPath({
  method: "post",
  path: "/attitude-logs",
  tags: ["AttitudeLogs"],
  summary: "Aplicar atitude a um aluno (teacher/admin; professor só nos alunos das turmas dele)",
  description:
    "O aluno alvo precisa estar em uma turma do professor que está aplicando — aluno de "
    + "outra turma, ou sem turma nenhuma, devolve 403. O admin alcança qualquer aluno.\n\n"
    + "**O XP nunca fica negativo.** Uma atitude negativa maior que o saldo para em 0, e "
    + "`xp_applied` grava o que foi de fato descontado, que pode ser menor que o `xp_value` "
    + "da atitude (ex.: atitude de -50 num aluno com 30 XP grava `xp_applied: -30`). A mesma "
    + "regra vale ao corrigir (`PATCH`) e ao desfazer (`DELETE`) o log: o estorno usa o "
    + "`xp_applied` gravado e também para em 0.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateAttitudeLogBodySchema } },
    },
  },
  responses: {
    201: commonResponse(
      AttitudeLogWithProgressionSchema,
      "Log criado, XP aplicado e nível do aluno recalculado",
    ),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou aluno de uma turma de outro professor",
      "Você só pode aplicar atitudes a alunos das suas turmas.",
    ),
    404: errorResponse("Aluno ou atitude não encontrados", "Recurso não encontrado."),
  },
});

registry.registerPath({
  method: "patch",
  path: "/attitude-logs/{id}",
  tags: ["AttitudeLogs"],
  summary: "Corrigir atitude aplicada (teacher/admin; professor só os logs que aplicou)",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeLogIdParam,
    body: {
      content: { "application/json": { schema: UpdateAttitudeLogBodySchema } },
    },
  },
  responses: {
    200: commonResponse(
      UpdatedAttitudeLogSchema,
      "Log corrigido, XP ajustado e nível do aluno recalculado. O campo progression só é retornado quando a atitude é trocada",
    ),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou log aplicado por outro professor",
      "Teachers can only change logs they applied.",
    ),
    404: error404AttitudeLog,
  },
});

registry.registerPath({
  method: "delete",
  path: "/attitude-logs/{id}",
  tags: ["AttitudeLogs"],
  summary: "Desfazer atitude aplicada (teacher/admin; professor só os logs que aplicou)",
  security: [{ bearerAuth: [] }],
  request: {
    params: attitudeLogIdParam,
  },
  responses: {
    200: commonResponse(z.null(), "Log deletado e XP do aluno revertido"),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou log aplicado por outro professor",
      "Teachers can only change logs they applied.",
    ),
    404: error404AttitudeLog,
  },
});

// ─── XpAdjustments ───────────────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/xp-adjustments",
  tags: ["XpAdjustments"],
  summary: "Ajustar o XP de um aluno manualmente (teacher/admin; professor só nos alunos das turmas dele)",
  description:
    "Adiciona (amount positivo) ou remove (amount negativo) XP sem precisar de uma atitude "
    + "cadastrada, e grava o ajuste como histórico de auditoria. O XP nunca fica negativo: "
    + "uma remoção maior que o saldo para em 0, e xp_applied registra o que foi aplicado de "
    + "fato. O nível é recalculado e pode subir ou descer. O aluno alvo precisa estar em uma "
    + "turma do professor; aluno de outra turma, ou sem turma, devolve 403. O admin alcança "
    + "qualquer aluno.",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateXpAdjustmentBodySchema } },
    },
  },
  responses: {
    201: commonResponse(
      XpAdjustmentWithProgressionSchema,
      "Ajuste registrado, XP aplicado e nível do aluno recalculado",
    ),
    400: errorResponse(
      "Corpo inválido (amount igual a 0, fora de ±10000 ou não inteiro; reason acima de 200 caracteres) ou alvo que não é aluno",
      "Erro de validação. 1 campo(s) inválido(s).",
      [{ path: "amount", message: "A quantidade não pode ser zero." }],
    ),
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou aluno de uma turma de outro professor",
      "Você só pode ajustar o XP de alunos das suas turmas.",
    ),
    404: errorResponse("Aluno não encontrado", "Recurso não encontrado em User."),
  },
});

// ─── Rankings ────────────────────────────────────────────────────────────────

const error404Ranking = errorResponse(
  "Ranking não encontrado",
  "Recurso não encontrado em Ranking.",
);

registry.registerPath({
  method: "get",
  path: "/rankings/global",
  tags: ["Rankings"],
  summary: "Ranking global (top 30 alunos por XP)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: commonResponse(RankingSchema, "Ranking global encontrado"),
    401: error401Token,
    404: error404Ranking,
  },
});

registry.registerPath({
  method: "get",
  path: "/rankings/me",
  tags: ["Rankings"],
  summary: "Ranking da turma do usuário logado",
  security: [{ bearerAuth: [] }],
  responses: {
    200: commonResponse(RankingSchema, "Ranking da turma encontrado"),
    401: error401Token,
    404: errorResponse(
      "Usuário sem turma ou ranking inexistente",
      "Você não está matriculado em nenhuma turma.",
    ),
  },
});

registry.registerPath({
  method: "get",
  path: "/rankings/class/{classId}",
  tags: ["Rankings"],
  summary: "Ranking de uma turma específica",
  security: [{ bearerAuth: [] }],
  request: {
    params: RankingClassIdParamSchema,
  },
  responses: {
    200: commonResponse(RankingSchema, "Ranking da turma encontrado"),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Sem permissão",
      "Você só pode ver o ranking da sua própria turma.",
    ),
    404: error404Ranking,
  },
});

registry.registerPath({
  method: "post",
  path: "/rankings/refresh",
  tags: ["Rankings"],
  summary: "Recalcular o ranking global e o de todas as turmas ativas (admin)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: commonResponse(
      RefreshRankingResponseSchema,
      "Rankings recalculados a partir do XP atual dos alunos",
    ),
    401: error401Token,
    403: error403,
  },
});

// ─── Gerador ─────────────────────────────────────────────────────────────────

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "LevelUp English API",
      version: "1.0.0",
      description:
        "Plataforma de gamificação para aprendizado de inglês.\n\n"
        + "**Permissões.** Todas as rotas autenticadas declaram quais papéis podem "
        + "chamá-las (student, teacher e admin); o papel fora da lista recebe 403, "
        + "assim como qualquer usuário com active igual a false. "
        + "A posse do recurso é verificada depois, no service: professor só altera a "
        + "turma e as missões dele, só aplica atitude a aluno das turmas dele e só "
        + "deleta conta de aluno; o aluno só enxerga missão e ranking da própria "
        + "turma. Os resumos indicam entre parênteses quem pode chamar cada rota; "
        + "sem indicação, os três papéis podem.",
    },
    servers: [{ url: process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.APP_PORT || 5011}` }],
  });
}
