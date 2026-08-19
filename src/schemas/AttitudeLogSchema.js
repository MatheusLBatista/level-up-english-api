import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import {
  UserContactRefSchema,
  AttitudeRefSchema,
} from "./PopulatedRefSchemas.js";

extendZodWithOpenApi(z);

export const CreateAttitudeLogBodySchema = z
  .object({
    student: z.string().min(1, "Aluno obrigatório.").openapi({ example: "507f1f77bcf86cd799439011" }),
    attitude: z.string().min(1, "Atitude obrigatória.").openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("CreateAttitudeLogBody");

export const UpdateAttitudeLogBodySchema = z
  .object({
    attitude: z.string().min(1).optional().openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("UpdateAttitudeLogBody");

export const LevelProgressionSchema = z
  .object({
    student: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    previous_level: z.number().openapi({ example: 2 }),
    leveled_up: z.boolean().openapi({ example: true }),
    leveled_down: z.boolean().openapi({ example: false }),
    xp: z.number().openapi({ example: 420 }),
    level: z.number().openapi({ example: 3 }),
    current_level_xp: z.number().openapi({ example: 400 }),
    next_level_xp: z.number().nullable().openapi({ example: 900 }),
    xp_to_next_level: z.number().openapi({ example: 480 }),
    percentage: z.number().openapi({ example: 4 }),
  })
  .openapi("LevelProgression");

const attitudeLogBase = {
  _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
  xp_applied: z.number().openapi({ example: 10 }),
  applied_at: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
};

const objectIdRef = z.string().openapi({ example: "507f1f77bcf86cd799439011" });

/**
 * Atitude aplicada como sai da **leitura** (`GET /attitude-logs` e
 * `GET /attitude-logs/{id}`): `student`, `attitude` e `teacher` vêm populados,
 * porque só o `findById` e o `list` do repositório aplicam populate.
 */
export const AttitudeLogSchema = z
  .object({
    ...attitudeLogBase,
    student: UserContactRefSchema,
    attitude: AttitudeRefSchema,
    teacher: UserContactRefSchema,
  })
  .openapi("AttitudeLog");

/**
 * Atitude aplicada como sai da **escrita** (`POST /attitude-logs`).
 *
 * Atenção à diferença: `create` e `update` no repositório devolvem o documento
 * sem populate, então aqui os três campos são **ids**, e não objetos. É a mesma
 * entidade do `AttitudeLog` em outra forma — para ler os dados do aluno ou da
 * atitude depois de gravar, chamar `GET /attitude-logs/{id}`.
 */
export const AttitudeLogWithProgressionSchema = z
  .object({
    ...attitudeLogBase,
    student: objectIdRef,
    attitude: objectIdRef,
    teacher: objectIdRef,
    progression: LevelProgressionSchema,
  })
  .openapi("AttitudeLogWithProgression");

/**
 * Resposta do `PATCH /attitude-logs/{id}`. Igual à de criação, exceto por
 * `progression`, que **só aparece quando o corpo troca a atitude**: um PATCH
 * sem `attitude` não mexe em XP e por isso não recalcula progressão.
 */
export const UpdatedAttitudeLogSchema = z
  .object({
    ...attitudeLogBase,
    student: objectIdRef,
    attitude: objectIdRef,
    teacher: objectIdRef,
    progression: LevelProgressionSchema.optional().openapi({
      description:
        "Presente apenas quando o corpo da requisição troca a atitude. "
        + "PATCH sem `attitude` não altera XP e omite este campo.",
    }),
  })
  .openapi("UpdatedAttitudeLog");
