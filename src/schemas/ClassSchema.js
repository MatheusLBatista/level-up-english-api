import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

const classIdSchema = z
  .string()
  .openapi({ example: "507f1f77bcf86cd799439011" });

export const ClassSchema = z
  .object({
    _id: classIdSchema,
    name: z.string().openapi({ example: "Turma A" }),
    active: z.boolean().openapi({ example: true }),
    teacher: classIdSchema.optional(),
    students: z
      .array(classIdSchema)
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
    missions: z
      .array(classIdSchema)
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
    createdAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("Class");

export const CreateClassBodySchema = z
  .object({
    name: z
      .string()
      .min(1, "O nome da turma é obrigatório.")
      .openapi({ example: "Turma A" }),
    active: z.boolean().optional().openapi({ example: true }),
    teacher: classIdSchema.optional(),
    students: z
      .array(classIdSchema)
      .optional()
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
    missions: z
      .array(classIdSchema)
      .optional()
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
  })
  .openapi("CreateClassBody");

export const UpdateClassBodySchema = z
  .object({
    name: z
      .string()
      .min(1, "O nome da turma é obrigatório.")
      .optional()
      .openapi({ example: "Turma A" }),
    active: z.boolean().optional().openapi({ example: true }),
    teacher: classIdSchema.optional(),
    students: z
      .array(classIdSchema)
      .optional()
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
    missions: z
      .array(classIdSchema)
      .optional()
      .openapi({ example: ["507f1f77bcf86cd799439011"] }),
  })
  .openapi("UpdateClassBody");
