import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const AttitudeBaseSchema = z.object({
  name: z.string().min(1, "Nome obrigatório.").openapi({ example: "Participação em aula" }),
  description: z.string().optional().openapi({ example: "Aluno participou ativamente da aula." }),
  xp_value: z.number().int().openapi({ example: 10 }),
  type: z.enum(["positive", "negative"]).openapi({ example: "positive" }),
});

export const CreateAttitudeBodySchema = AttitudeBaseSchema.openapi("CreateAttitudeBody");

export const AttitudeSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    name: z.string().openapi({ example: "Participação em aula" }),
    description: z.string().nullable().optional().openapi({ example: "Aluno participou ativamente da aula." }),
    xp_value: z.number().openapi({ example: 10 }),
    type: z.enum(["positive", "negative"]).openapi({ example: "positive" }),
    active: z.boolean().openapi({ example: true }),
    createdBy: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("Attitude");

export const UpdateAttitudeBodySchema = z
  .object({
    name: z.string().min(1).optional().openapi({ example: "Participação em aula" }),
    description: z.string().optional(),
    xp_value: z.number().int().optional().openapi({ example: 10 }),
    type: z.enum(["positive", "negative"]).optional().openapi({ example: "positive" }),
    active: z.boolean().optional().openapi({ example: true }),
  })
  .openapi("UpdateAttitudeBody");
