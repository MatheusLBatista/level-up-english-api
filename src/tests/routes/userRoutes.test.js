import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import authRoutes from "../../routes/authRoutes.js";
import userRoutes from "../../routes/userRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de usuários", () => {
  let app;
  let senhaHash;
  let admin;
  let teacher;
  let student;

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
    teacher = await criarUsuario({ name: "Professora", email: "professora@escola.com", role: "teacher" });
    student = await criarUsuario({ name: "Aluno", email: "aluno@escola.com", role: "student" });
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

  describe("GET /users", () => {
    it("deve listar os usuários para o admin", async() => {
      const res = await request(app).get("/users").set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(3);
      expect(res.body.data.totalDocs).toBe(3);
    });

    it("deve listar os usuários para a professora", async() => {
      const res = await request(app).get("/users").set("Authorization", await como(teacher));

      expect(res.status).toBe(200);
    });

    it("não deve devolver a senha de ninguém na listagem", async() => {
      const res = await request(app).get("/users").set("Authorization", await como(admin));

      res.body.data.docs.forEach((usuario) => expect(usuario).not.toHaveProperty("password"));
    });

    it("deve filtrar por papel", async() => {
      const res = await request(app)
        .get("/users?role=student")
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].email).toBe(student.email);
    });

    it("deve filtrar por nome sem diferenciar maiúsculas", async() => {
      const res = await request(app)
        .get("/users?name=profess")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].email).toBe(teacher.email);
    });

    it("deve filtrar por situação da conta", async() => {
      await criarUsuario({ name: "Inativo", email: "inativo@escola.com", active: false });

      const res = await request(app)
        .get("/users?active=false")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].email).toBe("inativo@escola.com");
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/users?page=1&limit=2")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(2);
      expect(res.body.data.totalPages).toBe(2);
      expect(res.body.data.hasNextPage).toBe(true);
    });

    it("deve retornar 403 quando quem lista é um aluno", async() => {
      const res = await request(app).get("/users").set("Authorization", await como(student));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 403 quando a conta estiver desativada", async() => {
      const autorizacao = await como(teacher);
      await User.findByIdAndUpdate(teacher._id, { active: false });

      const res = await request(app).get("/users").set("Authorization", autorizacao);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Conta bloqueada. Entre em contato com o suporte.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/users");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /users/:id", () => {
    it("deve permitir que o aluno consulte o próprio perfil", async() => {
      const res = await request(app)
        .get(`/users/${student._id}`)
        .set("Authorization", await como(student));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(student.email);
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("deve retornar 403 quando o aluno consulta o perfil de outro", async() => {
      const res = await request(app)
        .get(`/users/${teacher._id}`)
        .set("Authorization", await como(student));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Students can only view their own profile.");
    });

    it("deve permitir que a professora consulte o perfil de um aluno", async() => {
      const res = await request(app)
        .get(`/users/${student._id}`)
        .set("Authorization", await como(teacher));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(student.email);
    });

    it("deve devolver o progresso de nível do usuário", async() => {
      await User.findByIdAndUpdate(student._id, { xp: 500, level: 3 });

      const res = await request(app)
        .get(`/users/${student._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.progress).toEqual({
        current_level_xp: 400,
        next_level_xp: 900,
        xp_to_next_level: 400,
        percentage: 20,
      });
    });

    it("deve retornar 404 quando o usuário não existir", async() => {
      const res = await request(app)
        .get(`/users/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em User.");
    });
  });

  describe("POST /users", () => {
    const novoUsuario = { name: "Maria Silva", email: "maria@escola.com", password: "senha123" };

    it("deve permitir que a professora cadastre um aluno", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(teacher))
        .send(novoUsuario);

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(novoUsuario.email);
      expect(res.body.data.role).toBe("student");
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("deve gravar a senha com hash bcrypt", async() => {
      await request(app)
        .post("/users")
        .set("Authorization", await como(teacher))
        .send(novoUsuario);

      const criado = await User.findOne({ email: novoUsuario.email }).select("+password");
      expect(criado.password).not.toBe(novoUsuario.password);
      expect(await bcrypt.compare(novoUsuario.password, criado.password)).toBe(true);
    });

    it("deve retornar 403 quando a professora tenta criar um admin", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(teacher))
        .send({ ...novoUsuario, role: "admin" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only admins can create users with a role other than student.");
      expect(await User.findOne({ email: novoUsuario.email })).toBeNull();
    });

    it("deve permitir que o admin crie uma professora", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(admin))
        .send({ ...novoUsuario, role: "teacher" });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe("teacher");
    });

    it("deve vincular o usuário à turma informada", async() => {
      const classId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(admin))
        .send({ ...novoUsuario, class: classId });

      expect(res.status).toBe(201);
      expect(res.body.data.class).toBe(classId);
    });

    it("deve retornar 400 quando o e-mail já estiver cadastrado", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(teacher))
        .send({ ...novoUsuario, email: student.email });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email already registered.");
    });

    it("deve retornar 400 quando a senha for curta demais", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(teacher))
        .send({ ...novoUsuario, password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("password");
    });

    it("deve retornar 403 quando quem cadastra é um aluno", async() => {
      const res = await request(app)
        .post("/users")
        .set("Authorization", await como(student))
        .send(novoUsuario);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/users").send(novoUsuario);

      expect(res.status).toBe(498);
    });
  });

  describe("PATCH /users/:id", () => {
    it("deve permitir que o aluno altere o próprio nome", async() => {
      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(student))
        .send({ name: "Aluno Renomeado" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User updated successfully.");
      expect(res.body.data.name).toBe("Aluno Renomeado");
    });

    it("deve ignorar a tentativa de escalada de privilégio no próprio perfil", async() => {
      const turma = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(student))
        .send({ name: "Aluno Esperto", role: "admin", xp: 99999, class: turma, active: false });

      expect(res.status).toBe(200);

      const salvo = await User.findById(student._id);
      expect(salvo.name).toBe("Aluno Esperto");
      expect(salvo.role).toBe("student");
      expect(salvo.xp).toBe(0);
      expect(salvo.class).toBeUndefined();
      expect(salvo.active).toBe(true);
    });

    it("deve retornar 403 quando o aluno altera o perfil de outro", async() => {
      const res = await request(app)
        .patch(`/users/${teacher._id}`)
        .set("Authorization", await como(student))
        .send({ name: "Invadido" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You do not have permission to update another user.");
    });

    it("deve retornar 403 quando a professora altera o perfil de um aluno", async() => {
      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(teacher))
        .send({ name: "Alterado pela professora" });

      expect(res.status).toBe(403);
    });

    it("deve permitir que o admin altere os campos privilegiados de outro usuário", async() => {
      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(admin))
        .send({ active: false });

      expect(res.status).toBe(200);

      const salvo = await User.findById(student._id);
      expect(salvo.active).toBe(false);
    });

    it("não deve devolver e-mail nem senha na resposta", async() => {
      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(student))
        .send({ name: "Aluno Renomeado" });

      expect(res.body.data).not.toHaveProperty("email");
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("deve retornar 404 quando o usuário não existir", async() => {
      const res = await request(app)
        .patch(`/users/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ name: "Fantasma" });

      expect(res.status).toBe(404);
    });

    it("deve retornar 400 quando o corpo for inválido", async() => {
      const res = await request(app)
        .patch(`/users/${student._id}`)
        .set("Authorization", await como(student))
        .send({ active: "sim" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("active");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).patch(`/users/${student._id}`).send({ name: "Sem token" });

      expect(res.status).toBe(498);
    });
  });

  describe("DELETE /users/:id", () => {
    it("deve permitir que o aluno apague a própria conta", async() => {
      const res = await request(app)
        .delete(`/users/${student._id}`)
        .set("Authorization", await como(student));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User deleted successfully.");
      expect(await User.findById(student._id)).toBeNull();
    });

    it("deve retornar 403 quando o aluno apaga a conta de outro", async() => {
      const outro = await criarUsuario({ name: "Outro", email: "outro@escola.com" });

      const res = await request(app)
        .delete(`/users/${outro._id}`)
        .set("Authorization", await como(student));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Students can only delete their own account.");
      expect(await User.findById(outro._id)).not.toBeNull();
    });

    it("deve permitir que a professora apague a conta de um aluno", async() => {
      const res = await request(app)
        .delete(`/users/${student._id}`)
        .set("Authorization", await como(teacher));

      expect(res.status).toBe(200);
      expect(await User.findById(student._id)).toBeNull();
    });

    it("deve retornar 403 quando a professora apaga uma conta privilegiada", async() => {
      const res = await request(app)
        .delete(`/users/${admin._id}`)
        .set("Authorization", await como(teacher));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Teachers can only delete student accounts.");
      expect(await User.findById(admin._id)).not.toBeNull();
    });

    it("deve permitir que o admin apague qualquer conta", async() => {
      const res = await request(app)
        .delete(`/users/${teacher._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(await User.findById(teacher._id)).toBeNull();
    });

    it("deve retornar 404 quando o usuário não existir", async() => {
      const res = await request(app)
        .delete(`/users/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/users/${student._id}`);

      expect(res.status).toBe(498);
    });
  });

  describe("POST /users/recalculate-levels", () => {
    it("deve recalcular o nível a partir do XP de cada usuário", async() => {
      await User.findByIdAndUpdate(student._id, { xp: 500, level: 1 });

      const res = await request(app)
        .post("/users/recalculate-levels")
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Levels recalculated successfully.");

      // 500 XP cai na faixa do nível 3 (400 a 900).
      const salvo = await User.findById(student._id);
      expect(salvo.level).toBe(3);
    });

    it("deve informar quantos usuários mudaram de nível", async() => {
      await User.findByIdAndUpdate(student._id, { xp: 500, level: 1 });

      const res = await request(app)
        .post("/users/recalculate-levels")
        .set("Authorization", await como(admin));

      expect(res.body.data.updated).toBe(1);
    });

    it("deve retornar 403 quando quem recalcula é uma professora", async() => {
      const res = await request(app)
        .post("/users/recalculate-levels")
        .set("Authorization", await como(teacher));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/users/recalculate-levels");

      expect(res.status).toBe(498);
    });
  });
});
