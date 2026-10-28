import express from "express";
import request from "supertest";
import { trustProxyFromEnv } from "../../config/trustProxy.js";
import { createLoginIpLimiter } from "../../middlewares/RateLimitMiddleware.js";

describe("trustProxyFromEnv", () => {
  it.each([
    ["ausente", undefined],
    ["vazio", ""],
    ["zero", "0"],
    ["negativo", "-1"],
    ["não numérico", "true"],
  ])("deve desligar o trust proxy quando a variável estiver %s", (_, valor) => {
    expect(trustProxyFromEnv(valor)).toBe(false);
  });

  it("deve confiar no número de proxies informado", () => {
    expect(trustProxyFromEnv("1")).toBe(1);
    expect(trustProxyFromEnv("2")).toBe(2);
  });

  describe("no rate limit", () => {
    /** App mínimo: a rota sempre falha, então toda tentativa conta para o limite. */
    const montarApp = (valor) => {
      const app = express();
      app.set("trust proxy", trustProxyFromEnv(valor));
      app.post("/login", createLoginIpLimiter({ limit: 2 }), (req, res) => res.status(401).end());
      return app;
    };

    const tentarDe = (app, ip) => request(app).post("/login").set("X-Forwarded-For", ip);

    beforeEach(() => {
      // O express-rate-limit avisa no console quando chega X-Forwarded-For com o
      // trust proxy desligado, que é justamente o cenário testado.
      jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      console.error.mockRestore();
    });

    it("sem a variável, não deve deixar um X-Forwarded-For forjado trocar o IP do limite", async() => {
      const app = montarApp(undefined);

      await tentarDe(app, "10.0.0.1");
      await tentarDe(app, "10.0.0.2");
      const res = await tentarDe(app, "10.0.0.3");

      expect(res.status).toBe(429);
    });

    it("com TRUST_PROXY=1, deve contar cada IP do X-Forwarded-For separado", async() => {
      const app = montarApp("1");

      await tentarDe(app, "10.0.0.1");
      await tentarDe(app, "10.0.0.2");
      const res = await tentarDe(app, "10.0.0.3");

      expect(res.status).toBe(401);
    });
  });
});
