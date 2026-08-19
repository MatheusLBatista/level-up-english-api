import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import {
  TeacherRefSchema,
  StudentRefSchema,
  MissionRefSchema,
} from "./PopulatedRefSchemas.js";

extendZodWithOpenApi(z);

const classIdSchema = z
  .string()
  .openapi({ example: "507f1f77bcf86cd799439011" });

const classBase = {
  _id: classIdSchema,
  name: z.string().openapi({ example: "Turma A" }),
  active: z.boolean().openapi({ example: true }),
  createdAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  updatedAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
};

/**
 * Turma no **detalhe** (`GET /classes/{id}`) — a única forma em que os três
 * relacionamentos vêm populados, porque só o `findById` do repositório aplica
 * populate nos três.
 */
export const ClassSchema = z
  .object({
    ...classBase,
    teacher: TeacherRefSchema.nullable().optional(),
    students: z.array(StudentRefSchema),
    missions: z.array(MissionRefSchema),
  })
  .openapi("Class");

/**
 * Turma na **listagem** (`GET /classes`). O `list` popula apenas `teacher`;
 * `students` e `missions` continuam como arrays de id. Para a turma completa,
 * chamar `GET /classes/{id}`.
 */
export const ClassListItemSchema = z
  .object({
    ...classBase,
    teacher: TeacherRefSchema.nullable().optional(),
    students: z.array(classIdSchema),
    missions: z.array(classIdSchema),
  })
  .openapi("ClassListItem");

/**
 * Turma como sai da **escrita** (`POST /classes` e `PATCH /classes/{id}`).
 * Nenhum populate: os três relacionamentos são ids.
 */
export const ClassWriteResponseSchema = z
  .object({
    ...classBase,
    teacher: classIdSchema.nullable().optional(),
    students: z.array(classIdSchema),
    missions: z.array(classIdSchema),
  })
  .openapi("ClassWriteResponse");

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
