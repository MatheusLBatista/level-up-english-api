import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { NOTIFICATION_TYPES } from "../models/Notification.js";

extendZodWithOpenApi(z);

export const NotificationSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439051" }),
    user: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    type: z.enum(NOTIFICATION_TYPES).openapi({ example: "attitude" }),
    message: z.string().openapi({ example: "A professora registrou Participação em aula (+10 XP)." }),
    data: z.record(z.any()).openapi({
      example: { xp: 10, attitude_log: "507f1f77bcf86cd799439041" },
      description:
        "Dados para o front montar a notificação: xp com sinal (attitude e xp_adjustment) e o id "
        + "do registro de origem (atitude, ajuste ou missão).",
    }),
    read: z.boolean().openapi({ example: false }),
    createdAt: z.string().openapi({ example: "2026-10-29T12:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-10-29T12:00:00.000Z" }),
  })
  .openapi("Notification");

export const NotificationPageSchema = z
  .object({
    docs: z.array(NotificationSchema),
    totalDocs: z.number().int().openapi({ example: 12 }),
    limit: z.number().int().openapi({ example: 10 }),
    page: z.number().int().openapi({ example: 1 }),
    totalPages: z.number().int().openapi({ example: 2 }),
    hasPrevPage: z.boolean().openapi({ example: false }),
    hasNextPage: z.boolean().openapi({ example: true }),
    prevPage: z.number().int().nullable().openapi({ example: null }),
    nextPage: z.number().int().nullable().openapi({ example: 2 }),
  })
  .openapi("NotificationPage");

export const UnreadCountSchema = z
  .object({
    unread: z.number().int().openapi({ example: 3 }),
  })
  .openapi("NotificationUnreadCount");

export const MarkAllAsReadSchema = z
  .object({
    updated: z.number().int().openapi({ example: 3, description: "Quantas notificações passaram para lidas." }),
  })
  .openapi("NotificationMarkAllAsRead");

export const NotificationIdParamSchema = z.object({
  id: z.string().openapi({ example: "507f1f77bcf86cd799439051" }),
});
