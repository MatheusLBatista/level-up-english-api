import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import notificationRoutes from "../../routes/notificationRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de notificações", () => {
  let app;
  let senhaHash;
  let alunoA;
  let alunoB;
  let antiga;
  let recente;
  let lida;
  let doOutro;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(notificationRoutes);
    app.use(errorHandler);
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  beforeEach(async() => {
    jest.clearAllMocks();
    await clearTestDatabase();

    alunoA = await criarUsuario({ name: "Aluno A", email: "alunoa@escola.com" });
    alunoB = await criarUsuario({ name: "Aluno B", email: "alunob@escola.com" });

    antiga = await criarNotificacao(alunoA, { message: "Antiga", createdAt: new Date("2026-10-01T10:00:00Z") });
    lida = await criarNotificacao(alunoA, {
      message: "Lida",
      read: true,
      createdAt: new Date("2026-10-02T10:00:00Z"),
    });
    recente = await criarNotificacao(alunoA, { message: "Recente", createdAt: new Date("2026-10-03T10:00:00Z") });
    doOutro = await criarNotificacao(alunoB, { message: "Do aluno B" });
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const criarNotificacao = async(usuario, dados = {}) =>
    await Notification.create({ user: usuario._id, type: "attitude", data: { xp: 10 }, ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  describe("GET /notifications", () => {
    it("deve devolver só as notificações do usuário logado, da mais recente para a mais antiga", async() => {
      const res = await request(app).get("/notifications").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs.map((n) => n.message)).toEqual(["Recente", "Lida", "Antiga"]);
      expect(res.body.data.totalDocs).toBe(3);
    });

    it("deve paginar com page e limit", async() => {
      const res = await request(app).get("/notifications?page=2&limit=2").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs.map((n) => n.message)).toEqual(["Antiga"]);
      expect(res.body.data.totalPages).toBe(2);
    });

    it("deve recusar sem token", async() => {
      const res = await request(app).get("/notifications");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("deve contar só as não lidas do usuário logado", async() => {
      const res = await request(app).get("/notifications/unread-count").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ unread: 2 });
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("deve marcar a notificação do usuário como lida", async() => {
      const res = await request(app)
        .patch(`/notifications/${recente._id}/read`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.read).toBe(true);
      expect((await Notification.findById(recente._id)).read).toBe(true);
    });

    it("deve devolver 200 ao marcar de novo uma já lida", async() => {
      const res = await request(app)
        .patch(`/notifications/${lida._id}/read`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.read).toBe(true);
    });

    it("deve devolver 404 e não mexer na notificação de outro usuário", async() => {
      const res = await request(app)
        .patch(`/notifications/${doOutro._id}/read`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(404);
      expect((await Notification.findById(doOutro._id)).read).toBe(false);
    });

    it("deve devolver 404 para id inexistente", async() => {
      const res = await request(app)
        .patch(`/notifications/${ID_INEXISTENTE}/read`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(404);
    });

    it("deve devolver 404 para id malformado", async() => {
      const res = await request(app).patch("/notifications/abc/read").set("Authorization", await como(alunoA));

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /notifications/read-all", () => {
    it("deve marcar todas as não lidas do usuário e não mexer nas dos outros", async() => {
      const res = await request(app).patch("/notifications/read-all").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ updated: 2 });
      expect(await Notification.countDocuments({ user: alunoA._id, read: false })).toBe(0);
      expect((await Notification.findById(doOutro._id)).read).toBe(false);
      expect((await Notification.findById(antiga._id)).read).toBe(true);
    });
  });
});
