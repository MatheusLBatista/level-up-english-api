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

const idSchema = z.string().openapi({ example: "507f1f77bcf86cd799439011" });
const dateSchema = z.string().nullable().openapi({ example: "2026-01-01T00:00:00.000Z" });
const NamedRefSchema = z.object({ _id: idSchema, name: z.string().openapi({ example: "Turma A" }) });

export const DataExportSchema = z
  .object({
    exported_at: z.string().openapi({ example: "2026-11-12T14:00:00.000Z" }),
    student: z.object({
      _id: idSchema,
      name: z.string().openapi({ example: "Bia Souza" }),
      email: z.string().openapi({ example: "bia@escola.com" }),
      role: z.literal("student"),
      class: NamedRefSchema.nullable(),
      xp: z.number().openapi({ example: 320 }),
      level: z.number().openapi({ example: 2 }),
      badges: z.array(z.string()),
      avatar_url: z.string().nullable().openapi({ example: "/uploads/avatars/507f1f77bcf86cd799439011.webp" }),
      active: z.boolean(),
      show_in_global_ranking: z.boolean(),
      deactivated_at: dateSchema,
      anonymized_at: dateSchema,
      guardian_consent_at: dateSchema,
      guardian_consent_recorded_by: NamedRefSchema.nullable().openapi({
        description: "Professor ou admin que registrou o termo; só o nome, sem e-mail.",
      }),
      guardian_consent_revoked_at: dateSchema,
      createdAt: dateSchema,
      updatedAt: dateSchema,
    }),
    mission_progress: z.array(z.object({
      mission: z.object({
        _id: idSchema,
        title: z.string().nullable().openapi({ example: "Verbos irregulares", description: "null se a missão foi apagada." }),
      }),
      done: z.boolean(),
      score: z.number().openapi({ example: 80 }),
      xp_earned: z.number().openapi({ example: 80 }),
      completed_at: dateSchema,
    })),
    attitude_logs: z.array(z.object({
      attitude: z.string().nullable().openapi({ example: "Participação", description: "null se a atitude foi apagada." }),
      teacher: z.string().nullable().openapi({ example: "Ana Souza" }),
      xp_applied: z.number().openapi({ example: 20 }),
      applied_at: dateSchema,
    })),
    xp_adjustments: z.array(z.object({
      teacher: z.string().nullable().openapi({ example: "Ana Souza" }),
      amount: z.number().openapi({ example: 10 }),
      xp_applied: z.number().openapi({ example: 10 }),
      reason: z.string().nullable().openapi({ example: "Monitoria" }),
      applied_at: dateSchema,
    })),
    notifications: z.array(z.object({
      type: z.string().openapi({ example: "attitude" }),
      message: z.string().openapi({ example: "Você ganhou 20 XP por Participação." }),
      read: z.boolean(),
      createdAt: dateSchema,
    })),
    rankings: z.array(z.object({
      type: z.enum(["global", "class"]),
      class: NamedRefSchema.nullable(),
      position: z.number().openapi({ example: 3 }),
      updatedAt: dateSchema,
    })),
  })
  .openapi("DataExport");
