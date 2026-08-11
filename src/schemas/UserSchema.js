import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const LevelProgressSchema = z
  .object({
    current_level_xp: z.number().openapi({ example: 400 }),
    next_level_xp: z.number().nullable().openapi({ example: 900 }),
    xp_to_next_level: z.number().openapi({ example: 480 }),
    percentage: z.number().openapi({ example: 4 }),
  })
  .openapi("LevelProgress");

export const UserSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    role: z.enum(["student", "teacher", "admin"]).openapi({ example: "student" }),
    xp: z.number().openapi({ example: 0 }),
    level: z.number().openapi({ example: 1 }),
    progress: LevelProgressSchema,
    streak: z.number().openapi({ example: 0 }),
    badges: z.array(z.string()).openapi({ example: [] }),
    active: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("User");

export const CreateUserBodySchema = z
  .object({
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    password: z.string().min(6).openapi({ example: "senha123" }),
    role: z.enum(["student", "teacher", "admin"]).optional().openapi({
      example: "student",
      description: "Apenas admin pode informar um papel diferente de student.",
    }),
    class: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("CreateUserBody");

export const UpdateUserBodySchema = z
  .object({
    name: z.string().optional().openapi({ example: "John Doe Updated" }),
    streak: z.number().optional().openapi({ example: 5 }),
    badges: z.array(z.string()).optional().openapi({ example: ["first_login"] }),
    active: z.boolean().optional().openapi({ example: true }),
    class: z.string().optional().openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("UpdateUserBody");
