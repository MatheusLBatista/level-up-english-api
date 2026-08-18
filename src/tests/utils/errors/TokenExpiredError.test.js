import TokenExpiredError from "../../../utils/errors/TokenExpiredError.js";
import AuthenticationError from "../../../utils/errors/AuthenticationError.js";

/**
 * Mesmo statusCode do AuthenticationError, mas classe separada: o errorHandler
 * trata os dois no mesmo ramo e o nome é o que distingue os casos no log.
 */
describe("TokenExpiredError", () => {
  it("deve manter a mensagem recebida", () => {
    const erro = new TokenExpiredError("Token expirado.");

    expect(erro.message).toBe("Token expirado.");
  });

  it("deve responder com 498 e se marcar como operacional", () => {
    const erro = new TokenExpiredError("Token expirado.");

    expect(erro.statusCode).toBe(498);
    expect(erro.isOperational).toBe(true);
  });

  it("deve ser um Error identificável por instanceof", () => {
    const erro = new TokenExpiredError("Token expirado.");

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(TokenExpiredError);
    expect(erro.name).toBe("TokenExpiredError");
  });

  it("não deve ser confundido com AuthenticationError", () => {
    // São irmãos, não pai e filho: quem quiser distinguir os dois precisa do name.
    expect(new TokenExpiredError("x")).not.toBeInstanceOf(AuthenticationError);
  });
});
