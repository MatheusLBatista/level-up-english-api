import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import AuthHelper from "../../utils/AuthHelper.js";

/**
 * O AuthHelper é usado pelo AuthService e pelo UserService. O jwt e o bcrypt
 * entram de verdade — o que se quer garantir é justamente que o hash gerado
 * aqui seja conferível depois e que o decode não derrube a aplicação.
 */
describe("AuthHelper", () => {
  const SEGREDO = "segredo-de-teste";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("decodeToken", () => {
    it("deve ler o payload sem precisar do segredo", () => {
      // decode só lê; quem valida assinatura é o verify.
      const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, SEGREDO, { expiresIn: "1d" });

      const payload = AuthHelper.decodeToken(token);

      expect(payload.id).toBe("507f1f77bcf86cd799439011");
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it("deve ler o payload mesmo de um token expirado", () => {
      const token = jwt.sign({ id: "abc" }, SEGREDO, { expiresIn: "-1h" });

      expect(AuthHelper.decodeToken(token).id).toBe("abc");
    });

    it("deve devolver null para um token malformado", () => {
      expect(AuthHelper.decodeToken("nao-e-um-token")).toBeNull();
      expect(AuthHelper.decodeToken("")).toBeNull();
    });

    it("deve devolver null em vez de propagar exceção", () => {
      jest.spyOn(jwt, "decode").mockImplementation(() => {
        throw new Error("falha inesperada no decode");
      });

      expect(AuthHelper.decodeToken("qualquer.coisa.aqui")).toBeNull();
    });
  });

  describe("hashPassword", () => {
    it("deve devolver um hash conferível pelo bcrypt", async() => {
      const { hash } = await AuthHelper.hashPassword("senha123");

      expect(await bcrypt.compare("senha123", hash)).toBe(true);
      expect(await bcrypt.compare("senha-errada", hash)).toBe(false);
    });

    it("deve devolver o hash dentro de um objeto", () => {
      // O UserService desestrutura { hash }; mudar o formato quebra o cadastro.
      return expect(AuthHelper.hashPassword("senha123"))
        .resolves.toEqual({ hash: expect.any(String) });
    });

    it("não deve guardar a senha em claro", async() => {
      const { hash } = await AuthHelper.hashPassword("senha123");

      expect(hash).not.toBe("senha123");
      expect(hash).not.toContain("senha123");
    });

    it("deve usar o custo 10 do bcrypt", async() => {
      const { hash } = await AuthHelper.hashPassword("senha123");

      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it("deve gerar hashes diferentes para a mesma senha", async() => {
      // Salt aleatório: dois usuários com a mesma senha não podem ter o mesmo hash.
      const primeiro = await AuthHelper.hashPassword("senha123");
      const segundo = await AuthHelper.hashPassword("senha123");

      expect(primeiro.hash).not.toBe(segundo.hash);
      expect(await bcrypt.compare("senha123", segundo.hash)).toBe(true);
    });
  });
});
