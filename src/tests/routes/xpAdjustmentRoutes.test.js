import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import xpAdjustmentRoutes from "../../routes/xpAdjustmentRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import XpAdjustment from "../../models/XpAdjustment.js";
import Ranking from "../../models/Ranking.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de ajuste manual de XP", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let alunoA;
  let alunoB;
  let semTurma;
  let turmaA;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(xpAdjustmentRoutes);
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
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const ajustar = async(autor, { student = alunoA, amount = 50, reason } = {}) =>
    await request(app)
      .post("/xp-adjustments")
      .set("Authorization", await como(autor))
      .send({ student: String(student._id), amount, reason });

  const definirXp = async(usuario, xp, level) =>
    await User.findByIdAndUpdate(usuario._id, { xp, level });

  const xpDe = async(usuario) => (await User.findById(usuario._id)).xp;

  describe("POST /xp-adjustments", () => {
    it("deve adicionar XP ao aluno", async() => {
      const res = await ajustar(profA, { amount: 50 });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(50);
      expect(res.body.data.xp_applied).toBe(50);
      expect(await xpDe(alunoA)).toBe(50);
    });

    it("deve remover XP do aluno", async() => {
      await definirXp(alunoA, 80, 1);

      const res = await ajustar(profA, { amount: -30 });

      expect(res.status).toBe(201);
      expect(res.body.data.xp_applied).toBe(-30);
      expect(await xpDe(alunoA)).toBe(50);
    });

    it("deve parar em 0 quando a remoção passa do saldo", async() => {
      await definirXp(alunoA, 30, 1);

      const res = await ajustar(profA, { amount: -50 });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(-50);
      expect(res.body.data.xp_applied).toBe(-30);
      expect(res.body.data.progression.xp).toBe(0);
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("não deve deixar o XP negativo com remoções simultâneas", async() => {
      await definirXp(alunoA, 30, 1);
      const token = await como(profA);
      const remover = () =>
        request(app)
          .post("/xp-adjustments")
          .set("Authorization", token)
          .send({ student: String(alunoA._id), amount: -20 });

      const respostas = await Promise.all([remover(), remover()]);

      const aplicado = respostas.reduce((total, res) => total + res.body.data.xp_applied, 0);
      expect(aplicado).toBe(-30);
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve subir o nível do aluno quando o XP cruzar a faixa", async() => {
      await definirXp(alunoA, 380, 2);

      const res = await ajustar(profA, { amount: 50 });

      expect(res.body.data.progression).toMatchObject({
        previous_level: 2,
        level: 3,
        leveled_up: true,
        leveled_down: false,
      });
      expect((await User.findById(alunoA._id)).level).toBe(3);
    });

    it("deve descer o nível do aluno quando a remoção o tira da faixa", async() => {
      await definirXp(alunoA, 430, 3);

      const res = await ajustar(profA, { amount: -500 });

      expect(res.body.data.progression).toMatchObject({
        previous_level: 3,
        level: 1,
        leveled_up: false,
        leveled_down: true,
      });
      expect((await User.findById(alunoA._id)).level).toBe(1);
    });

    it("deve devolver a progressão completa junto com o ajuste", async() => {
      const res = await ajustar(profA, { amount: 50 });

      expect(res.body.data.progression).toEqual({
        student: String(alunoA._id),
        previous_level: 1,
        leveled_up: false,
        leveled_down: false,
        xp: 50,
        level: 1,
        current_level_xp: 0,
        next_level_xp: 100,
        xp_to_next_level: 50,
        percentage: 50,
      });
    });

    it("deve gravar o histórico com quem ajustou, o pedido, o aplicado e o motivo", async() => {
      await definirXp(alunoA, 30, 1);

      const res = await ajustar(profA, { amount: -50, reason: "  Saldo corrigido  " });

      const ajuste = await XpAdjustment.findById(res.body.data._id);
      expect(String(ajuste.teacher)).toBe(String(profA._id));
      expect(String(ajuste.student)).toBe(String(alunoA._id));
      expect(ajuste.amount).toBe(-50);
      expect(ajuste.xp_applied).toBe(-30);
      expect(ajuste.reason).toBe("Saldo corrigido");
      expect(ajuste.applied_at).toBeInstanceOf(Date);
      expect(ajuste.createdAt).toBeInstanceOf(Date);
    });

    it("deve aceitar o ajuste sem motivo", async() => {
      const res = await ajustar(profA);

      expect(res.status).toBe(201);
      expect(res.body.data.reason).toBeUndefined();
    });

    it("deve atualizar o ranking global e o da turma", async() => {
      await ajustar(profA, { amount: 50 });

      const global = await Ranking.findOne({ type: "global" });
      const daTurma = await Ranking.findOne({ type: "class", class: turmaA._id });
      const noGlobal = global.entries.find((item) => String(item.user) === String(alunoA._id));
      const naTurma = daTurma.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(noGlobal.xp).toBe(50);
      expect(naTurma.xp).toBe(50);
    });

    it("deve retornar 403 quando o aluno não for de uma turma da professora", async() => {
      const res = await ajustar(profA, { student: alunoB });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode ajustar o XP de alunos das suas turmas.");
      expect(await xpDe(alunoB)).toBe(0);
      expect(await XpAdjustment.countDocuments()).toBe(0);
    });

    it("deve retornar 403 quando o aluno não estiver em turma nenhuma", async() => {
      const res = await ajustar(profA, { student: semTurma });

      expect(res.status).toBe(403);
    });

    it("deve permitir que o admin ajuste qualquer aluno", async() => {
      const res = await ajustar(admin, { student: semTurma, amount: 20 });

      expect(res.status).toBe(201);
      expect(await xpDe(semTurma)).toBe(20);
    });

    it("deve retornar 400 com amount igual a 0", async() => {
      const res = await ajustar(profA, { amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([{ path: "amount", message: "A quantidade não pode ser zero." }]);
      expect(await XpAdjustment.countDocuments()).toBe(0);
    });

    it("deve retornar 400 com amount fora de ±10000", async() => {
      const res = await ajustar(profA, { amount: 10001 });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("amount");
    });

    it("deve retornar 400 com motivo acima de 200 caracteres", async() => {
      const res = await ajustar(profA, { reason: "x".repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("reason");
    });

    it("deve retornar 400 quando o alvo não for um aluno", async() => {
      const res = await ajustar(admin, { student: profB });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O usuário informado não é um aluno.");
      expect(await xpDe(profB)).toBe(0);
    });

    it("deve retornar 404 quando o aluno não existir", async() => {
      const res = await ajustar(profA, { student: { _id: ID_INEXISTENTE } });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em User.");
    });

    it("deve retornar 403 quando quem ajusta é um aluno", async() => {
      const res = await ajustar(alunoA);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .post("/xp-adjustments")
        .send({ student: String(alunoA._id), amount: 50 });

      expect(res.status).toBe(498);
    });
  });
});
