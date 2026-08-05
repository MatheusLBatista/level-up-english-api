import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const QuestionSchema = z
  .object({
    question: z.string().min(1, "A pergunta não pode estar vazia.").openapi({ example: "What color is the sky?" }),
    options: z
      .object({
        a: z.string().min(1).openapi({ example: "Blue" }),
        b: z.string().min(1).openapi({ example: "Red" }),
        c: z.string().min(1).openapi({ example: "Green" }),
        d: z.string().min(1).openapi({ example: "Yellow" }),
      })
      .openapi({ example: { a: "Blue", b: "Red", c: "Green", d: "Yellow" } }),
    correct_answer: z.enum(["a", "b", "c", "d"]).openapi({ example: "a" }),
  })
  .openapi("Question");

const MissionBaseSchema = z.object({
  title: z.string().min(1, "Título obrigatório.").openapi({ example: "Explorador de Palavras" }),
  description: z.string().optional().openapi({ example: "Aprenda 10 nomes de animais" }),
  type: z.enum(["quiz", "vocabulary", "audio"]).openapi({ example: "quiz" }),
  xp_reward: z.number().int().min(0).default(0).openapi({ example: 100 }),
  class_id: z.string().min(1, "A turma alvo é obrigatória.").openapi({ example: "507f1f77bcf86cd799439011" }),
});

export const CreateMissionBodySchema = MissionBaseSchema.extend({
  questions: z.array(QuestionSchema).optional(),
  content: z.string().optional().openapi({ example: "The cat sat on the mat..." }),
  content_url: z.string().url("URL inválida.").optional().openapi({ example: "https://www.youtube.com/embed/abc123" }),
})
  .superRefine((data, ctx) => {
    if (data.type === "quiz") {
      if (!data.questions || data.questions.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Missões do tipo quiz precisam de no mínimo 5 perguntas.",
          path: ["questions"],
        });
      }
    }

    if (data.type === "vocabulary") {
      if (!data.content || data.content.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Missões do tipo vocabulário precisam de conteúdo (content).",
          path: ["content"],
        });
      }
    }

    if (data.type === "audio") {
      if (!data.content_url || data.content_url.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Missões do tipo áudio precisam de uma URL (content_url).",
          path: ["content_url"],
        });
      }
    }
  })
  .openapi("CreateMissionBody");

export const MissionSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    title: z.string().openapi({ example: "Explorador de Palavras" }),
    description: z.string().nullable().openapi({ example: "Aprenda 10 nomes de animais" }),
    type: z.enum(["quiz", "vocabulary", "audio"]).openapi({ example: "quiz" }),
    xp_reward: z.number().openapi({ example: 100 }),
    class_id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    active: z.boolean().openapi({ example: true }),
    createdBy: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    questions: z.array(QuestionSchema).optional(),
    content: z.string().nullable().optional(),
    content_url: z.string().nullable().optional(),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("Mission");

export const SubmitMissionProgressBodySchema = z
  .object({
    score: z
      .number()
      .int("O score deve ser um número inteiro.")
      .min(0, "O score mínimo é 0.")
      .max(100, "O score máximo é 100.")
      .optional()
      .openapi({
        example: 80,
        description: "Obrigatório para missões de vocabulário e áudio. Ignorado em quiz, onde o score é calculado pelo servidor.",
      }),
    answers: z
      .array(z.enum(["a", "b", "c", "d"]))
      .optional()
      .openapi({
        example: ["a", "c", "b", "d", "a"],
        description: "Obrigatório em missões do tipo quiz: uma resposta por questão, na ordem em que foram cadastradas.",
      }),
    done: z.boolean().default(true).openapi({ example: true }),
  })
  .openapi("SubmitMissionProgressBody");

export const MissionProgressSchema = z
  .object({
    mission: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    student: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    done: z.boolean().openapi({ example: true }),
    score: z.number().openapi({ example: 80 }),
    correct_answers: z
      .number()
      .nullable()
      .openapi({ example: 4, description: "Acertos no quiz; null nos demais tipos." }),
    total_questions: z
      .number()
      .nullable()
      .openapi({ example: 5, description: "Total de questões do quiz; null nos demais tipos." }),
    xp_earned: z
      .number()
      .openapi({ example: 80, description: "XP creditado nesta submissão." }),
    credited_so_far: z
      .number()
      .openapi({ example: 80, description: "Total de XP já creditado por esta missão." }),
    already_rewarded: z
      .boolean()
      .openapi({ example: false, description: "true se a missão já havia rendido XP antes." }),
    progression: z
      .object({
        student: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
        previous_level: z.number().openapi({ example: 3 }),
        leveled_up: z.boolean().openapi({ example: true }),
        leveled_down: z.boolean().openapi({ example: false }),
        xp: z.number().openapi({ example: 480 }),
        level: z.number().openapi({ example: 3 }),
        current_level_xp: z.number().openapi({ example: 400 }),
        next_level_xp: z.number().nullable().openapi({ example: 900 }),
        xp_to_next_level: z.number().openapi({ example: 420 }),
        percentage: z.number().openapi({ example: 16 }),
      })
      .nullable(),
  })
  .openapi("MissionProgress");

export const UpdateMissionBodySchema = z
  .object({
    title: z.string().min(1).optional().openapi({ example: "Explorador de Palavras" }),
    description: z.string().optional(),
    xp_reward: z.number().int().min(0).optional().openapi({ example: 150 }),
    class_id: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
    active: z.boolean().optional().openapi({ example: true }),

    questions: z.array(QuestionSchema).optional(),
    content: z.string().optional(),
    content_url: z.string().url("URL inválida.").optional(),
  })
  .openapi("UpdateMissionBody");
