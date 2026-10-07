import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

// O envio de e-mail é mockado para que nenhum teste dispare SMTP de verdade.
jest.mock("../../utils/SendMail.js", () => ({
  __esModule: true,
  default: {
    enviaEmail: jest.fn(),
    enviaEmailError: jest.fn(),
    enviaEmailErrorDbConect: jest.fn(),
  },
}));

import SendMail from "../../utils/SendMail.js";
import authRoutes from "../../routes/authRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de autenticação", () => {
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
    app.use(authRoutes);
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

  const login = async(email, password = SENHA_PADRAO) =>
    await request(app).post("/auth/login").send({ email, password });

  /** Faz login e devolve só os tokens, que é o que a maioria dos testes precisa. */
  const autenticar = async(email) => {
    const res = await login(email);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  describe("POST /auth/login", () => {
    it("deve autenticar com credenciais válidas e devolver os tokens", async() => {
      const res = await login(teacher.email);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Login realizado com sucesso.");
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
      expect(res.body.data.user.email).toBe(teacher.email);
    });

    it("não deve devolver a senha do usuário na resposta", async() => {
      const res = await login(teacher.email);

      expect(res.status).toBe(200);
      expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("deve persistir os tokens no usuário autenticado", async() => {
      const res = await login(teacher.email);

      const salvo = await User.findById(teacher._id).select("+accesstoken +refreshtoken");
      expect(salvo.accesstoken).toBe(res.body.data.accessToken);
      expect(salvo.refreshtoken).toBe(res.body.data.refreshToken);
    });

    it("deve retornar 401 quando a senha estiver incorreta", async() => {
      const res = await login(teacher.email, "senhaErrada");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Credenciais inválidas. Verifique seu usuário e senha.");
    });

    it("deve retornar 401 quando o e-mail não estiver cadastrado", async() => {
      const res = await login("naoexiste@escola.com");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Credenciais inválidas. Verifique seu usuário e senha.");
    });

    it("deve retornar 401 quando a conta estiver desativada", async() => {
      const inativo = await criarUsuario({ name: "Inativo", email: "inativo@escola.com", active: false });

      const res = await login(inativo.email);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Conta bloqueada. Entre em contato com o suporte.");
    });

    it("deve retornar 400 quando o e-mail for inválido", async() => {
      const res = await request(app).post("/auth/login").send({ email: "sem-arroba", password: SENHA_PADRAO });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("email");
    });

    it("deve retornar 400 quando o corpo estiver vazio", async() => {
      const res = await request(app).post("/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(2);
    });
  });

  describe("POST /auth/refresh", () => {
    it("deve renovar os tokens com um refresh token válido", async() => {
      const { refreshToken } = await autenticar(teacher.email);

      const res = await request(app).post("/auth/refresh").send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Token renovado com sucesso.");
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
    });

    it("deve substituir o refresh token armazenado ao renovar", async() => {
      const { refreshToken } = await autenticar(teacher.email);

      const res = await request(app).post("/auth/refresh").send({ refreshToken });

      const salvo = await User.findById(teacher._id).select("+refreshtoken");
      expect(salvo.refreshtoken).toBe(res.body.data.refreshToken);
    });

    it("deve retornar 401 quando o refresh token for inválido", async() => {
      const res = await request(app).post("/auth/refresh").send({ refreshToken: "token-invalido" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Token inválido. Faça login novamente.");
    });

    it("deve retornar 401 quando o token não for mais o armazenado", async() => {
      const { refreshToken } = await autenticar(teacher.email);
      await User.findByIdAndUpdate(teacher._id, { refreshtoken: null });

      const res = await request(app).post("/auth/refresh").send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Token inválido. Faça login novamente.");
    });

    it("deve retornar 400 quando o refresh token não for enviado", async() => {
      const res = await request(app).post("/auth/refresh").send({});

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("refreshToken");
    });
  });

  describe("POST /auth/logout", () => {
    it("deve deslogar e limpar os tokens do usuário", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logout realizado com sucesso.");

      const salvo = await User.findById(teacher._id).select("+accesstoken +refreshtoken");
      expect(salvo.accesstoken).toBeNull();
      expect(salvo.refreshtoken).toBeNull();
    });

    it("deve invalidar o access token usado antes do logout", async() => {
      const { accessToken } = await autenticar(teacher.email);
      await request(app).post("/auth/logout").set("Authorization", `Bearer ${accessToken}`);

      const res = await request(app).post("/auth/logout").set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Refresh token inválido, autentique novamente!");
    });

    it("deve retornar 498 quando o token não for enviado", async() => {
      const res = await request(app).post("/auth/logout");

      expect(res.status).toBe(498);
      expect(res.body.message).toBe("O token de autenticação não existe!");
    });

    it("deve retornar 498 quando o formato do cabeçalho for inválido", async() => {
      const res = await request(app).post("/auth/logout").set("Authorization", "token-solto");

      expect(res.status).toBe(498);
      expect(res.body.message).toBe("Formato do token de autenticação inválido!");
    });

    it("deve retornar 498 quando o token for malformado", async() => {
      const res = await request(app).post("/auth/logout").set("Authorization", "Bearer token-invalido");

      expect(res.status).toBe(498);
      expect(res.body.message).toBe("Token JWT inválido!");
    });
  });

  describe("PATCH /auth/change-password", () => {
    it("deve alterar a senha do usuário autenticado", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .patch("/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ currentPassword: SENHA_PADRAO, newPassword: "novaSenha456" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Senha alterada com sucesso.");
    });

    it("deve permitir login com a nova senha e recusar a antiga", async() => {
      const { accessToken } = await autenticar(teacher.email);
      await request(app)
        .patch("/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ currentPassword: SENHA_PADRAO, newPassword: "novaSenha456" });

      const comNova = await login(teacher.email, "novaSenha456");
      const comAntiga = await login(teacher.email, SENHA_PADRAO);

      expect(comNova.status).toBe(200);
      expect(comAntiga.status).toBe(401);
    });

    it("deve retornar 401 quando a senha atual estiver incorreta", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .patch("/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ currentPassword: "senhaErrada", newPassword: "novaSenha456" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Senha atual incorreta.");
    });

    it("deve retornar 400 quando a nova senha for curta demais", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .patch("/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ currentPassword: SENHA_PADRAO, newPassword: "123" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("newPassword");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .patch("/auth/change-password")
        .send({ currentPassword: SENHA_PADRAO, newPassword: "novaSenha456" });

      expect(res.status).toBe(498);
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("deve gerar o código de recuperação e enviar o e-mail", async() => {
      const res = await request(app).post("/auth/forgot-password").send({ email: student.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("As instruções foram enviadas por e-mail.");
      expect(SendMail.enviaEmail).toHaveBeenCalledTimes(1);
      expect(SendMail.enviaEmail).toHaveBeenCalledWith(expect.objectContaining({ to: student.email }));

      const salvo = await User.findById(student._id).select("+password_recovery_code +exp_password_recovery_code");
      expect(salvo.password_recovery_code).toEqual(expect.any(String));
      expect(salvo.exp_password_recovery_code.getTime()).toBeGreaterThan(Date.now());
    });

    it("deve responder 200 sem enviar e-mail quando o e-mail não existir", async() => {
      const res = await request(app).post("/auth/forgot-password").send({ email: "naoexiste@escola.com" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("As instruções foram enviadas por e-mail.");
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o e-mail for inválido", async() => {
      const res = await request(app).post("/auth/forgot-password").send({ email: "sem-arroba" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("email");
    });
  });

  describe("POST /auth/reset-password", () => {
    /** Dispara o forgot-password e devolve o código gravado no banco. */
    const solicitarCodigo = async(email) => {
      await request(app).post("/auth/forgot-password").send({ email });
      const salvo = await User.findOne({ email }).select("+password_recovery_code");
      return salvo.password_recovery_code;
    };

    it("deve redefinir a senha com um código válido", async() => {
      const code = await solicitarCodigo(student.email);

      const res = await request(app).post("/auth/reset-password").send({ code, newPassword: "novaSenha456" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Senha redefinida com sucesso.");

      const comNova = await login(student.email, "novaSenha456");
      expect(comNova.status).toBe(200);
    });

    it("deve limpar o código após o uso", async() => {
      const code = await solicitarCodigo(student.email);
      await request(app).post("/auth/reset-password").send({ code, newPassword: "novaSenha456" });

      const reuso = await request(app).post("/auth/reset-password").send({ code, newPassword: "outraSenha789" });

      expect(reuso.status).toBe(400);
      expect(reuso.body.message).toBe("Código de recuperação inválido ou expirado.");
    });

    it("deve retornar 400 quando o código não existir", async() => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ code: "codigo-inexistente", newPassword: "novaSenha456" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Código de recuperação inválido ou expirado.");
    });

    it("deve retornar 400 quando o código estiver expirado", async() => {
      const code = await solicitarCodigo(student.email);
      await User.findByIdAndUpdate(student._id, { exp_password_recovery_code: new Date(Date.now() - 1000) });

      const res = await request(app).post("/auth/reset-password").send({ code, newPassword: "novaSenha456" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Código de recuperação inválido ou expirado.");
    });

    it("deve retornar 400 quando a nova senha for curta demais", async() => {
      const code = await solicitarCodigo(student.email);

      const res = await request(app).post("/auth/reset-password").send({ code, newPassword: "123" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("newPassword");
    });
  });

  describe("POST /auth/register-student", () => {
    const novoAluno = { name: "Maria Silva", email: "maria@escola.com" };

    const cadastrarAluno = async(quem, corpo) => {
      const { accessToken } = await autenticar(quem.email);

      return await request(app)
        .post("/auth/register-student")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(corpo);
    };

    it("deve permitir que a professora cadastre um aluno na turma dela", async() => {
      const turma = await Class.create({ name: "Turma A", teacher: teacher._id });

      const res = await cadastrarAluno(teacher, { ...novoAluno, class: String(turma._id) });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe(novoAluno.email);
      expect(res.body.data.role).toBe("student");
      expect(res.body.data.class).toBe(String(turma._id));
      expect(res.body.data).not.toHaveProperty("password");

      const atualizada = await Class.findById(turma._id);
      expect(atualizada.students.map(String)).toEqual([res.body.data._id]);
    });

    it("deve permitir que o admin cadastre um aluno sem turma", async() => {
      const res = await cadastrarAluno(admin, novoAluno);

      expect(res.status).toBe(201);
      expect(res.body.data.class).toBeUndefined();
    });

    it("deve permitir que o admin cadastre um aluno em turma de qualquer professor", async() => {
      const turma = await Class.create({ name: "Turma A", teacher: teacher._id });

      const res = await cadastrarAluno(admin, { ...novoAluno, class: String(turma._id) });

      expect(res.status).toBe(201);
    });

    it("deve retornar 400 sem enviar e-mail quando a professora não informar a turma", async() => {
      const res = await cadastrarAluno(teacher, novoAluno);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "class", message: "Escolha uma das suas turmas." }]);
      expect(await User.findOne({ email: novoAluno.email })).toBeNull();
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });

    it.each([
      ["de outro professor", async() => {
        const outro = await criarUsuario({ name: "Outro", email: "outro@escola.com", role: "teacher" });
        return String((await Class.create({ name: "Turma B", teacher: outro._id }))._id);
      }],
      ["sem professor", async() => String((await Class.create({ name: "Turma C" }))._id)],
      ["inexistente", () => new mongoose.Types.ObjectId().toString()],
      ["inativa", async() =>
        String((await Class.create({ name: "Turma Antiga", teacher: teacher._id, active: false }))._id)],
    ])("deve retornar 403 sem criar o aluno nem enviar e-mail quando a professora usar turma %s", async(_, criarTurma) => {
      const res = await cadastrarAluno(teacher, { ...novoAluno, class: await criarTurma() });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode cadastrar alunos nas suas turmas.");
      expect(await User.findOne({ email: novoAluno.email })).toBeNull();
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });

    it.each([
      ["inexistente", () => new mongoose.Types.ObjectId().toString()],
      ["inativa", async() => String((await Class.create({ name: "Turma Antiga", active: false }))._id)],
    ])("deve retornar 400 sem criar o aluno quando o admin usar turma %s", async(_, criarTurma) => {
      const res = await cadastrarAluno(admin, { ...novoAluno, class: await criarTurma() });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "class", message: "Turma não encontrada ou inativa." }]);
      expect(await User.findOne({ email: novoAluno.email })).toBeNull();
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });

    it("deve enviar o e-mail de boas-vindas com código de definição de senha", async() => {
      await cadastrarAluno(admin, novoAluno);

      expect(SendMail.enviaEmail).toHaveBeenCalledWith(expect.objectContaining({ to: novoAluno.email }));

      const criado = await User.findOne({ email: novoAluno.email }).select("+password_recovery_code");
      expect(criado.password_recovery_code).toEqual(expect.any(String));
    });

    it("deve retornar 403 quando quem cadastra é um aluno", async() => {
      const { accessToken } = await autenticar(student.email);

      const res = await request(app)
        .post("/auth/register-student")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(novoAluno);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 400 quando o e-mail já estiver cadastrado", async() => {
      const res = await cadastrarAluno(admin, { ...novoAluno, email: student.email });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Este e-mail já está cadastrado.");
    });

    it("deve retornar 400 quando os dados forem inválidos", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .post("/auth/register-student")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: "M", email: "sem-arroba" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(2);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/auth/register-student").send(novoAluno);

      expect(res.status).toBe(498);
    });
  });

  describe("POST /auth/register-teacher", () => {
    const novoProfessor = { name: "Ana Souza", email: "ana@escola.com" };

    const cadastrar = async(quem, corpo) => {
      const { accessToken } = await autenticar(quem.email);

      return await request(app)
        .post("/auth/register-teacher")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(corpo);
    };

    it("deve criar o professor sem senha, com código de definição e e-mail enviado", async() => {
      const res = await cadastrar(admin, novoProfessor);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe(
        "Professor cadastrado com sucesso. E-mail de boas-vindas enviado no email cadastrado.",
      );
      expect(res.body.data.role).toBe("teacher");
      expect(res.body.data).not.toHaveProperty("password");

      const criado = await User.findOne({ email: novoProfessor.email })
        .select("+password +password_recovery_code");
      expect(criado.password).toBeUndefined();
      expect(criado.password_recovery_code).toEqual(expect.any(String));

      const [email] = SendMail.enviaEmail.mock.calls[0];
      expect(email.to).toBe(novoProfessor.email);
      expect(email.html).toContain(`/set-password?code=${criado.password_recovery_code}`);
    });

    it("deve atribuir as turmas ao professor, substituindo o anterior", async() => {
      const turmaComDono = await Class.create({ name: "Turma A", teacher: teacher._id });
      const turmaSemDono = await Class.create({ name: "Turma B" });

      const res = await cadastrar(admin, {
        ...novoProfessor,
        classes: [String(turmaComDono._id), String(turmaSemDono._id)],
      });

      expect(res.status).toBe(201);
      expect(String((await Class.findById(turmaComDono._id)).teacher)).toBe(res.body.data._id);
      expect(String((await Class.findById(turmaSemDono._id)).teacher)).toBe(res.body.data._id);
    });

    it.each([
      ["inexistente", () => new mongoose.Types.ObjectId().toString()],
      ["inativa", async() => String((await Class.create({ name: "Turma Antiga", active: false }))._id)],
    ])("deve retornar 400 sem criar o professor quando uma turma for %s", async(_, criarTurma) => {
      const valida = await Class.create({ name: "Turma A", teacher: teacher._id });

      const res = await cadastrar(admin, {
        ...novoProfessor,
        classes: [String(valida._id), await criarTurma()],
      });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "classes", message: "Turma não encontrada ou inativa." }]);
      expect(await User.findOne({ email: novoProfessor.email })).toBeNull();
      expect(String((await Class.findById(valida._id)).teacher)).toBe(String(teacher._id));
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });

    it("deve retornar 400 quando o e-mail já estiver cadastrado", async() => {
      const res = await cadastrar(admin, { ...novoProfessor, email: student.email });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "email", message: "Este e-mail já está cadastrado." }]);
    });

    it.each([
      ["a professora", () => teacher],
      ["o aluno", () => student],
    ])("deve retornar 403 quando quem cadastra é %s", async(_, quem) => {
      const res = await cadastrar(quem(), novoProfessor);

      expect(res.status).toBe(403);
      expect(await User.findOne({ email: novoProfessor.email })).toBeNull();
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/auth/register-teacher").send(novoProfessor);

      expect(res.status).toBe(498);
    });
  });

  describe("POST /auth/revoke/:userId", () => {
    it("deve permitir que o admin revogue a sessão de outro usuário", async() => {
      const { accessToken } = await autenticar(admin.email);
      await autenticar(student.email);

      const res = await request(app)
        .post(`/auth/revoke/${student._id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Sessão do usuário revogada com sucesso.");

      const alvo = await User.findById(student._id).select("+accesstoken +refreshtoken");
      expect(alvo.accesstoken).toBeNull();
      expect(alvo.refreshtoken).toBeNull();
    });

    it("deve invalidar o token do usuário revogado", async() => {
      const { accessToken } = await autenticar(admin.email);
      const sessaoAluno = await autenticar(student.email);

      await request(app).post(`/auth/revoke/${student._id}`).set("Authorization", `Bearer ${accessToken}`);

      const res = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${sessaoAluno.accessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Refresh token inválido, autentique novamente!");
    });

    it("deve retornar 403 quando quem revoga é uma professora", async() => {
      const { accessToken } = await autenticar(teacher.email);

      const res = await request(app)
        .post(`/auth/revoke/${student._id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 404 quando o usuário alvo não existir", async() => {
      const { accessToken } = await autenticar(admin.email);

      const res = await request(app)
        .post(`/auth/revoke/${ID_INEXISTENTE}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em User.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post(`/auth/revoke/${student._id}`);

      expect(res.status).toBe(498);
    });
  });
});
