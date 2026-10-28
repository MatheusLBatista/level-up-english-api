import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const periodDate = (example, description) =>
  z.string().datetime({ offset: true, message: "Use data e hora ISO 8601 com fuso, ex.: 2026-08-01T00:00:00-04:00." })
    .optional()
    .openapi({ example, description });

export const PerformanceQueryBaseSchema = z.object({
  from: periodDate("2026-08-01T00:00:00-04:00", "Início do período, inclusive, pela data de conclusão da missão."),
  to: periodDate("2026-10-31T23:59:59-04:00", "Fim do período, inclusive."),
});

export const PerformanceQuerySchema = PerformanceQueryBaseSchema.refine(
  ({ from, to }) => !from || !to || new Date(from) <= new Date(to),
  { message: "O início do período deve ser anterior ao fim.", path: ["to"] },
);

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

export const ClassTypePerformanceSchema = z
  .object({
    score: z.number().int().nullable().openapi({
      example: 72,
      description: "Média das médias dos alunos da turma que têm nota no tipo; null se nenhum tiver.",
    }),
    students: z.number().int().openapi({ example: 7, description: "Quantos alunos entraram na média." }),
  })
  .openapi("ClassTypePerformance");

export const ClassPerformanceByTypeSchema = z
  .object({
    quiz: ClassTypePerformanceSchema,
    vocabulary: ClassTypePerformanceSchema,
    audio: ClassTypePerformanceSchema,
  })
  .openapi("ClassPerformanceByType");

export const PerformanceSchema = z
  .object({
    student: PerformanceByTypeSchema,
    class: ClassPerformanceByTypeSchema.nullable().openapi({
      description: "Média da turma do aluno, para comparar no radar; null se o aluno não tiver turma.",
    }),
  })
  .openapi("Performance");
