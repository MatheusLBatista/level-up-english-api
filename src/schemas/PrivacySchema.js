import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const ERASURE_CONFIRMATION_MESSAGE = "Confirme a eliminação definitiva dos dados do aluno.";

export const ErasureBodySchema = z
  .object({
    confirm: z
      .literal(true, { errorMap: () => ({ message: ERASURE_CONFIRMATION_MESSAGE }) })
      .openapi({
        example: true,
        description: "Confirmação explícita de que a eliminação é definitiva. Só `true` é aceito.",
      }),
  })
  .openapi("ErasureBody");
