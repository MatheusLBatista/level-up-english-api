import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const TypePerformanceSchema = z
  .object({
    score: z.number().int().nullable().openapi({
      example: 90,
      description: "Média das melhores notas (0 a 100) das missões concluídas do tipo; null se não houver nenhuma.",
    }),
    missions: z.number().int().openapi({ example: 3, description: "Quantas missões concluídas entraram na média." }),
  })
  .openapi("TypePerformance");

export const PerformanceByTypeSchema = z
  .object({
    quiz: TypePerformanceSchema,
    vocabulary: TypePerformanceSchema,
    audio: TypePerformanceSchema,
  })
  .openapi("PerformanceByType");

export const PerformanceSchema = z
  .object({
    student: PerformanceByTypeSchema,
  })
  .openapi("Performance");
