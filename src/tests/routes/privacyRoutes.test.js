import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import userRoutes from "../../routes/userRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Ranking from "../../models/Ranking.js";
import Attitude from "../../models/Attitude.js";
import AttitudeLog from "../../models/AttitudeLog.js";
import XpAdjustment from "../../models/XpAdjustment.js";
import Notification from "../../models/Notification.js";
import DataErasureLog from "../../models/DataErasureLog.js";
import Mission from "../../models/Mission.js";
import { UserSchema } from "../../schemas/UserSchema.js";
import { DataExportSchema } from "../../schemas/PrivacySchema.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de privacidade (LGPD)", () => {
  let app;
  let senhaHash;
  let admin;
  let teacher;
  let student;
  let turma;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  const criarUsuario = async(dados = {}) => await User.create({ password: senhaHash, role: "student", ...dados });

  const como = async(usuario) => {
    const res = await request(app).post("/auth/login").send({ email: usuario.email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return `Bearer ${res.body.data.accessToken}`;
  };

  beforeAll(async() => {
    await connectTestDatabase();
    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(userRoutes);
    app.use(errorHandler);
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  beforeEach(async() => {
    jest.clearAllMocks();
    await clearTestDatabase();

    admin = await criarUsuario({ name: "Admin", email: "admin@escola.com", role: "admin" });
    teacher = await criarUsuario({ name: "Ana Prof", email: "ana@escola.com", role: "teacher" });
    turma = await Class.create({ name: "Turma A", teacher: teacher._id });
    student = await criarUsuario({
      name: "Bia Souza",
      email: "bia@escola.com",
      class: turma._id,
      xp: 120,
      guardian_consent_at: new Date("2026-02-01"),
      guardian_consent_recorded_by: teacher._id,
    });
    await Class.updateOne({ _id: turma._id }, { students: [student._id] });
  });

  describe("POST /users/:id/erasure", () => {
    const eliminar = async(alvoId, quem, corpo = { confirm: true }) =>
      await request(app)
        .post(`/users/${alvoId}/erasure`)
        .set("Authorization", await como(quem))
        .send(corpo);

    it("deve anonimizar o aluno na hora, mantendo XP e turma, e registrar quem executou", async() => {
      await Notification.create({ user: student._id, type: "attitude", message: "Você ganhou 20 XP" });
      await XpAdjustment.create({ student: student._id, teacher: teacher._id, amount: 10, reason: "Faltou por doença" });

      const res = await eliminar(student._id, admin);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Dados do aluno eliminados.");
      expect(res.body.data).toMatchObject({
        name: "Aluno removido",
        email: `removido-${student._id}@anonimizado.invalid`,
        avatar_url: null,
        active: false,
        xp: 120,
        class: String(turma._id),
      });
      expect(res.body.data.anonymized_at).toEqual(expect.any(String));
      expect(res.body.data).not.toHaveProperty("password");
      expect(() => UserSchema.parse(res.body.data)).not.toThrow();

      expect(await Notification.countDocuments({ user: student._id })).toBe(0);
      expect((await XpAdjustment.findOne({ student: student._id })).reason).toBeNull();
      expect((await Class.findById(turma._id)).students.map(String)).toEqual([String(student._id)]);

      const registros = await DataErasureLog.find().lean();
      expect(registros).toHaveLength(1);
      expect(registros[0]).toMatchObject({ user: student._id, reason: "holder_request", performed_by: admin._id });
      expect(Object.keys(registros[0]).sort()).toEqual(["_id", "performed_at", "performed_by", "reason", "user"]);
    });

    it("deve impedir o login do aluno eliminado, com o e-mail e a senha antigos", async() => {
      await eliminar(student._id, admin);

      const res = await request(app).post("/auth/login").send({ email: "bia@escola.com", password: SENHA_PADRAO });

      expect(res.status).toBe(401);
    });

    it("deve tirar o aluno do ranking da turma", async() => {
      await eliminar(student._id, admin);

      const ranking = await Ranking.findOne({ type: "class", class: turma._id });
      expect(ranking.entries).toHaveLength(0);
    });

    it.each([
      ["sem confirmação", {}],
      ["com confirmação falsa", { confirm: false }],
    ])("deve retornar 400 sem eliminar nada quando vier %s", async(_, corpo) => {
      const res = await eliminar(student._id, admin, corpo);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "confirm", message: "Confirme a eliminação definitiva dos dados do aluno." }]);
      expect((await User.findById(student._id)).name).toBe("Bia Souza");
      expect(await DataErasureLog.countDocuments()).toBe(0);
    });

    it("deve retornar 403 quando a professora tenta eliminar aluno da turma dela", async() => {
      const res = await eliminar(student._id, teacher);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect((await User.findById(student._id)).name).toBe("Bia Souza");
    });

    it("deve retornar 403 quando o aluno tenta eliminar os próprios dados", async() => {
      const res = await eliminar(student._id, student);

      expect(res.status).toBe(403);
      expect((await User.findById(student._id)).anonymized_at).toBeNull();
    });

    it.each([
      ["for professor", () => teacher._id],
      ["não existir", () => ID_INEXISTENTE],
      ["tiver id inválido", () => "nao-e-id"],
    ])("deve retornar 404 quando o alvo %s", async(_, alvo) => {
      const res = await eliminar(alvo(), admin);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Aluno não encontrado.");
      expect((await User.findById(teacher._id)).name).toBe("Ana Prof");
    });

    it("deve retornar 409 quando os dados já tiverem sido eliminados", async() => {
      await eliminar(student._id, admin);

      const res = await eliminar(student._id, admin);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Os dados deste aluno já foram eliminados.");
      expect(await DataErasureLog.countDocuments()).toBe(1);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post(`/users/${student._id}/erasure`).send({ confirm: true });

      expect(res.status).toBe(498);
    });
  });

  describe("GET /users/:id/data-export", () => {
    const exportar = async(alvoId, quem) =>
      await request(app)
        .get(`/users/${alvoId}/data-export`)
        .set("Authorization", await como(quem));

    it("deve exportar os dados do aluno em JSON, como anexo, sem credenciais", async() => {
      const missao = await Mission.create({
        title: "Verbos",
        type: "quiz",
        xp_reward: 100,
        class_id: turma._id,
        createdBy: teacher._id,
        questions: [{ question: "Q?", options: { a: "1", b: "2", c: "3", d: "4" }, correct_answer: "a" }],
      });
      await User.updateOne({ _id: student._id }, {
        mission_progress: [{ mission_id: missao._id, done: true, score: 100, xp_earned: 100, completed_at: new Date() }],
        refreshtoken: "segredo",
      });
      const atitude = await Attitude.create({ name: "Participação", type: "positive", xp_value: 20 });
      await AttitudeLog.create({ student: student._id, teacher: teacher._id, attitude: atitude._id, xp_applied: 20 });
      await XpAdjustment.create({ student: student._id, teacher: teacher._id, amount: 10, xp_applied: 10, reason: "Monitoria" });
      await Notification.create({ user: student._id, type: "attitude", message: "Você ganhou 20 XP" });
      await Ranking.create({ type: "class", class: turma._id, entries: [{ user: student._id, xp: 120 }] });

      const res = await exportar(student._id, admin);

      expect(res.status).toBe(200);
      expect(res.headers["content-disposition"]).toBe(`attachment; filename="dados-aluno-${student._id}.json"`);

      const { data } = res.body;
      expect(() => DataExportSchema.strict().parse(data)).not.toThrow();
      expect(data.student).toMatchObject({
        _id: String(student._id),
        name: "Bia Souza",
        email: "bia@escola.com",
        class: { _id: String(turma._id), name: "Turma A" },
        xp: 120,
        guardian_consent_recorded_by: { _id: String(teacher._id), name: "Ana Prof" },
      });
      expect(JSON.stringify(data)).not.toMatch(/password|refreshtoken|accesstoken|segredo/);
      expect(data.mission_progress).toEqual([expect.objectContaining({
        mission: { _id: String(missao._id), title: "Verbos" },
        score: 100,
      })]);
      expect(data.attitude_logs).toEqual([expect.objectContaining({ attitude: "Participação", teacher: "Ana Prof" })]);
      expect(data.xp_adjustments).toEqual([expect.objectContaining({ reason: "Monitoria", teacher: "Ana Prof" })]);
      expect(data.notifications).toEqual([expect.objectContaining({ message: "Você ganhou 20 XP" })]);
      expect(data.rankings).toEqual([expect.objectContaining({
        type: "class",
        class: { _id: String(turma._id), name: "Turma A" },
        position: 1,
      })]);
    });

    it("deve exportar o que restou de um aluno já anonimizado", async() => {
      await request(app)
        .post(`/users/${student._id}/erasure`)
        .set("Authorization", await como(admin))
        .send({ confirm: true });

      const res = await exportar(student._id, admin);

      expect(res.status).toBe(200);
      expect(res.body.data.student.name).toBe("Aluno removido");
      expect(res.body.data.student.anonymized_at).toEqual(expect.any(String));
      expect(res.body.data.notifications).toEqual([]);
      expect(() => DataExportSchema.parse(res.body.data)).not.toThrow();
    });

    it("deve retornar 403 quando a professora tenta exportar aluno da turma dela", async() => {
      const res = await exportar(student._id, teacher);

      expect(res.status).toBe(403);
    });

    it("deve retornar 403 quando o aluno tenta exportar os próprios dados", async() => {
      const res = await exportar(student._id, student);

      expect(res.status).toBe(403);
    });

    it("deve retornar 404 quando o alvo não for aluno", async() => {
      const res = await exportar(teacher._id, admin);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Aluno não encontrado.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get(`/users/${student._id}/data-export`);

      expect(res.status).toBe(498);
    });
  });
});
