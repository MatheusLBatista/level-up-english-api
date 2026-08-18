import jwt from "jsonwebtoken";
import TokenUtil from "../../utils/TokenUtil.js";

/**
 * Os três tokens da aplicação são assinados aqui, cada um com o seu segredo.
 * O jwt entra de verdade: o ponto dos testes é garantir que um token assinado
 * com um segredo não seja aceito no lugar do outro, e que a expiração
 * combinada seja mesmo gravada no token.
 */
describe("TokenUtil", () => {
  const ID = "507f1f77bcf86cd799439011";
  const ENV_ORIGINAL = { ...process.env };

  const segundosDeVida = (token) => {
    const { iat, exp } = jwt.decode(token);
    return exp - iat;
  };

  afterEach(() => {
    process.env = { ...ENV_ORIGINAL };
  });

  describe("geração dos tokens", () => {
    it.each([
      ["generateAccessToken", "JWT_SECRET_ACCESS_TOKEN", "JWT_ACCESS_TOKEN_EXPIRATION", 86400],
      ["generateRefreshToken", "JWT_SECRET_REFRESH_TOKEN", "JWT_REFRESH_TOKEN_EXPIRATION", 604800],
      [
        "generatePasswordRecoveryToken",
        "JWT_SECRET_PASSWORD_RECOVERY",
        "JWT_PASSWORD_RECOVERY_EXPIRATION",
        1800,
      ],
    ])("%s deve assinar o id com o seu próprio segredo", async(metodo, segredo) => {
      const token = await TokenUtil[metodo](ID);

      expect(typeof token).toBe("string");
      expect(jwt.verify(token, process.env[segredo]).id).toBe(ID);
    });

    it.each([
      ["generateAccessToken", "JWT_SECRET_REFRESH_TOKEN"],
      ["generateRefreshToken", "JWT_SECRET_ACCESS_TOKEN"],
      ["generatePasswordRecoveryToken", "JWT_SECRET_ACCESS_TOKEN"],
    ])("%s não deve ser válido com o segredo de outro token", async(metodo, outroSegredo) => {
      // Segredos separados existem para que um token de recuperação não sirva de acesso.
      const token = await TokenUtil[metodo](ID);

      expect(() => jwt.verify(token, process.env[outroSegredo])).toThrow(jwt.JsonWebTokenError);
    });

    it.each([
      ["generateAccessToken", "JWT_ACCESS_TOKEN_EXPIRATION"],
      ["generateRefreshToken", "JWT_REFRESH_TOKEN_EXPIRATION"],
      ["generatePasswordRecoveryToken", "JWT_PASSWORD_RECOVERY_EXPIRATION"],
    ])("%s deve respeitar a expiração configurada", async(metodo, variavel) => {
      process.env[variavel] = "2h";

      expect(segundosDeVida(await TokenUtil[metodo](ID))).toBe(7200);
    });

    it.each([
      ["generateAccessToken", "JWT_ACCESS_TOKEN_EXPIRATION", 86400],
      ["generateRefreshToken", "JWT_REFRESH_TOKEN_EXPIRATION", 604800],
      ["generatePasswordRecoveryToken", "JWT_PASSWORD_RECOVERY_EXPIRATION", 1800],
    ])("%s deve cair no padrão sem a variável de ambiente", async(metodo, variavel, esperado) => {
      delete process.env[variavel];

      expect(segundosDeVida(await TokenUtil[metodo](ID))).toBe(esperado);
    });

    it.each([
      ["generateAccessToken", "JWT_SECRET_ACCESS_TOKEN"],
      ["generateRefreshToken", "JWT_SECRET_REFRESH_TOKEN"],
      ["generatePasswordRecoveryToken", "JWT_SECRET_PASSWORD_RECOVERY"],
    ])("%s deve rejeitar quando o segredo não está configurado", async(metodo, segredo) => {
      // Sem segredo é erro de configuração: melhor falhar do que emitir token fraco.
      delete process.env[segredo];

      await expect(TokenUtil[metodo](ID)).rejects.toThrow(/secretOrPrivateKey/);
    });
  });

  describe("verifyRefreshToken", () => {
    it("deve resolver com o payload de um refresh token válido", async() => {
      const token = await TokenUtil.generateRefreshToken(ID);

      const payload = await TokenUtil.verifyRefreshToken(token);

      expect(payload.id).toBe(ID);
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it("deve rejeitar um token expirado", async() => {
      const token = jwt.sign({ id: ID }, process.env.JWT_SECRET_REFRESH_TOKEN, { expiresIn: "-1s" });

      await expect(TokenUtil.verifyRefreshToken(token)).rejects.toBeInstanceOf(jwt.TokenExpiredError);
    });

    it("deve rejeitar um token assinado com outro segredo", async() => {
      // É assim que um access token é barrado no endpoint de refresh.
      const token = await TokenUtil.generateAccessToken(ID);

      await expect(TokenUtil.verifyRefreshToken(token)).rejects.toBeInstanceOf(jwt.JsonWebTokenError);
    });

    it("deve rejeitar um token malformado", async() => {
      await expect(TokenUtil.verifyRefreshToken("nao-e-um-token")).rejects.toThrow("jwt malformed");
    });
  });
});
