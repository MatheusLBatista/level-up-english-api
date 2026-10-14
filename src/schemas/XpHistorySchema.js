import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const XpHistoryItemSchema = z
  .object({
    id: z.string().openapi({
      example: "507f1f77bcf86cd799439041",
      description: "Id estável do item: o _id do log de atitude ou do ajuste; na missão, o id da missão.",
    }),
    kind: z.enum(["attitude", "adjustment", "mission"]).openapi({ example: "attitude" }),
    xp: z.number().int().openapi({
      example: -5,
      description:
        "XP efetivamente aplicado, com sinal. Em atitude e ajuste é o xp_applied, já com o piso "
        + "em 0 — pode ser menor que o pedido; em missão é o xp_earned acumulado.",
    }),
    title: z.string().openapi({
      example: "Atraso",
      description:
        "Nome da atitude (\"Atitude removida\" se ela não existir mais), \"Ajuste de XP\", "
        + "ou o título da missão (\"Missão removida\").",
    }),
    detail: z.string().nullable().openapi({
      example: "Professora A",
      description:
        "Atitude: nome de quem aplicou. Ajuste: o motivo (reason), ou null. "
        + "Missão: \"Melhor nota: {score}%\".",
    }),
    teacher: z.string().nullable().optional().openapi({
      example: "Professora A",
      description: "Só no ajuste: nome de quem ajustou.",
    }),
    date: z.string().nullable().openapi({
      example: "2026-10-14T12:00:00.000Z",
      description: "applied_at na atitude e no ajuste; completed_at na missão.",
    }),
  })
  .openapi("XpHistoryItem");

export const XpHistoryPageSchema = z
  .object({
    docs: z.array(XpHistoryItemSchema),
    totalDocs: z.number().int().openapi({ example: 23 }),
    limit: z.number().int().openapi({ example: 10 }),
    page: z.number().int().openapi({ example: 1 }),
    totalPages: z.number().int().openapi({ example: 3 }),
    hasPrevPage: z.boolean().openapi({ example: false }),
    hasNextPage: z.boolean().openapi({ example: true }),
    prevPage: z.number().int().nullable().openapi({ example: null }),
    nextPage: z.number().int().nullable().openapi({ example: 2 }),
  })
  .openapi("XpHistoryPage");
