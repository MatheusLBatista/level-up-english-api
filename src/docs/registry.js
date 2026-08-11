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
} from "../schemas/AuthSchema.js";
import {
  MissionSchema,
  CreateMissionBodySchema,
  UpdateMissionBodySchema,
  SubmitMissionProgressBodySchema,
  MissionProgressSchema,
} from "../schemas/MissionSchema.js";
import {
  ClassSchema,
  CreateClassBodySchema,
  UpdateClassBodySchema,
} from "../schemas/ClassSchema.js";
import {
  AttitudeSchema,
  CreateAttitudeBodySchema,
  UpdateAttitudeBodySchema,
} from "../schemas/AttitudeSchema.js";
import {
  AttitudeLogSchema,
  CreateAttitudeLogBodySchema,
  UpdateAttitudeLogBodySchema,
  AttitudeLogWithProgressionSchema,
  LevelProgressionSchema,
} from "../schemas/AttitudeLogSchema.js";
import {
  RankingSchema,
  RankingEntrySchema,
  RefreshRankingResponseSchema,
  RankingClassIdParamSchema,
} from "../schemas/RankingSchema.js";

const registry = new OpenAPIRegistry();

registry.register("User", UserSchema);
registry.register("LevelProgress", LevelProgressSchema);
registry.register("LevelProgression", LevelProgressionSchema);
registry.register("AttitudeLogWithProgression", AttitudeLogWithProgressionSchema);
registry.register("Attitude", AttitudeSchema);
registry.register("CreateAttitudeBody", CreateAttitudeBodySchema);
registry.register("UpdateAttitudeBody", UpdateAttitudeBodySchema);
registry.register("AttitudeLog", AttitudeLogSchema);
registry.register("CreateAttitudeLogBody", CreateAttitudeLogBodySchema);
registry.register("UpdateAttitudeLogBody", UpdateAttitudeLogBodySchema);
registry.register("Mission", MissionSchema);
registry.register("Class", ClassSchema);
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
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: RegisterStudentBodySchema } },
    },
  },
  responses: {
    201: commonResponse(UserSchema, "Aluno cadastrado e e-mail enviado"),
    400: errorResponse(
      "E-mail já cadastrado",
      "Este e-mail já está cadastrado.",
      [{ path: "email", message: "Este e-mail já está cadastrado." }],
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
      active: z.string().optional().openapi({ example: "true" }),
      page: z.string().optional().openapi({ example: "1" }),
      limit: z.string().optional().openapi({ example: "10" }),
    }),
  },
  responses: {
    200: commonResponse(z.array(UserSchema), "Lista de usuários"),
    401: error401Token,
    403: error403,
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
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateUserBodySchema } } },
  },
  responses: {
    201: commonResponse(UserSchema, "Usuário criado"),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou professor tentando criar teacher/admin",
      "Only admins can create users with a role other than student.",
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
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    }),
    body: { content: { "application/json": { schema: UpdateUserBodySchema } } },
  },
  responses: {
    200: commonResponse(UserSchema, "Usuário atualizado"),
    400: error400,
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
  summary: "Deletar usuário",
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
      "Aluno tentando deletar a conta de outro usuário",
      "Students can only delete their own account.",
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
    200: commonResponse(z.array(ClassSchema), "Lista de turmas"),
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
      "Students can only view their own class.",
    ),
    404: error404Class,
  },
});

registry.registerPath({
  method: "post",
  path: "/classes",
  tags: ["Classes"],
  summary: "Criar turma (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateClassBodySchema } },
    },
  },
  responses: {
    201: commonResponse(ClassSchema, "Turma criada"),
    400: error400,
    401: error401Token,
    403: error403,
  },
});

registry.registerPath({
  method: "patch",
  path: "/classes/{id}",
  tags: ["Classes"],
  summary: "Atualizar turma (teacher/admin; professor só a própria turma)",
  security: [{ bearerAuth: [] }],
  request: {
    params: classIdParam,
    body: {
      content: { "application/json": { schema: UpdateClassBodySchema } },
    },
  },
  responses: {
    200: commonResponse(ClassSchema, "Turma atualizada"),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou turma de outro professor",
      "Teachers can only update their own classes.",
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
  summary: "Criar missão (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateMissionBodySchema } },
    },
  },
  responses: {
    201: commonResponse(MissionSchema, "Missão criada"),
    400: error400,
    401: error401Token,
    403: error403,
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
    + "o score retorna xp_earned igual a 0.",
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
    200: commonResponse(MissionSchema, "Missão atualizada"),
    400: error400,
    401: error401Token,
    403: errorResponse(
      "Papel sem acesso à rota, ou missão criada por outro professor",
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
    201: commonResponse(AttitudeSchema, "Atitude criada"),
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
    200: commonResponse(AttitudeSchema, "Atitude atualizada"),
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
  summary: "Aplicar atitude a um aluno (teacher/admin)",
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
    403: error403,
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
      AttitudeLogWithProgressionSchema,
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
        + "turma e as missões dele, e aluno só enxerga missão e ranking da própria "
        + "turma. Os resumos indicam entre parênteses quem pode chamar cada rota; "
        + "sem indicação, os três papéis podem.",
    },
    servers: [{ url: `http://localhost:${process.env.APP_PORT || 5011}` }],
  });
}
