import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const LevelProgressSchema = z
  .object({
    current_level_xp: z.number().openapi({ example: 400 }),
    next_level_xp: z.number().nullable().openapi({ example: 900 }),
    xp_to_next_level: z.number().openapi({ example: 480 }),
    percentage: z.number().openapi({ example: 4 }),
  })
  .openapi("LevelProgress");

/**
 * Uma entrada de `User.mission_progress`. O `xp_earned` é acumulado, não o da
 * última submissão: guarda o total já creditado pela missão, que é o que impede
 * o aluno de ser premiado de novo ao refazê-la.
 */
const MissionProgressEntrySchema = z
  .object({
    mission_id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    done: z.boolean().openapi({ example: true }),
    score: z.number().openapi({ example: 80 }),
    xp_earned: z.number().openapi({ example: 80 }),
    completed_at: z
      .string()
      .nullable()
      .openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("MissionProgressEntry");

export const UserSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    role: z.enum(["student", "teacher", "admin"]).openapi({ example: "student" }),
    xp: z.number().openapi({ example: 0 }),
    level: z.number().openapi({ example: 1 }),
    progress: LevelProgressSchema,
    class: z
      .string()
      .nullable()
      .optional()
      .openapi({
        example: "507f1f77bcf86cd799439011",
        description:
          "Turma do aluno. Diferente das demais referências, esta **não** vem populada: "
          + "é o id cru. Para os dados da turma, chamar `GET /classes/{id}`.",
      }),
    mission_progress: z.array(MissionProgressEntrySchema).openapi({
      description:
        "Histórico de submissões do aluno, uma entrada por missão. Alimenta a tela de progresso.",
    }),
    streak: z.number().openapi({
      example: 0,
      description: "Campo previsto no RF-009. Nenhuma regra o alimenta hoje: é sempre 0.",
    }),
    badges: z.array(z.string()).openapi({
      example: [],
      description: "Campo previsto no RF-009. Nenhuma regra o alimenta hoje: é sempre uma lista vazia.",
    }),
    active: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("User");

export const CreateUserBodySchema = z
  .object({
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    password: z.string().min(6).openapi({ example: "senha123" }),
    role: z.enum(["student", "teacher", "admin"]).optional().openapi({
      example: "student",
      description: "Apenas admin pode informar um papel diferente de student.",
    }),
    class: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("CreateUserBody");

export const UpdateUserBodySchema = z
  .object({
    name: z.string().optional().openapi({ example: "John Doe Updated" }),
    streak: z.number().optional().openapi({ example: 5 }),
    badges: z.array(z.string()).optional().openapi({ example: ["first_login"] }),
    active: z.boolean().optional().openapi({
      example: true,
      description: "Apenas admin. Ignorado nos demais papéis.",
    }),
    class: z.string().optional().openapi({
      example: "507f1f77bcf86cd799439011",
      description: "Apenas admin. Ignorado nos demais papéis.",
    }),
  })
  .openapi("UpdateUserBody");
