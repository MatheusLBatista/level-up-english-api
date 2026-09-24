import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

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
