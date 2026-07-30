import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

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

export const AttitudeLogSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    student: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    attitude: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    teacher: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    xp_applied: z.number().openapi({ example: 10 }),
    applied_at: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("AttitudeLog");

export const AttitudeLogWithProgressionSchema = AttitudeLogSchema.extend({
  progression: LevelProgressionSchema,
}).openapi("AttitudeLogWithProgression");
