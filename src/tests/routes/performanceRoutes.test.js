import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import userRoutes from "../../routes/userRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Mission from "../../models/Mission.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rota de desempenho do aluno", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let alunoA;
  let alunoB;
  let semTurma;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";
  const semNota = { score: null, missions: 0 };

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

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const criarMissao = async(dados) =>
    await Mission.create({ xp_reward: 100, class_id: dados.class_id, createdBy: profA._id, ...dados });

  beforeEach(async() => {
    await clearTestDatabase();

    admin = await criarUsuario({ name: "Admin", email: "admin@escola.com", role: "admin" });
    profA = await criarUsuario({ name: "Professora A", email: "profa@escola.com", role: "teacher" });
    profB = await criarUsuario({ name: "Professora B", email: "profb@escola.com", role: "teacher" });

    const turmaA = await Class.create({ name: "Turma A", teacher: profA._id });
    const turmaB = await Class.create({ name: "Turma B", teacher: profB._id });

    alunoA = await criarUsuario({ name: "Aluno A", email: "alunoa@escola.com", class: turmaA._id });
    alunoB = await criarUsuario({ name: "Aluno B", email: "alunob@escola.com", class: turmaB._id });
    semTurma = await criarUsuario({ name: "Sem turma", email: "semturma@escola.com" });

    const pergunta = { question: "Cor?", options: { a: "red", b: "blue", c: "green", d: "pink" }, correct_answer: "a" };
    const quiz1 = await criarMissao({ title: "Quiz 1", type: "quiz", class_id: turmaA._id, questions: Array(5).fill(pergunta) });
    const quiz2 = await criarMissao({ title: "Quiz 2", type: "quiz", class_id: turmaA._id, questions: Array(5).fill(pergunta) });
    const audio = await criarMissao({ title: "Áudio", type: "audio", class_id: turmaA._id, content_url: "https://exemplo.com/a.mp3" });
    const pendente = await criarMissao({ title: "Quiz 3", type: "quiz", class_id: turmaA._id, questions: Array(5).fill(pergunta) });
    const excluida = await criarMissao({ title: "Excluída", type: "audio", class_id: turmaA._id, content_url: "https://exemplo.com/b.mp3" });

    await User.findByIdAndUpdate(alunoA._id, {
      mission_progress: [
        { mission_id: quiz1._id, done: true, score: 80 },
        { mission_id: quiz2._id, done: true, score: 100 },
        { mission_id: audio._id, done: true, score: 60 },
        { mission_id: pendente._id, done: false, score: 10 },
        { mission_id: excluida._id, done: true, score: 0 },
      ],
    });
    await Mission.deleteOne({ _id: excluida._id });

    await criarUsuario({
      name: "Colega A",
      email: "colegaa@escola.com",
      class: turmaA._id,
      mission_progress: [{ mission_id: quiz1._id, done: true, score: 50 }],
    });
    await criarUsuario({
      name: "Desativado A",
      email: "desativadoa@escola.com",
      class: turmaA._id,
      active: false,
      mission_progress: [{ mission_id: quiz1._id, done: true, score: 0 }],
    });
  });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const desempenho = async(quem, alvo) =>
    await request(app).get(`/users/${alvo}/performance`).set("Authorization", await como(quem));

  describe("GET /users/:id/performance", () => {
    it("deve devolver ao aluno a média de cada tipo, só com as missões concluídas que ainda existem", async() => {
      const res = await desempenho(alunoA, alunoA._id);

      expect(res.status).toBe(200);
      expect(res.body.data.student).toEqual({
        quiz: { score: 90, missions: 2 },
        vocabulary: semNota,
        audio: { score: 60, missions: 1 },
      });
    });

    it("deve trazer a média da turma só com os alunos ativos, cada um pesando igual", async() => {
      const res = await desempenho(alunoA, alunoA._id);

      expect(res.body.data.class).toEqual({
        quiz: { score: 70, students: 2 },
        vocabulary: { score: null, students: 0 },
        audio: { score: 60, students: 1 },
      });
    });

    it("deve devolver os três tipos sem nota para aluno sem progresso", async() => {
      const res = await desempenho(alunoB, alunoB._id);

      expect(res.status).toBe(200);
      expect(res.body.data.student).toEqual({ quiz: semNota, vocabulary: semNota, audio: semNota });
    });

    it("deve devolver class null para aluno sem turma", async() => {
      const res = await desempenho(admin, semTurma._id);

      expect(res.body.data.class).toBeNull();
    });

    it("deve retornar 403 quando o aluno pede o desempenho de outro", async() => {
      const res = await desempenho(alunoB, alunoA._id);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode ver o seu desempenho.");
    });

    it("deve permitir que a professora veja aluno da turma dela", async() => {
      const res = await desempenho(profA, alunoA._id);

      expect(res.status).toBe(200);
      expect(res.body.data.student.quiz).toEqual({ score: 90, missions: 2 });
    });

    it("deve retornar 403 quando a professora pede aluno de outra turma ou sem turma", async() => {
      const outraTurma = await desempenho(profB, alunoA._id);
      const sem = await desempenho(profA, semTurma._id);

      expect(outraTurma.status).toBe(403);
      expect(outraTurma.body.message).toBe("Você só pode ver o desempenho de alunos das suas turmas.");
      expect(sem.status).toBe(403);
    });

    it("deve permitir que o admin veja qualquer aluno", async() => {
      const res = await desempenho(admin, semTurma._id);

      expect(res.status).toBe(200);
    });

    it("deve retornar 404 quando o id não for de aluno, não existir ou for malformado", async() => {
      for (const alvo of [profA._id, ID_INEXISTENTE, "id-invalido"]) {
        const res = await desempenho(admin, alvo);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Aluno não encontrado.");
      }
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get(`/users/${alunoA._id}/performance`);

      expect(res.status).toBe(498);
    });
  });
});
