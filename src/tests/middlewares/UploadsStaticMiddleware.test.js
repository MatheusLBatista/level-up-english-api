import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import uploadsStatic from "../../middlewares/UploadsStaticMiddleware.js";
import LocalDiskStorage from "../../utils/LocalDiskStorage.js";

describe("UploadsStaticMiddleware", () => {
  let baseDir;
  let app;

  beforeEach(async() => {
    baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "levelup-static-"));
    const storage = new LocalDiskStorage(baseDir);
    await storage.save("avatars/foto.webp", Buffer.from("imagem"));
    await storage.save("avatars/.secreto", Buffer.from("x"));

    app = express();
    app.use(storage.publicPath, uploadsStatic(storage));
    app.use((req, res) => res.status(404).end());
  });

  afterEach(async() => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it("deve servir um arquivo gravado pelo storage", async() => {
    const res = await request(app).get("/uploads/avatars/foto.webp");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/webp");
    expect(res.body.toString()).toBe("imagem");
  });

  it("deve liberar a imagem para outra origem e mandar cachear", async() => {
    const res = await request(app).get("/uploads/avatars/foto.webp");

    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(res.headers["cache-control"]).toBe("public, max-age=604800");
  });

  it("deve cair no 404 da aplicação quando o arquivo não existe", async() => {
    const res = await request(app).get("/uploads/avatars/nao-existe.webp");

    expect(res.status).toBe(404);
  });

  it("não deve servir arquivos ocultos nem revelar que existem", async() => {
    const res = await request(app).get("/uploads/avatars/.secreto");

    expect(res.status).toBe(404);
  });

  it("não deve listar nem procurar index em pastas", async() => {
    const res = await request(app).get("/uploads/avatars/");

    expect(res.status).toBe(404);
  });
});
