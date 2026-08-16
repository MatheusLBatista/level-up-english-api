import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import attitudeRoutes from "../../routes/attitudeRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Attitude from "../../models/Attitude.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de atitudes", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let aluno;
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
    app.use(attitudeRoutes);
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
    aluno = await criarUsuario({ name: "Aluno", email: "aluno@escola.com" });

    participacao = await Attitude.create({
      name: "Participação",
      description: "Participou ativamente da aula.",
      xp_value: 10,
      type: "positive",
      createdBy: profA._id,
    });

    atraso = await Attitude.create({
      name: "Atraso",
      xp_value: -5,
      type: "negative",
      createdBy: profB._id,
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

  describe("GET /attitudes", () => {
    it("deve listar o catálogo para o admin", async() => {
      const res = await request(app).get("/attitudes").set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve listar o catálogo para a professora", async() => {
      const res = await request(app).get("/attitudes").set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve listar o catálogo para o aluno", async() => {
      const res = await request(app).get("/attitudes").set("Authorization", await como(aluno));

      // O aluno enxerga o que pode ganhar e perder; quem aplica é a professora.
      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve trazer só o nome de quem cadastrou", async() => {
      const res = await request(app).get("/attitudes").set("Authorization", await como(admin));

      const atitude = res.body.data.docs.find((doc) => doc.name === "Participação");
      expect(atitude.createdBy.name).toBe("Professora A");
      expect(atitude.createdBy).not.toHaveProperty("email");
    });

    it("deve filtrar por tipo", async() => {
      const res = await request(app)
        .get("/attitudes?type=negative")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Atraso");
    });

    it("deve filtrar por trecho do nome, sem diferenciar maiúsculas", async() => {
      const res = await request(app)
        .get("/attitudes?name=partic")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Participação");
    });

    it("deve filtrar por situação", async() => {
      await Attitude.findByIdAndUpdate(atraso._id, { active: false });

      const res = await request(app)
        .get("/attitudes?active=false")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Atraso");
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/attitudes?page=1&limit=1")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.hasNextPage).toBe(true);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/attitudes");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /attitudes/:id", () => {
    it("deve devolver a atitude com quem a cadastrou", async() => {
      const res = await request(app)
        .get(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(aluno));

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Participação");
      expect(res.body.data.xp_value).toBe(10);
      expect(res.body.data.createdBy.name).toBe("Professora A");
    });

    it("deve retornar 404 quando a atitude não existir", async() => {
      const res = await request(app)
        .get(`/attitudes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Attitude.");
    });
  });

  describe("POST /attitudes", () => {
    const nova = { name: "Ajudou um colega", xp_value: 15, type: "positive" };

    it("deve registrar a professora que cadastrou a atitude", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send(nova);

      expect(res.status).toBe(201);
      expect(res.body.data.createdBy).toBe(String(profA._id));
      expect(res.body.data.active).toBe(true);
    });

    it("deve permitir que o admin cadastre", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(admin))
        .send(nova);

      expect(res.status).toBe(201);
    });

    it("deve aceitar atitude negativa com xp negativo", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send({ name: "Conversa paralela", xp_value: -10, type: "negative" });

      expect(res.status).toBe(201);
      expect(res.body.data.xp_value).toBe(-10);
    });

    it("deve retornar 400 quando já existir atitude com o mesmo nome", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send({ ...nova, name: "Participação" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Attitude já existe.");
    });

    it("deve barrar nome repetido mesmo com outra caixa", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send({ ...nova, name: "participação" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Attitude já existe.");
    });

    it("deve retornar 400 quando o tipo for inválido", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send({ ...nova, type: "neutro" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("type");
    });

    it("deve retornar 400 quando o xp não for enviado", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(profA))
        .send({ name: "Sem xp", type: "positive" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("xp_value");
    });

    it("deve retornar 403 quando quem cadastra é um aluno", async() => {
      const res = await request(app)
        .post("/attitudes")
        .set("Authorization", await como(aluno))
        .send(nova);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect(await Attitude.findOne({ name: nova.name })).toBeNull();
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/attitudes").send(nova);

      expect(res.status).toBe(498);
    });
  });

  describe("PATCH /attitudes/:id", () => {
    it("deve permitir que a professora altere o xp da atitude", async() => {
      const res = await request(app)
        .patch(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(profA))
        .send({ xp_value: 25 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Attitude updated successfully.");
      expect(res.body.data.xp_value).toBe(25);
    });

    it("deve permitir que a professora altere atitude cadastrada por outra", async() => {
      const res = await request(app)
        .patch(`/attitudes/${atraso._id}`)
        .set("Authorization", await como(profA))
        .send({ xp_value: -20 });

      // O catálogo é compartilhado: não há posse por quem cadastrou.
      expect(res.status).toBe(200);
      expect(res.body.data.xp_value).toBe(-20);
    });

    it("deve permitir desativar a atitude", async() => {
      const res = await request(app)
        .patch(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(admin))
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe(false);
    });

    it("deve aceitar reenviar o próprio nome da atitude", async() => {
      const res = await request(app)
        .patch(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Participação", xp_value: 12 });

      expect(res.status).toBe(200);
    });

    it("deve retornar 400 quando o nome novo já for de outra atitude", async() => {
      const res = await request(app)
        .patch(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Atraso" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Attitude já existe.");
    });

    it("deve retornar 404 quando a atitude não existir", async() => {
      const res = await request(app)
        .patch(`/attitudes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ xp_value: 5 });

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem altera é um aluno", async() => {
      const res = await request(app)
        .patch(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(aluno))
        .send({ xp_value: 999 });

      expect(res.status).toBe(403);

      const salva = await Attitude.findById(participacao._id);
      expect(salva.xp_value).toBe(10);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).patch(`/attitudes/${participacao._id}`).send({ xp_value: 5 });

      expect(res.status).toBe(498);
    });
  });

  describe("DELETE /attitudes/:id", () => {
    it("deve permitir que o admin exclua a atitude", async() => {
      const res = await request(app)
        .delete(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Attitude deleted successfully.");
      expect(res.body.data).toBeNull();
      expect(await Attitude.findById(participacao._id)).toBeNull();
    });

    it("deve retornar 403 mesmo para a professora que cadastrou", async() => {
      const res = await request(app)
        .delete(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect(await Attitude.findById(participacao._id)).not.toBeNull();
    });

    it("deve retornar 403 quando quem exclui é um aluno", async() => {
      const res = await request(app)
        .delete(`/attitudes/${participacao._id}`)
        .set("Authorization", await como(aluno));

      expect(res.status).toBe(403);
    });

    it("deve retornar 404 quando a atitude não existir", async() => {
      const res = await request(app)
        .delete(`/attitudes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Attitude.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/attitudes/${participacao._id}`);

      expect(res.status).toBe(498);
    });
  });
});
