import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { UserSchema, CreateUserBodySchema, UpdateUserBodySchema } from "../schemas/UserSchema.js";
import { LoginBodySchema, LoginResponseSchema } from "../schemas/AuthSchema.js";

const registry = new OpenAPIRegistry();

// Schemas
registry.register("User", UserSchema);
registry.register("LoginBody", LoginBodySchema);
registry.register("LoginResponse", LoginResponseSchema);
registry.register("CreateUserBody", CreateUserBodySchema);
registry.register("UpdateUserBody", UpdateUserBodySchema);

// Segurança JWT
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Helper: envolve data no padrão CommonResponse
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

const errorResponse = (description) => ({ description });

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
    401: errorResponse("Credenciais inválidas"),
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
    401: errorResponse("Não autenticado"),
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
    401: errorResponse("Não autenticado"),
    404: errorResponse("Usuário não encontrado"),
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
    401: errorResponse("Não autenticado"),
    403: errorResponse("Sem permissão"),
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
    401: errorResponse("Não autenticado"),
    403: errorResponse("Sem permissão"),
    404: errorResponse("Usuário não encontrado"),
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
    401: errorResponse("Não autenticado"),
    403: errorResponse("Sem permissão"),
    404: errorResponse("Usuário não encontrado"),
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
