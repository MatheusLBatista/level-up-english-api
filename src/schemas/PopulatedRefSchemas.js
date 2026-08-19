import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * Referências populadas.
 *
 * Vários endpoints declaram um campo como ObjectId no model, mas o repositório
 * o devolve populado com um subconjunto de campos. Estes schemas descrevem o
 * que a API realmente entrega, para que o cliente não modele o campo como id.
 *
 * O recorte de cada um vem do `select` do populate correspondente, em
 * `src/repository/`. Mudar aquele select obriga a mudar o schema daqui.
 */

const objectId = z.string().openapi({ example: "507f1f77bcf86cd799439011" });

/**
 * O model `User` declara `progress` como virtual serializado (`toJSON: { virtuals: true }`),
 * então ele acompanha o usuário mesmo quando o populate não trouxe o `xp`.
 * Nesse caso o virtual calcula sobre `undefined` e devolve sempre nível 1 / 0%.
 *
 * Está documentado porque está na resposta, mas **não deve ser exibido** a partir
 * de uma referência populada: o valor é um artefato, não o progresso do usuário.
 * Para progresso real, buscar o usuário em `GET /users/{id}`.
 */
const stubProgress = z
  .object({
    current_level_xp: z.number().openapi({ example: 0 }),
    next_level_xp: z.number().nullable().openapi({ example: 100 }),
    xp_to_next_level: z.number().openapi({ example: 100 }),
    percentage: z.number().openapi({ example: 0 }),
  })
  .optional()
  .openapi({
    description:
      "Artefato do virtual `progress` do model User. Em referência populada o XP não é carregado, "
      + "então este objeto sempre indica nível 1 e 0%. Não use para exibir progresso.",
  });

/** `Class.teacher` — populate com `name email role`. */
export const TeacherRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "Ana Souza" }),
    email: z.string().openapi({ example: "ana.souza@escola.com" }),
    role: z.enum(["student", "teacher", "admin"]).openapi({ example: "teacher" }),
    progress: stubProgress,
  })
  .openapi("TeacherRef");

/** `Class.students[]` — populate com `name role`. Sem e-mail, de propósito. */
export const StudentRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "João Pedro" }),
    role: z.enum(["student", "teacher", "admin"]).openapi({ example: "student" }),
    progress: stubProgress,
  })
  .openapi("StudentRef");

/** `AttitudeLog.student` e `AttitudeLog.teacher` — populate com `name email`. */
export const UserContactRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "João Pedro" }),
    email: z.string().openapi({ example: "joao.pedro@escola.com" }),
    progress: stubProgress,
  })
  .openapi("UserContactRef");

/** `Mission.createdBy` e `Attitude.createdBy` — populate só com `name`. */
export const UserNameRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "Ana Souza" }),
    progress: stubProgress,
  })
  .openapi("UserNameRef");

/** `Mission.class_id` e `Ranking.class` — populate só com `name`. */
export const ClassRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "Turma A" }),
  })
  .openapi("ClassRef");

/** `Class.missions[]` — populate com `title type active`. Sem o gabarito. */
export const MissionRefSchema = z
  .object({
    _id: objectId,
    title: z.string().openapi({ example: "Explorador de Palavras" }),
    type: z.enum(["quiz", "vocabulary", "audio"]).openapi({ example: "quiz" }),
    active: z.boolean().openapi({ example: true }),
  })
  .openapi("MissionRef");

/** `AttitudeLog.attitude` — populate com `name type xp_value`. */
export const AttitudeRefSchema = z
  .object({
    _id: objectId,
    name: z.string().openapi({ example: "Participação em aula" }),
    type: z.enum(["positive", "negative"]).openapi({ example: "positive" }),
    xp_value: z.number().openapi({ example: 10 }),
  })
  .openapi("AttitudeRef");
