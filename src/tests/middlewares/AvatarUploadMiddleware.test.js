import express from "express";
import request from "supertest";
import avatarUpload, { AVATAR_MAX_BYTES } from "../../middlewares/AvatarUploadMiddleware.js";
import errorHandler from "../../utils/helpers/errorHandler.js";

describe("AvatarUploadMiddleware", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.post("/avatar", avatarUpload, (req, res) =>
      res.json({ mimetype: req.file.mimetype, size: req.file.size, isBuffer: Buffer.isBuffer(req.file.buffer) }),
    );
    app.use(errorHandler);
  });

  const enviar = (buffer, { field = "avatar", filename = "foto.png", contentType = "image/png" } = {}) =>
    request(app).post("/avatar").attach(field, buffer, { filename, contentType });

  it("deve entregar a imagem em memória no req.file", async() => {
    // O conteúdo não é PNG de verdade: aqui só o rótulo é conferido.
    const res = await enviar(Buffer.from("png-falso"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mimetype: "image/png", size: 9, isBuffer: true });
  });

  it.each(["image/jpeg", "image/webp"])("deve aceitar %s", async(contentType) => {
    const res = await enviar(Buffer.from("x"), { contentType });

    expect(res.status).toBe(200);
  });

  it("deve recusar tipo que não é imagem permitida", async() => {
    const res = await enviar(Buffer.from("x"), { filename: "doc.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("A foto deve ser JPEG, PNG ou WebP.");
  });

  it("deve recusar arquivo acima do limite com 413", async() => {
    const res = await enviar(Buffer.alloc(AVATAR_MAX_BYTES + 1));

    expect(res.status).toBe(413);
    expect(res.body.message).toBe("A foto deve ter no máximo 2 MB.");
  });

  it("deve recusar arquivo enviado em outro campo", async() => {
    const res = await enviar(Buffer.from("x"), { field: "foto" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Envie apenas um arquivo, no campo \"avatar\".");
  });

  it("deve recusar multipart sem arquivo", async() => {
    const res = await request(app).post("/avatar").field("nome", "x");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Envie a foto no campo \"avatar\".");
  });

  it("deve recusar requisição que não é multipart", async() => {
    const res = await request(app).post("/avatar").send({ avatar: "x" });

    expect(res.status).toBe(400);
  });
});
