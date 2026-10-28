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
