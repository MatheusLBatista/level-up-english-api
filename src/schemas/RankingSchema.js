import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const RankingUserSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    name: z.string().openapi({ example: "Maria Silva" }),
    email: z.string().openapi({ example: "maria.silva@exemplo.com" }),
    xp: z.number().openapi({ example: 1250 }),
    level: z.number().openapi({ example: 4 }),
  })
  .openapi("RankingUser");

export const RankingEntrySchema = z
  .object({
    user: RankingUserSchema,
    xp: z.number().openapi({ example: 1250 }),
    level: z.number().openapi({ example: 4 }),
  })
  .openapi("RankingEntry");

export const RankingSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    type: z.enum(["global", "class"]).openapi({ example: "global" }),
    class: z.string().nullable().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
    entries: z.array(RankingEntrySchema),
    createdAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
  })
  .openapi("Ranking");

export const RefreshRankingResponseSchema = z
  .object({
    global: RankingSchema,
    classes: z.array(RankingSchema),
  })
  .openapi("RefreshRankingResponse");

export const RankingClassIdParamSchema = z.object({
  classId: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
});
