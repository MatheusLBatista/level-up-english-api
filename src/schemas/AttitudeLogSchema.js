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
