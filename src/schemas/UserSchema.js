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

/**
 * Uma entrada de `User.mission_progress`. O `xp_earned` é acumulado, não o da
 * última submissão: guarda o total já creditado pela missão, que é o que impede
 * o aluno de ser premiado de novo ao refazê-la.
 */
const MissionProgressEntrySchema = z
  .object({
    mission_id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    done: z.boolean().openapi({ example: true }),
    score: z.number().openapi({ example: 80 }),
    xp_earned: z.number().openapi({ example: 80 }),
    completed_at: z
      .string()
      .nullable()
      .openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("MissionProgressEntry");

export const GUARDIAN_CONSENT_MESSAGE =
  "Confirme o recebimento do termo de consentimento assinado pelos responsáveis.";

export const GuardianConsentSchema = z
  .literal(true, { errorMap: () => ({ message: GUARDIAN_CONSENT_MESSAGE }) })
  .openapi({
    example: true,
    description:
      "Termo de consentimento assinado pelos responsáveis recebido. Não é um aceite do aluno: "
      + "registra que a escola recebeu o termo em papel. Só `true` é aceito.",
  });

export const UserSchema = z
  .object({
    _id: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    role: z.enum(["student", "teacher", "admin"]).openapi({ example: "student" }),
    xp: z.number().openapi({ example: 0 }),
    level: z.number().openapi({ example: 1 }),
    progress: LevelProgressSchema,
    class: z
      .string()
      .nullable()
      .optional()
      .openapi({
        example: "507f1f77bcf86cd799439011",
        description:
          "Turma do aluno. Diferente das demais referências, esta **não** vem populada: "
          + "é o id cru. Para os dados da turma, chamar `GET /classes/{id}`.",
      }),
    mission_progress: z.array(MissionProgressEntrySchema).openapi({
      description:
        "Histórico de submissões do aluno, uma entrada por missão. Alimenta a tela de progresso.",
    }),
    badges: z.array(z.string()).openapi({
      example: [],
      description: "Campo previsto no RF-009. Nenhuma regra o alimenta hoje: é sempre uma lista vazia.",
    }),
    avatar_url: z.string().nullable().openapi({
      example: "/uploads/avatars/507f1f77bcf86cd799439011-1729700000000.webp",
      description:
        "Caminho **relativo** da foto de perfil: concatenar com a URL base da API. "
        + "`null` quando o usuário não tem foto. A imagem é pública (sem token) e a URL "
        + "muda a cada troca, então pode ser cacheada.",
    }),
    active: z.boolean().openapi({ example: true }),
    deactivated_at: z.string().nullable().openapi({
      example: null,
      description:
        "Quando a conta foi desativada; `null` enquanto ativa. Conta o prazo de retenção "
        + "dos dados do aluno.",
    }),
    anonymized_at: z.string().nullable().openapi({
      example: null,
      description:
        "Quando os dados pessoais do aluno foram eliminados, pelo prazo de retenção ou a pedido "
        + "do titular. Depois disso o nome é \"Aluno removido\" e o e-mail é um endereço fictício.",
    }),
    show_in_global_ranking: z.boolean().openapi({
      example: true,
      description: "Se o aluno aparece no ranking geral. O ranking da turma não muda.",
    }),
    guardian_consent_at: z.string().nullable().openapi({
      example: "2026-01-01T00:00:00.000Z",
      description:
        "Quando a escola registrou o recebimento do termo assinado pelos responsáveis. Todo aluno "
        + "nasce com ele preenchido; é `null` só para professor e admin.",
    }),
    guardian_consent_recorded_by: z.string().nullable().openapi({
      example: "507f1f77bcf86cd799439011",
      description: "Id do professor ou admin que registrou o termo.",
    }),
    guardian_consent_revoked_at: z.string().nullable().openapi({
      example: null,
      description:
        "Quando o consentimento foi revogado. A revogação desativa a conta, e reativar exige um "
        + "termo novo (guardian_consent no PATCH /users/{id}).",
    }),
    createdAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-01-01T00:00:00.000Z" }),
  })
  .openapi("User");

export const CreateUserBodySchema = z
  .object({
    guardian_consent: GuardianConsentSchema.optional().openapi({
      description:
        "Obrigatório quando o usuário criado é aluno (papel student ou não informado). "
        + "Ignorado para professor e admin.",
    }),
    name: z.string().openapi({ example: "John Doe" }),
    email: z.string().email().openapi({ example: "john@example.com" }),
    password: z.string().min(6).openapi({ example: "senha123" }),
    role: z.enum(["student", "teacher", "admin"]).optional().openapi({
      example: "student",
      description: "Apenas admin pode informar um papel diferente de student.",
    }),
    class: z.string().optional().openapi({
      example: "507f1f77bcf86cd799439011",
      description: "Turma ativa. Só para alunos; obrigatória para professor, e precisa ser dele. "
        + "O id do aluno entra em Class.students.",
    }),
  })
  .superRefine((data, ctx) => {
    if ((data.role ?? "student") === "student" && data.guardian_consent !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardian_consent"],
        message: GUARDIAN_CONSENT_MESSAGE,
      });
    }
  })
  .openapi("CreateUserBody");

export const UpdateUserBodySchema = z
  .object({
    name: z.string().optional().openapi({ example: "John Doe Updated" }),
    badges: z.array(z.string()).optional().openapi({ example: ["first_login"] }),
    active: z.boolean().optional().openapi({
      example: true,
      description:
        "Apenas admin. Ignorado nos demais papéis. Desativar preenche `deactivated_at` e "
        + "encerra a sessão; reativar limpa `deactivated_at`.",
    }),
    guardian_consent: GuardianConsentSchema.optional().openapi({
      description:
        "Apenas admin, e só tem efeito ao reativar (active: true) um aluno com consentimento "
        + "revogado: registra o termo novo, que é obrigatório nesse caso. Ignorado nos demais.",
    }),
    show_in_global_ranking: z.boolean().optional().openapi({
      example: false,
      description: "O próprio usuário ou admin. Com false, o aluno sai do ranking geral na hora; "
        + "continua no ranking da turma.",
    }),
    class: z.string().nullable().optional().openapi({
      example: "507f1f77bcf86cd799439011",
      description:
        "Apenas admin; ignorado nos demais papéis. Move o aluno para a turma informada, "
        + "ou tira o aluno da turma com null.",
    }),
  })
  .openapi("UpdateUserBody");
