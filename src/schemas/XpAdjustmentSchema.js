import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { LevelProgressionSchema } from "./AttitudeLogSchema.js";

extendZodWithOpenApi(z);

export const CreateXpAdjustmentBodySchema = z
  .object({
    student: z.string().min(1, "Aluno obrigatório.").openapi({ example: "507f1f77bcf86cd799439011" }),
    amount: z
      .number({ required_error: "Quantidade obrigatória." })
      .int("A quantidade deve ser um número inteiro.")
      .min(-10000, "A quantidade mínima é -10000.")
      .max(10000, "A quantidade máxima é 10000.")
      .refine((amount) => amount !== 0, "A quantidade não pode ser zero.")
      .openapi({ example: 50 }),
    reason: z
      .string()
      .trim()
      .max(200, "O motivo deve ter no máximo 200 caracteres.")
      .optional()
      .openapi({ example: "Ajudou a organizar a feira de ciências." }),
  })
  .openapi("CreateXpAdjustmentBody");

const objectIdRef = z.string().openapi({ example: "507f1f77bcf86cd799439011" });

/**
 * Resposta do `POST /xp-adjustments`. Como no attitude-logs, `student` e
 * `teacher` saem como ids, porque o `create` do repositório não popula.
 * `xp_applied` pode ser menor que `amount` em módulo: uma remoção maior que o
 * saldo para em 0 XP.
 */
export const XpAdjustmentWithProgressionSchema = z
  .object({
    _id: objectIdRef,
    student: objectIdRef,
    teacher: objectIdRef,
    amount: z.number().openapi({ example: -50, description: "Quantidade pedida pelo professor." }),
    xp_applied: z.number().openapi({
      example: -30,
      description: "Quantidade aplicada de fato. Difere de amount quando a remoção passa do saldo.",
    }),
    reason: z.string().optional().openapi({
      example: "Ajudou a organizar a feira de ciências.",
      description: "Ausente quando o ajuste é feito sem motivo.",
    }),
    applied_at: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    progression: LevelProgressionSchema,
  })
  .openapi("XpAdjustmentWithProgression");
