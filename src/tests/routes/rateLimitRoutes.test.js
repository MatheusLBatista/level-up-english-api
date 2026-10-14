import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

jest.mock("../../utils/SendMail.js", () => ({
  __esModule: true,
  default: {
    enviaEmail: jest.fn(),
    enviaEmailError: jest.fn(),
    enviaEmailErrorDbConect: jest.fn(),
  },
}));

// As instâncias da rota trocadas por outras de limite baixo, montadas pelas
// próprias fábricas: o authRoutes é o de verdade.
jest.mock("../../middlewares/RateLimitMiddleware.js", () => {
  const actual = jest.requireActual("../../middlewares/RateLimitMiddleware.js");

  return {
    ...actual,
    loginLimiters: [actual.createLoginLimiter({ limit: 3 }), actual.createLoginIpLimiter({ limit: 5 })],
    forgotPasswordLimiter: actual.createForgotPasswordLimiter({ limit: 3 }),
    resetPasswordLimiter: actual.createResetPasswordLimiter({ limit: 3 }),
  };
});

import SendMail from "../../utils/SendMail.js";
import authRoutes from "../../routes/authRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rate limit das rotas de autenticação", () => {
  let app;
  let senhaHash;
  let ipAtual = 0;

  const SENHA_PADRAO = "senha123";
  const MENSAGEM_LOGIN = "Muitas tentativas de login. Tente de novo em 15 minutos.";

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    app.use(authRoutes);
    app.use(errorHandler);
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  // Cada teste sai por um IP próprio: os contadores ficam na memória do
  // limitador e não são zerados entre os testes.
  let ip;

  beforeEach(async() => {
    jest.clearAllMocks();
    await clearTestDatabase();

    ipAtual += 1;
    ip = `10.0.0.${ipAtual}`;

    await User.create({ name: "Aluno", email: "aluno@escola.com", password: senhaHash, role: "student" });
    await User.create({ name: "Colega", email: "colega@escola.com", password: senhaHash, role: "student" });
  });

  const post = (rota, corpo, origem = ip) =>
    request(app).post(rota).set("X-Forwarded-For", origem).send(corpo);

  const login = (email, password = SENHA_PADRAO, origem) =>
    post("/auth/login", { email, password }, origem);

  const errarSenha = async(email, vezes, origem) => {
    for (let i = 0; i < vezes; i++) {
      const res = await login(email, "senha-errada", origem);
      expect(res.status).toBe(401);
    }
  };

  describe("POST /auth/login", () => {
    it("deve responder 429 na 4ª tentativa depois de 3 senhas erradas, mesmo com a senha certa", async() => {
      await errarSenha("aluno@escola.com", 3);

      const res = await login("aluno@escola.com");

      expect(res.status).toBe(429);
      expect(res.body).toEqual({ message: MENSAGEM_LOGIN, data: null, errors: [] });
    });

    it("deve trazer o cabeçalho Retry-After e o RateLimit no 429", async() => {
      await errarSenha("aluno@escola.com", 3);

      const res = await login("aluno@escola.com");

      expect(res.status).toBe(429);
      expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
      expect(res.headers.ratelimit).toBeDefined();
      expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
    });

    it("não deve contar o login certo para o limite", async() => {
      for (let i = 0; i < 5; i++) {
        expect((await login("aluno@escola.com")).status).toBe(200);
      }
      await errarSenha("aluno@escola.com", 2);

      expect((await login("aluno@escola.com")).status).toBe(200);
    });

    it("deve deixar outro e-mail do mesmo IP continuar tentando", async() => {
      await errarSenha("aluno@escola.com", 3);
      expect((await login("aluno@escola.com")).status).toBe(429);

      expect((await login("colega@escola.com")).status).toBe(200);
    });

    it("deve tratar o e-mail sem diferenciar maiúsculas e espaços", async() => {
      await errarSenha("aluno@escola.com", 2);
      // O schema do login recusa os espaços com 400, que também conta como falha.
      expect((await login("  ALUNO@escola.com ", "senha-errada")).status).toBe(400);

      expect((await login("aluno@escola.com")).status).toBe(429);
    });

    it("deve barrar o IP depois de muitas falhas com e-mails diferentes", async() => {
      for (let i = 0; i < 5; i++) {
        const res = await login(`tentativa${i}@escola.com`, "senha-errada");
        expect(res.status).toBe(401);
      }

      const res = await login("colega@escola.com");

      expect(res.status).toBe(429);
      expect(res.body.message).toBe(MENSAGEM_LOGIN);
    });

    it("não deve gastar a cota do IP com as tentativas já barradas de um e-mail", async() => {
      await errarSenha("aluno@escola.com", 3);
      for (let i = 0; i < 5; i++) {
        expect((await login("aluno@escola.com")).status).toBe(429);
      }

      expect((await login("colega@escola.com")).status).toBe(200);
    });

    it("deve contar separado as tentativas de outro IP", async() => {
      await errarSenha("aluno@escola.com", 3);

      expect((await login("aluno@escola.com", SENHA_PADRAO, "10.1.0.1")).status).toBe(200);
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("deve responder 429 no pedido além do limite e não enviar o e-mail", async() => {
      for (let i = 0; i < 3; i++) {
        expect((await post("/auth/forgot-password", { email: "aluno@escola.com" })).status).toBe(200);
      }
      expect(SendMail.enviaEmail).toHaveBeenCalledTimes(3);

      const res = await post("/auth/forgot-password", { email: "aluno@escola.com" });

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        message: "Muitos pedidos de recuperação. Tente de novo em 1 hora.",
        data: null,
        errors: [],
      });
      expect(res.headers["retry-after"]).toBeDefined();
      expect(SendMail.enviaEmail).toHaveBeenCalledTimes(3);
    });

    it("deve deixar pedir para outro e-mail do mesmo IP", async() => {
      for (let i = 0; i < 4; i++) {
        await post("/auth/forgot-password", { email: "aluno@escola.com" });
      }

      expect((await post("/auth/forgot-password", { email: "colega@escola.com" })).status).toBe(200);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("deve responder 429 depois de 3 códigos errados", async() => {
      for (let i = 0; i < 3; i++) {
        const res = await post("/auth/reset-password", { code: `codigo-errado-${i}`, newPassword: "novaSenha123" });
        expect(res.status).toBe(400);
      }

      const res = await post("/auth/reset-password", { code: "outro-codigo", newPassword: "novaSenha123" });

      expect(res.status).toBe(429);
      expect(res.body).toEqual({ message: "Muitas tentativas. Tente de novo em 15 minutos.", data: null, errors: [] });
    });
  });

  describe("POST /auth/refresh", () => {
    it("nunca deve responder 429, nem depois de o login estourar o limite", async() => {
      const { refreshToken } = (await login("aluno@escola.com")).body.data;
      await errarSenha("aluno@escola.com", 3);
      expect((await login("aluno@escola.com")).status).toBe(429);

      for (let i = 0; i < 10; i++) {
        const res = await post("/auth/refresh", { refreshToken: "token-invalido" });
        expect(res.status).toBe(401);
      }

      const res = await post("/auth/refresh", { refreshToken });

      expect(res.status).toBe(200);
    });
  });
});
