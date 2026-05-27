import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { UserSchema, CreateUserBodySchema, UpdateUserBodySchema } from "../schemas/UserSchema.js";
import { LoginBodySchema, LoginResponseSchema, RevokeParamsSchema } from "../schemas/AuthSchema.js";

const registry = new OpenAPIRegistry();

// Schemas
registry.register("User", UserSchema);
registry.register("LoginBody", LoginBodySchema);
registry.register("LoginResponse", LoginResponseSchema);
registry.register("RevokeParams", RevokeParamsSchema);
registry.register("CreateUserBody", CreateUserBodySchema);
registry.register("UpdateUserBody", UpdateUserBodySchema);

// Segurança JWT
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Helper: resposta de sucesso no padrão CommonResponse
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

// Helper base para erros
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

// Respostas de erro reutilizáveis
const error400 = errorResponse(
  "Dados inválidos",
  "Erro de validação. 1 campo(s) inválido(s).",
  [{ path: "email", message: "Invalid email" }],
);

const error401Credentials = errorResponse(
  "Credenciais inválidas",
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

const error403 = errorResponse(
  "Sem permissão",
  "You do not have permission to perform this action.",
);

const error404User = errorResponse(
  "Usuário não encontrado",
  "Recurso não encontrado em User.",
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
  summary: "Listar usuários",
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
  },
});

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Buscar usuário por ID",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    }),
  },
  responses: {
    200: commonResponse(UserSchema, "Usuário encontrado"),
    401: error401Token,
    404: error404User,
  },
});

registry.registerPath({
  method: "post",
  path: "/users",
  tags: ["Users"],
  summary: "Criar usuário (teacher/admin)",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateUserBodySchema } } },
  },
  responses: {
    201: commonResponse(UserSchema, "Usuário criado"),
    400: error400,
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
    403: error403,
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
    200: commonResponse(UserSchema, "Usuário deletado"),
    401: error401Token,
    403: error403,
    404: error404User,
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
      description: "Plataforma de gamificação para aprendizado de inglês.",
    },
    servers: [{ url: `http://localhost:${process.env.APP_PORT || 5011}` }],
  });
}
