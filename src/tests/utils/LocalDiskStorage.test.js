import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import LocalDiskStorage from "../../utils/LocalDiskStorage.js";

describe("LocalDiskStorage", () => {
  let baseDir;
  let storage;

  beforeEach(async() => {
    baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "levelup-storage-"));
    storage = new LocalDiskStorage(baseDir);
  });

  afterEach(async() => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  describe("save", () => {
    it("deve gravar o buffer criando as subpastas da chave", async() => {
      const key = await storage.save("avatars/foto.webp", Buffer.from("conteudo"));

      const gravado = await fs.readFile(path.join(baseDir, "avatars/foto.webp"), "utf8");
      expect(key).toBe("avatars/foto.webp");
      expect(gravado).toBe("conteudo");
    });

    it("deve recusar chave que sai da pasta base", async() => {
      await expect(storage.save("../fora.webp", Buffer.from("x"))).rejects.toThrow("Chave de arquivo inválida.");
    });

    it("deve recusar pasta irmã com o mesmo prefixo", async() => {
      const irma = `../${path.basename(baseDir)}-irma/foto.webp`;

      await expect(storage.save(irma, Buffer.from("x"))).rejects.toThrow("Chave de arquivo inválida.");
    });
  });

  describe("delete", () => {
    it("deve apagar um arquivo existente", async() => {
      await storage.save("avatars/foto.webp", Buffer.from("x"));

      await storage.delete("avatars/foto.webp");

      await expect(fs.access(path.join(baseDir, "avatars/foto.webp"))).rejects.toThrow();
    });

    it("não deve falhar ao apagar um arquivo que não existe", async() => {
      await expect(storage.delete("avatars/inexistente.webp")).resolves.toBeUndefined();
    });

    it("deve propagar erros que não sejam de arquivo inexistente", async() => {
      jest.spyOn(fs, "unlink").mockRejectedValueOnce(Object.assign(new Error("sem permissão"), { code: "EACCES" }));

      await expect(storage.delete("avatars/foto.webp")).rejects.toThrow("sem permissão");
      jest.restoreAllMocks();
    });
  });

  describe("getUrl", () => {
    it("deve montar a URL pública a partir da chave", () => {
      expect(storage.getUrl("avatars/foto.webp")).toBe("/uploads/avatars/foto.webp");
    });
  });

  describe("keyFromUrl", () => {
    it("deve devolver a chave de uma URL montada pelo getUrl", () => {
      expect(storage.keyFromUrl(storage.getUrl("avatars/foto.webp"))).toBe("avatars/foto.webp");
    });

    it.each([null, "https://outro-site.com/foto.webp", "/outra-pasta/foto.webp"])(
      "deve devolver null para %s",
      (url) => {
        expect(storage.keyFromUrl(url)).toBeNull();
      },
    );
  });
});
