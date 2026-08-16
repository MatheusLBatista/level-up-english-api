import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import authRoutes from "../../routes/authRoutes.js";
import classRoutes from "../../routes/classRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Mission from "../../models/Mission.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de turmas", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let alunoA;
  let semTurma;
  let turmaA;
  let turmaB;
  let missaoA;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  beforeAll(async() => {
    await connectTestDatabase();

    // Custo baixo de propósito: é só a senha de seed, e o padrão (10) deixaria
    // a suíte lenta por reidratar os usuários a cada teste.
    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    // As rotas de auth entram junto porque é por elas que o teste pega o token.
    app.use(authRoutes);
    app.use(classRoutes);
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
    turmaB = await Class.create({ name: "Turma B", teacher: profB._id });

    alunoA = await criarUsuario({ name: "Aluno A", email: "alunoa@escola.com", class: turmaA._id });
    semTurma = await criarUsuario({ name: "Sem turma", email: "semturma@escola.com" });

    missaoA = await Mission.create({
      title: "Missão A",
      type: "vocabulary",
      class_id: turmaA._id,
      createdBy: profA._id,
    });

    await Class.findByIdAndUpdate(turmaA._id, { students: [alunoA._id], missions: [missaoA._id] });
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  /** Faz login e devolve o access token, que é o que a maioria dos testes precisa. */
  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  describe("GET /classes", () => {
    it("deve listar todas as turmas para o admin", async() => {
      const res = await request(app).get("/classes").set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve listar todas as turmas para a professora, não só as dela", async() => {
      const res = await request(app).get("/classes").set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve devolver ao aluno apenas a turma dele", async() => {
      const res = await request(app).get("/classes").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Turma A");
    });

    it("não deve deixar o aluno alcançar outra turma pela querystring", async() => {
      const res = await request(app)
        .get(`/classes?id=${turmaB._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Turma A");
    });

    it("deve devolver lista vazia para o aluno sem turma", async() => {
      const res = await request(app).get("/classes").set("Authorization", await como(semTurma));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toEqual([]);
      expect(res.body.data.totalDocs).toBe(0);
    });

    it("deve trazer a professora populada na listagem", async() => {
      const res = await request(app).get("/classes").set("Authorization", await como(admin));

      const turma = res.body.data.docs.find((doc) => doc.name === "Turma A");
      expect(turma.teacher.name).toBe("Professora A");
      expect(turma.teacher).not.toHaveProperty("password");
    });

    it("deve filtrar por professora", async() => {
      const res = await request(app)
        .get(`/classes?teacher=${profB._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Turma B");
    });

    it("deve filtrar por nome sem diferenciar maiúsculas", async() => {
      const res = await request(app)
        .get("/classes?name=turma a")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Turma A");
    });

    it("deve filtrar por situação da turma", async() => {
      await Class.findByIdAndUpdate(turmaB._id, { active: false });

      const res = await request(app)
        .get("/classes?active=false")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].name).toBe("Turma B");
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/classes?page=1&limit=1")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.hasNextPage).toBe(true);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/classes");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /classes/:id", () => {
    it("deve devolver a turma com professora, alunos e missões populados", async() => {
      const res = await request(app)
        .get(`/classes/${turmaA._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Turma A");
      expect(res.body.data.teacher.name).toBe("Professora A");
      expect(res.body.data.students[0].name).toBe("Aluno A");
      expect(res.body.data.missions[0].title).toBe("Missão A");
    });

    it("deve trazer da missão só o resumo, sem o gabarito", async() => {
      const res = await request(app)
        .get(`/classes/${turmaA._id}`)
        .set("Authorization", await como(alunoA));

      const missao = res.body.data.missions[0];
      expect(missao.type).toBe("vocabulary");
      expect(missao.active).toBe(true);
      expect(missao).not.toHaveProperty("questions");
    });

    it("não deve expor o e-mail dos alunos da turma", async() => {
      const res = await request(app)
        .get(`/classes/${turmaA._id}`)
        .set("Authorization", await como(admin));

      // A lista de alunos da turma não é lista de contatos.
      expect(res.body.data.students[0]).not.toHaveProperty("email");
    });

    it("deve permitir que o aluno consulte a própria turma", async() => {
      const res = await request(app)
        .get(`/classes/${turmaA._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Turma A");
    });

    it("deve retornar 403 quando o aluno consulta outra turma", async() => {
      const res = await request(app)
        .get(`/classes/${turmaB._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Students can only view their own class.");
    });

    it("deve retornar 403 quando o aluno sem turma consulta qualquer turma", async() => {
      const res = await request(app)
        .get(`/classes/${turmaA._id}`)
        .set("Authorization", await como(semTurma));

      expect(res.status).toBe(403);
    });

    it("deve permitir que a professora consulte turma de outra", async() => {
      const res = await request(app)
        .get(`/classes/${turmaB._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
    });

    it("deve retornar 404 quando a turma não existir", async() => {
      const res = await request(app)
        .get(`/classes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Class.");
    });
  });

  describe("POST /classes", () => {
    it("deve tornar a professora dona da turma que ela cria", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(profA))
        .send({ name: "Turma C" });

      expect(res.status).toBe(201);
      expect(res.body.data.teacher).toBe(String(profA._id));
    });

    it("não deve deixar a professora atribuir a turma a outra", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(profA))
        .send({ name: "Turma C", teacher: String(profB._id) });

      expect(res.status).toBe(201);
      expect(res.body.data.teacher).toBe(String(profA._id));
    });

    it("deve permitir que o admin escolha a professora da turma", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(admin))
        .send({ name: "Turma C", teacher: String(profB._id) });

      expect(res.status).toBe(201);
      expect(res.body.data.teacher).toBe(String(profB._id));
    });

    it("deve criar a turma ativa por padrão", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(admin))
        .send({ name: "Turma C" });

      expect(res.body.data.active).toBe(true);
      expect(res.body.data.students).toEqual([]);
    });

    it("deve retornar 400 quando já existir turma com o mesmo nome", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(admin))
        .send({ name: "Turma A" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Class já existe.");
    });

    it("deve barrar nome repetido mesmo com outra caixa", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(admin))
        .send({ name: "turma a" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Class já existe.");
    });

    it("deve retornar 400 quando o nome estiver vazio", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(admin))
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("name");
    });

    it("deve retornar 403 quando quem cria é um aluno", async() => {
      const res = await request(app)
        .post("/classes")
        .set("Authorization", await como(alunoA))
        .send({ name: "Turma C" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect(await Class.findOne({ name: "Turma C" })).toBeNull();
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/classes").send({ name: "Turma C" });

      expect(res.status).toBe(498);
    });
  });

  describe("PATCH /classes/:id", () => {
    it("deve permitir que a professora dona renomeie a turma", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Turma A Renomeada" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class updated successfully.");
      expect(res.body.data.name).toBe("Turma A Renomeada");
    });

    it("deve retornar 403 quando a professora altera turma de outra", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaB._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Invadida" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Teachers can only update their own classes.");

      const salva = await Class.findById(turmaB._id);
      expect(salva.name).toBe("Turma B");
    });

    it("não deve deixar a professora passar a turma para outra", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA))
        .send({ teacher: String(profB._id) });

      expect(res.status).toBe(200);

      const salva = await Class.findById(turmaA._id);
      expect(String(salva.teacher)).toBe(String(profA._id));
    });

    it("deve permitir que o admin troque a professora da turma", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(admin))
        .send({ teacher: String(profB._id) });

      expect(res.status).toBe(200);

      const salva = await Class.findById(turmaA._id);
      expect(String(salva.teacher)).toBe(String(profB._id));
    });

    it("deve permitir desativar a turma", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA))
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe(false);
    });

    it("deve aceitar reenviar o próprio nome da turma", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Turma A", active: false });

      // Sem o id excluído na conferência, a turma colidiria com ela mesma.
      expect(res.status).toBe(200);
    });

    it("deve retornar 400 quando o nome novo já for de outra turma", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA))
        .send({ name: "Turma B" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Class já existe.");
    });

    it("deve retornar 404 quando a turma não existir", async() => {
      const res = await request(app)
        .patch(`/classes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ name: "Fantasma" });

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem altera é um aluno", async() => {
      const res = await request(app)
        .patch(`/classes/${turmaA._id}`)
        .set("Authorization", await como(alunoA))
        .send({ name: "Turma do Aluno" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).patch(`/classes/${turmaA._id}`).send({ name: "Sem token" });

      expect(res.status).toBe(498);
    });
  });

  describe("DELETE /classes/:id", () => {
    it("deve permitir que o admin exclua a turma", async() => {
      const res = await request(app)
        .delete(`/classes/${turmaA._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Class deleted successfully.");
      expect(res.body.data).toBeNull();
      expect(await Class.findById(turmaA._id)).toBeNull();
    });

    it("deve retornar 403 mesmo para a professora dona da turma", async() => {
      const res = await request(app)
        .delete(`/classes/${turmaA._id}`)
        .set("Authorization", await como(profA));

      // Excluir turma é exclusivo do admin: apaga o histórico de todo mundo.
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect(await Class.findById(turmaA._id)).not.toBeNull();
    });

    it("deve retornar 403 quando quem exclui é um aluno", async() => {
      const res = await request(app)
        .delete(`/classes/${turmaA._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
    });

    it("deve retornar 404 quando a turma não existir", async() => {
      const res = await request(app)
        .delete(`/classes/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Class.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/classes/${turmaA._id}`);

      expect(res.status).toBe(498);
    });
  });

  describe("id malformado", () => {
    it("deve retornar 500 quando o id não for um ObjectId válido", async() => {
      const res = await request(app)
        .get("/classes/id-invalido")
        .set("Authorization", await como(admin));

      // Hoje o CastError do Mongoose escapa sem tratamento próprio; o teste
      // registra o comportamento atual para a mudança aparecer quando ocorrer.
      expect(res.status).toBe(500);
      expect(mongoose.Types.ObjectId.isValid("id-invalido")).toBe(false);
    });
  });
});
