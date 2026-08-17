import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import rankingRoutes from "../../routes/rankingRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Ranking from "../../models/Ranking.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de ranking", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let alunoA;
  let alunoB;
  let semTurma;
  let turmaA;
  let turmaB;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(rankingRoutes);
    app.use(errorHandler);
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const recalcular = async(autor = admin) =>
    await request(app).post("/rankings/refresh").set("Authorization", await como(autor));

  beforeEach(async() => {
    jest.clearAllMocks();
    await clearTestDatabase();

    admin = await criarUsuario({ name: "Admin", email: "admin@escola.com", role: "admin" });
    profA = await criarUsuario({ name: "Professora A", email: "profa@escola.com", role: "teacher" });

    turmaA = await Class.create({ name: "Turma A", teacher: profA._id });
    turmaB = await Class.create({ name: "Turma B", teacher: profA._id });

    alunoA = await criarUsuario({
      name: "Aluno A",
      email: "alunoa@escola.com",
      class: turmaA._id,
      xp: 400,
      level: 3,
    });

    alunoB = await criarUsuario({
      name: "Aluno B",
      email: "alunob@escola.com",
      class: turmaB._id,
      xp: 100,
      level: 2,
    });

    semTurma = await criarUsuario({ name: "Sem turma", email: "semturma@escola.com", xp: 50 });
  });

  describe("POST /rankings/refresh", () => {
    it("deve montar o ranking global a partir do XP dos alunos", async() => {
      const res = await recalcular();

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Rankings recalculados com sucesso.");
      expect(res.body.data.global.entries).toHaveLength(3);
    });

    it("deve ordenar as entradas do maior para o menor XP", async() => {
      const res = await recalcular();

      expect(res.body.data.global.entries.map((entrada) => entrada.xp)).toEqual([400, 100, 50]);
    });

    it("deve recalcular o nível a partir do XP", async() => {
      // O aluno tem 400 XP mas o campo level foi gravado defasado.
      await User.findByIdAndUpdate(alunoA._id, { level: 1 });

      const res = await recalcular();

      expect(res.body.data.global.entries[0].level).toBe(3);
    });

    it("deve montar um ranking para cada turma ativa", async() => {
      const res = await recalcular();

      expect(res.body.data.classes).toHaveLength(2);
      expect(await Ranking.countDocuments({ type: "class" })).toBe(2);
    });

    it("deve colocar em cada ranking de turma apenas os alunos dela", async() => {
      await recalcular();

      const daTurmaA = await Ranking.findOne({ type: "class", class: turmaA._id });
      expect(daTurmaA.entries).toHaveLength(1);
      expect(String(daTurmaA.entries[0].user)).toBe(String(alunoA._id));
    });

    it("deve deixar de fora professores e admin", async() => {
      await recalcular();

      const global = await Ranking.findOne({ type: "global" });
      const ids = global.entries.map((entrada) => String(entrada.user));
      expect(ids).not.toContain(String(profA._id));
      expect(ids).not.toContain(String(admin._id));
    });

    it("deve deixar de fora alunos desativados", async() => {
      await User.findByIdAndUpdate(alunoB._id, { active: false });

      await recalcular();

      const global = await Ranking.findOne({ type: "global" });
      const ids = global.entries.map((entrada) => String(entrada.user));
      expect(ids).not.toContain(String(alunoB._id));
    });

    it("deve cortar o ranking no top 30", async() => {
      const extras = Array.from({ length: 32 }, (_, index) => ({
        name: `Aluno extra ${index}`,
        email: `extra${index}@escola.com`,
        password: senhaHash,
        role: "student",
        class: turmaA._id,
        xp: 1000 + index,
      }));
      await User.insertMany(extras);

      const res = await recalcular();

      expect(res.body.data.global.entries).toHaveLength(30);
      // Sobram os de maior XP: o menor da lista é 1002, e os de 400/100/50 caem fora.
      expect(res.body.data.global.entries[29].xp).toBe(1002);
    });

    it("deve atualizar o ranking já existente em vez de duplicar", async() => {
      await recalcular();
      await User.findByIdAndUpdate(alunoB._id, { xp: 900 });

      await recalcular();

      expect(await Ranking.countDocuments({ type: "global" })).toBe(1);
      const global = await Ranking.findOne({ type: "global" });
      expect(global.entries[0].xp).toBe(900);
    });

    it("deve retornar 403 quando quem recalcula é a professora", async() => {
      const res = await recalcular(profA);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 403 quando quem recalcula é um aluno", async() => {
      const res = await recalcular(alunoA);

      expect(res.status).toBe(403);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/rankings/refresh");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /rankings/global", () => {
    it("deve retornar 404 antes do primeiro recálculo", async() => {
      const res = await request(app)
        .get("/rankings/global")
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Ranking.");
    });

    describe("com o ranking já montado", () => {
      beforeEach(async() => {
        await recalcular();
      });

      it("deve devolver o ranking global para o aluno", async() => {
        const res = await request(app)
          .get("/rankings/global")
          .set("Authorization", await como(alunoA));

        expect(res.status).toBe(200);
        expect(res.body.data.type).toBe("global");
        expect(res.body.data.entries).toHaveLength(3);
      });

      it("deve trazer os dados do aluno em cada entrada", async() => {
        const res = await request(app)
          .get("/rankings/global")
          .set("Authorization", await como(admin));

        const primeira = res.body.data.entries[0];
        expect(primeira.user.name).toBe("Aluno A");
        expect(primeira.user.email).toBe("alunoa@escola.com");
        expect(primeira.user).not.toHaveProperty("password");
      });

      it("deve devolver o ranking para a professora", async() => {
        const res = await request(app)
          .get("/rankings/global")
          .set("Authorization", await como(profA));

        expect(res.status).toBe(200);
      });

      it("deve retornar 498 quando não houver autenticação", async() => {
        const res = await request(app).get("/rankings/global");

        expect(res.status).toBe(498);
      });
    });
  });

  describe("GET /rankings/me", () => {
    beforeEach(async() => {
      await recalcular();
    });

    it("deve devolver o ranking da turma do aluno logado", async() => {
      const res = await request(app).get("/rankings/me").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.class.name).toBe("Turma A");
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.entries[0].user.name).toBe("Aluno A");
    });

    it("deve retornar 404 quando o aluno não tem turma", async() => {
      const res = await request(app).get("/rankings/me").set("Authorization", await como(semTurma));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Você não está matriculado em nenhuma turma.");
    });

    it("deve retornar 404 para a professora, que não tem turma vinculada no perfil", async() => {
      const res = await request(app).get("/rankings/me").set("Authorization", await como(profA));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Você não está matriculado em nenhuma turma.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/rankings/me");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /rankings/class/:classId", () => {
    beforeEach(async() => {
      await recalcular();
    });

    it("deve devolver o ranking da própria turma para o aluno", async() => {
      const res = await request(app)
        .get(`/rankings/class/${turmaA._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.class.name).toBe("Turma A");
    });

    it("deve retornar 403 quando o aluno pedir o ranking de outra turma", async() => {
      const res = await request(app)
        .get(`/rankings/class/${turmaB._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode ver o ranking da sua própria turma.");
    });

    it("deve permitir que a professora veja o ranking de qualquer turma", async() => {
      const res = await request(app)
        .get(`/rankings/class/${turmaB._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.entries[0].user.name).toBe("Aluno B");
    });

    it("deve permitir que o admin veja o ranking de qualquer turma", async() => {
      const res = await request(app)
        .get(`/rankings/class/${turmaB._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
    });

    it("deve retornar 404 quando a turma não tiver ranking", async() => {
      const res = await request(app)
        .get(`/rankings/class/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Ranking.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get(`/rankings/class/${turmaA._id}`);

      expect(res.status).toBe(498);
    });
  });
});
