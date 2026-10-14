import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import userRoutes from "../../routes/userRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Mission from "../../models/Mission.js";
import Attitude from "../../models/Attitude.js";
import AttitudeLog from "../../models/AttitudeLog.js";
import XpAdjustment from "../../models/XpAdjustment.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rota de histórico de XP", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let alunoA;
  let alunoB;
  let semTurma;
  let turmaA;
  let participacao;
  let atraso;
  let quiz;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

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
    profA = await criarUsuario({ name: "Professora A", email: "profa@escola.com", role: "teacher" });
    profB = await criarUsuario({ name: "Professora B", email: "profb@escola.com", role: "teacher" });

    turmaA = await Class.create({ name: "Turma A", teacher: profA._id });
    const turmaB = await Class.create({ name: "Turma B", teacher: profB._id });

    alunoA = await criarUsuario({ name: "Aluno A", email: "alunoa@escola.com", class: turmaA._id });
    alunoB = await criarUsuario({ name: "Aluno B", email: "alunob@escola.com", class: turmaB._id });
    semTurma = await criarUsuario({ name: "Sem turma", email: "semturma@escola.com" });

    participacao = await Attitude.create({ name: "Participação", xp_value: 10, type: "positive", createdBy: profA._id });
    atraso = await Attitude.create({ name: "Atraso", xp_value: 5, type: "negative", createdBy: profA._id });

    quiz = await Mission.create({
      title: "Quiz de Cores",
      type: "vocabulary",
      content: "red, blue",
      xp_reward: 100,
      class_id: turmaA._id,
      createdBy: profA._id,
    });

    // Linha do tempo do alunoA, fora de ordem de propósito.
    await AttitudeLog.create({
      student: alunoA._id,
      attitude: participacao._id,
      teacher: profA._id,
      xp_applied: 10,
      applied_at: new Date("2026-10-01T10:00:00Z"),
    });
    await XpAdjustment.create({
      student: alunoA._id,
      teacher: profA._id,
      amount: -50,
      // O aluno tinha 3 XP: o ajuste parou no piso.
      xp_applied: -3,
      reason: "Correção de lançamento",
      applied_at: new Date("2026-10-04T10:00:00Z"),
    });
    await AttitudeLog.create({
      student: alunoA._id,
      attitude: atraso._id,
      teacher: profA._id,
      xp_applied: -5,
      applied_at: new Date("2026-10-03T10:00:00Z"),
    });
    await User.findByIdAndUpdate(alunoA._id, {
      mission_progress: [
        { mission_id: quiz._id, done: true, score: 80, xp_earned: 80, completed_at: new Date("2026-10-02T10:00:00Z") },
        // Missão tentada sem render XP: não entra no histórico.
        { mission_id: ID_INEXISTENTE, done: false, score: 0, xp_earned: 0 },
      ],
    });

    // Outro aluno, para garantir que o histórico não mistura alunos.
    await XpAdjustment.create({ student: alunoB._id, teacher: profB._id, amount: 20, xp_applied: 20 });
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const historico = async(quem, alvo, query = "") =>
    await request(app).get(`/users/${alvo}/xp-history${query}`).set("Authorization", await como(quem));

  describe("GET /users/:id/xp-history", () => {
    it("deve devolver ao aluno o próprio histórico com as três origens, do mais recente ao mais antigo", async() => {
      const res = await historico(alunoA, alunoA._id);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toEqual([
        {
          id: expect.any(String),
          kind: "adjustment",
          xp: -3,
          title: "Ajuste de XP",
          detail: "Correção de lançamento",
          teacher: "Professora A",
          date: "2026-10-04T10:00:00.000Z",
        },
        {
          id: expect.any(String),
          kind: "attitude",
          xp: -5,
          title: "Atraso",
          detail: "Professora A",
          date: "2026-10-03T10:00:00.000Z",
        },
        {
          id: String(quiz._id),
          kind: "mission",
          xp: 80,
          title: "Quiz de Cores",
          detail: "Melhor nota: 80%",
          date: "2026-10-02T10:00:00.000Z",
        },
        {
          id: expect.any(String),
          kind: "attitude",
          xp: 10,
          title: "Participação",
          detail: "Professora A",
          date: "2026-10-01T10:00:00.000Z",
        },
      ]);
    });

    it("deve mostrar a atitude negativa com xp negativo", async() => {
      const res = await historico(alunoA, alunoA._id);

      const negativa = res.body.data.docs.find((item) => item.title === "Atraso");
      expect(negativa.xp).toBe(-5);
    });

    it("deve mostrar o xp_applied real do ajuste que bateu no piso, e não o amount pedido", async() => {
      const res = await historico(alunoA, alunoA._id);

      const ajuste = res.body.data.docs.find((item) => item.kind === "adjustment");
      expect(ajuste.xp).toBe(-3);
    });

    it("deve usar ids estáveis: o _id do log e do ajuste, e o id da missão", async() => {
      const log = await AttitudeLog.findOne({ attitude: atraso._id });
      const ajuste = await XpAdjustment.findOne({ student: alunoA._id });

      const res = await historico(alunoA, alunoA._id);
      const ids = res.body.data.docs.map((item) => item.id);

      expect(ids).toEqual([String(ajuste._id), String(log._id), String(quiz._id), expect.any(String)]);
    });

    it("deve indicar atitude e missão removidas e ajuste sem motivo", async() => {
      await Attitude.findByIdAndDelete(atraso._id);
      await Mission.findByIdAndDelete(quiz._id);
      await XpAdjustment.updateOne({ student: alunoA._id }, { $unset: { reason: 1 } });

      const res = await historico(alunoA, alunoA._id);
      const titulos = res.body.data.docs.map((item) => item.title);

      expect(titulos).toEqual(["Ajuste de XP", "Atitude removida", "Missão removida", "Participação"]);
      expect(res.body.data.docs[0].detail).toBeNull();
    });

    it("deve devolver histórico vazio para aluno sem XP", async() => {
      const res = await historico(semTurma, semTurma._id);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ docs: [], totalDocs: 0, totalPages: 1, hasNextPage: false });
    });

    it("deve retornar 403 quando o aluno pede o histórico de outro", async() => {
      const res = await historico(alunoA, alunoB._id);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode ver o seu histórico de XP.");
    });

    it("deve permitir que a professora veja aluno da turma dela", async() => {
      const res = await historico(profA, alunoA._id);

      expect(res.status).toBe(200);
      expect(res.body.data.totalDocs).toBe(4);
    });

    it("deve retornar 403 quando a professora pede aluno de outra turma ou sem turma", async() => {
      const outraTurma = await historico(profA, alunoB._id);
      const semTurmaRes = await historico(profA, semTurma._id);

      expect(outraTurma.status).toBe(403);
      expect(outraTurma.body.message).toBe("Você só pode ver o histórico de XP de alunos das suas turmas.");
      expect(semTurmaRes.status).toBe(403);
    });

    it("deve permitir que o admin veja qualquer aluno", async() => {
      const res = await historico(admin, alunoB._id);

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toEqual([
        expect.objectContaining({ kind: "adjustment", xp: 20, detail: null, teacher: "Professora B" }),
      ]);
    });

    it("deve retornar 404 quando o id não for de aluno, não existir ou for malformado", async() => {
      const professor = await historico(admin, profA._id);
      const inexistente = await historico(admin, ID_INEXISTENTE);
      const malformado = await historico(profA, "abc");

      [professor, inexistente, malformado].forEach((res) => {
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Aluno não encontrado.");
      });
    });

    it("deve paginar com page e limit", async() => {
      const res = await historico(alunoA, alunoA._id, "?page=2&limit=3");

      expect(res.body.data).toEqual({
        docs: [expect.objectContaining({ title: "Participação" })],
        totalDocs: 4,
        limit: 3,
        page: 2,
        totalPages: 2,
        hasPrevPage: true,
        hasNextPage: false,
        prevPage: 1,
        nextPage: null,
      });
    });

    it("deve usar limit 10 por padrão e no máximo 50", async() => {
      const padrao = await historico(alunoA, alunoA._id);
      const acima = await historico(alunoA, alunoA._id, "?limit=500");

      expect(padrao.body.data).toMatchObject({ limit: 10, page: 1, totalPages: 1, prevPage: null });
      expect(acima.body.data.limit).toBe(50);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get(`/users/${alunoA._id}/xp-history`);

      expect(res.status).toBe(498);
    });
  });
});
