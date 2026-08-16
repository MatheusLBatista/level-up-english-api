import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import attitudeLogRoutes from "../../routes/attitudeLogRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Attitude from "../../models/Attitude.js";
import AttitudeLog from "../../models/AttitudeLog.js";
import Ranking from "../../models/Ranking.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de atitudes aplicadas", () => {
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

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(attitudeLogRoutes);
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

    participacao = await Attitude.create({
      name: "Participação",
      xp_value: 10,
      type: "positive",
      createdBy: profA._id,
    });

    atraso = await Attitude.create({
      name: "Atraso",
      xp_value: 5,
      type: "negative",
      createdBy: profA._id,
    });
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const aplicar = async(autor, { student = alunoA, attitude = participacao } = {}) =>
    await request(app)
      .post("/attitude-logs")
      .set("Authorization", await como(autor))
      .send({ student: String(student._id), attitude: String(attitude._id) });

  const xpDe = async(usuario) => (await User.findById(usuario._id)).xp;

  describe("POST /attitude-logs", () => {
    it("deve creditar o XP da atitude positiva ao aluno", async() => {
      const res = await aplicar(profA);

      expect(res.status).toBe(201);
      expect(res.body.data.xp_applied).toBe(10);
      expect(await xpDe(alunoA)).toBe(10);
    });

    it("deve descontar o XP da atitude negativa", async() => {
      const res = await aplicar(profA, { attitude: atraso });

      expect(res.status).toBe(201);
      expect(res.body.data.xp_applied).toBe(-5);
      expect(await xpDe(alunoA)).toBe(-5);
    });

    it("deve registrar quem aplicou a atitude", async() => {
      const res = await aplicar(profA);

      const log = await AttitudeLog.findById(res.body.data._id);
      expect(String(log.teacher)).toBe(String(profA._id));
      expect(String(log.student)).toBe(String(alunoA._id));
    });

    it("deve devolver a progressão do aluno junto com o log", async() => {
      const res = await aplicar(profA);

      expect(res.body.data.progression).toMatchObject({
        student: String(alunoA._id),
        previous_level: 1,
        leveled_up: false,
        xp: 10,
        level: 1,
      });
    });

    it("deve subir o nível do aluno quando o XP cruzar a faixa", async() => {
      await User.findByIdAndUpdate(alunoA._id, { xp: 95 });

      const res = await aplicar(profA);

      expect(res.body.data.progression.leveled_up).toBe(true);
      expect(res.body.data.progression.level).toBe(2);
      expect((await User.findById(alunoA._id)).level).toBe(2);
    });

    it("deve descer o nível do aluno quando a atitude negativa o tira da faixa", async() => {
      await User.findByIdAndUpdate(alunoA._id, { xp: 102, level: 2 });

      const res = await aplicar(profA, { attitude: atraso });

      expect(res.body.data.progression.leveled_down).toBe(true);
      expect((await User.findById(alunoA._id)).level).toBe(1);
    });

    it("deve atualizar o ranking global após aplicar a atitude", async() => {
      await aplicar(profA);

      const global = await Ranking.findOne({ type: "global" });
      const entrada = global.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(entrada.xp).toBe(10);
    });

    it("deve atualizar o ranking da turma do aluno", async() => {
      await aplicar(profA);

      const daTurma = await Ranking.findOne({ type: "class", class: turmaA._id });
      const entrada = daTurma.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(entrada.xp).toBe(10);
    });

    it("deve retornar 403 quando o aluno não for de uma turma da professora", async() => {
      const res = await aplicar(profA, { student: alunoB });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode aplicar atitudes a alunos das suas turmas.");
      expect(await xpDe(alunoB)).toBe(0);
    });

    it("deve retornar 403 quando o aluno não estiver em turma nenhuma", async() => {
      const res = await aplicar(profA, { student: semTurma });

      expect(res.status).toBe(403);
    });

    it("deve permitir que o admin aplique atitude a qualquer aluno", async() => {
      const res = await aplicar(admin, { student: alunoB });

      expect(res.status).toBe(201);
      expect(await xpDe(alunoB)).toBe(10);
    });

    it("deve retornar 400 quando a atitude estiver inativa", async() => {
      await Attitude.findByIdAndUpdate(participacao._id, { active: false });

      const res = await aplicar(profA);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Esta atitude está inativa.");
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 400 quando o alvo não for um aluno", async() => {
      const res = await aplicar(admin, { student: profB });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O usuário informado não é um aluno.");
    });

    it("deve retornar 404 quando a atitude não existir", async() => {
      const res = await request(app)
        .post("/attitude-logs")
        .set("Authorization", await como(profA))
        .send({ student: String(alunoA._id), attitude: ID_INEXISTENTE });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Attitude.");
    });

    it("deve retornar 400 quando o corpo for inválido", async() => {
      const res = await request(app)
        .post("/attitude-logs")
        .set("Authorization", await como(profA))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(2);
    });

    it("deve retornar 403 quando quem aplica é um aluno", async() => {
      const res = await aplicar(alunoA);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .post("/attitude-logs")
        .send({ student: String(alunoA._id), attitude: String(participacao._id) });

      expect(res.status).toBe(498);
    });
  });

  describe("GET /attitude-logs", () => {
    beforeEach(async() => {
      await aplicar(profA);
      await aplicar(profA, { attitude: atraso });
    });

    it("deve listar os logs para a professora", async() => {
      const res = await request(app).get("/attitude-logs").set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve popular aluno, professora e atitude", async() => {
      const res = await request(app).get("/attitude-logs").set("Authorization", await como(admin));

      const log = res.body.data.docs[0];
      expect(log.student.name).toBe("Aluno A");
      expect(log.teacher.name).toBe("Professora A");
      expect(log.attitude.name).toEqual(expect.any(String));
      expect(log.attitude.xp_value).toEqual(expect.any(Number));
    });

    it("deve filtrar por aluno", async() => {
      await aplicar(admin, { student: alunoB });

      const res = await request(app)
        .get(`/attitude-logs?student=${alunoB._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].student.name).toBe("Aluno B");
    });

    it("deve filtrar por atitude", async() => {
      const res = await request(app)
        .get(`/attitude-logs?attitude=${atraso._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].xp_applied).toBe(-5);
    });

    it("deve filtrar por professora", async() => {
      await aplicar(admin, { student: alunoB });

      const res = await request(app)
        .get(`/attitude-logs?teacher=${profA._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/attitude-logs?page=1&limit=1")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.totalPages).toBe(2);
    });

    it("deve retornar 403 quando quem lista é um aluno", async() => {
      const res = await request(app).get("/attitude-logs").set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/attitude-logs");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /attitude-logs/:id", () => {
    it("deve devolver o log populado", async() => {
      const criado = await aplicar(profA);

      const res = await request(app)
        .get(`/attitude-logs/${criado.body.data._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.student.name).toBe("Aluno A");
      expect(res.body.data.xp_applied).toBe(10);
    });

    it("deve retornar 404 quando o log não existir", async() => {
      const res = await request(app)
        .get(`/attitude-logs/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em AttitudeLog.");
    });
  });

  describe("PATCH /attitude-logs/:id", () => {
    let logId;

    beforeEach(async() => {
      const criado = await aplicar(profA);
      logId = criado.body.data._id;
    });

    it("deve aplicar apenas a diferença de XP ao trocar a atitude", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profA))
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(200);
      expect(res.body.data.xp_applied).toBe(-5);
      // Os 10 creditados foram estornados e os -5 aplicados no lugar.
      expect(await xpDe(alunoA)).toBe(-5);
    });

    it("deve manter o XP quando a atitude não for trocada", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profA))
        .send({});

      expect(res.status).toBe(200);
      expect(await xpDe(alunoA)).toBe(10);
    });

    it("deve retornar 403 quando a professora não foi quem aplicou", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profB))
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Teachers can only change logs they applied.");
      expect(await xpDe(alunoA)).toBe(10);
    });

    it("deve permitir que o admin altere log de qualquer professora", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .set("Authorization", await como(admin))
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(200);
      expect(await xpDe(alunoA)).toBe(-5);
    });

    it("deve retornar 400 quando a atitude nova estiver inativa", async() => {
      await Attitude.findByIdAndUpdate(atraso._id, { active: false });

      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profA))
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Esta atitude está inativa.");
      expect(await xpDe(alunoA)).toBe(10);
    });

    it("deve retornar 404 quando o log não existir", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(404);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .patch(`/attitude-logs/${logId}`)
        .send({ attitude: String(atraso._id) });

      expect(res.status).toBe(498);
    });
  });

  describe("DELETE /attitude-logs/:id", () => {
    let logId;

    beforeEach(async() => {
      const criado = await aplicar(profA);
      logId = criado.body.data._id;
    });

    it("deve estornar o XP ao desfazer a atitude", async() => {
      const res = await request(app)
        .delete(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("AttitudeLog deleted successfully.");
      expect(res.body.data).toBeNull();
      expect(await xpDe(alunoA)).toBe(0);
      expect(await AttitudeLog.findById(logId)).toBeNull();
    });

    it("deve devolver o XP descontado quando a atitude era negativa", async() => {
      const negativo = await aplicar(profA, { attitude: atraso });
      expect(await xpDe(alunoA)).toBe(5);

      await request(app)
        .delete(`/attitude-logs/${negativo.body.data._id}`)
        .set("Authorization", await como(profA));

      expect(await xpDe(alunoA)).toBe(10);
    });

    it("deve atualizar o ranking após o estorno", async() => {
      await request(app).delete(`/attitude-logs/${logId}`).set("Authorization", await como(profA));

      const global = await Ranking.findOne({ type: "global" });
      const entrada = global.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(entrada.xp).toBe(0);
    });

    it("deve retornar 403 quando a professora não foi quem aplicou", async() => {
      const res = await request(app)
        .delete(`/attitude-logs/${logId}`)
        .set("Authorization", await como(profB));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Teachers can only change logs they applied.");
      expect(await xpDe(alunoA)).toBe(10);
      expect(await AttitudeLog.findById(logId)).not.toBeNull();
    });

    it("deve permitir que o admin remova log de qualquer professora", async() => {
      const res = await request(app)
        .delete(`/attitude-logs/${logId}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 404 quando o log não existir", async() => {
      const res = await request(app)
        .delete(`/attitude-logs/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem remove é um aluno", async() => {
      const res = await request(app)
        .delete(`/attitude-logs/${logId}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/attitude-logs/${logId}`);

      expect(res.status).toBe(498);
    });
  });
});
