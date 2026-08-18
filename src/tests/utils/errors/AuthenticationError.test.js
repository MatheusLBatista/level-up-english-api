import AuthenticationError from "../../../utils/errors/AuthenticationError.js";

/**
 * Erro lançado pelo AuthMiddleware quando o token não passa. O errorHandler
 * responde com o statusCode que a classe carrega, então o 498 faz parte do
 * contrato com o front-end (é o código que dispara o refresh do token).
 */
describe("AuthenticationError", () => {
  it("deve manter a mensagem recebida", () => {
    const erro = new AuthenticationError("Token não informado.");

    expect(erro.message).toBe("Token não informado.");
  });

  it("deve responder com 498 e se marcar como operacional", () => {
    const erro = new AuthenticationError("Token inválido.");

    expect(erro.statusCode).toBe(498);
    expect(erro.isOperational).toBe(true);
  });

  it("deve ser um Error identificável por instanceof", () => {
    const erro = new AuthenticationError("Token inválido.");

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(AuthenticationError);
    expect(erro.name).toBe("AuthenticationError");
  });
});
