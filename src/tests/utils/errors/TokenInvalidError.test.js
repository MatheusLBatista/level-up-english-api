import TokenInvalidError from "../../../utils/errors/TokenInvalidError.js";
import CustomError from "../../../utils/helpers/CustomError.js";

/**
 * Diferente dos outros dois erros de token, este herda de CustomError — então
 * cai no ramo isOperational do errorHandler e responde 401.
 */
describe("TokenInvalidError", () => {
  it("deve responder 401 com o errorType e o campo do token", () => {
    const erro = new TokenInvalidError();

    expect(erro.statusCode).toBe(401);
    expect(erro.errorType).toBe("invalidToken");
    expect(erro.field).toBe("Token");
    expect(erro.details).toEqual([]);
  });

  it("deve usar a mensagem padrão de recurso não encontrado", () => {
    const erro = new TokenInvalidError();

    expect(erro.customMessage).toBe("Recurso não encontrado em Token.");
    expect(erro.message).toBe("Recurso não encontrado em Token.");
  });

  it("deve ignorar a mensagem passada no construtor", () => {
    // Comportamento atual: o parâmetro message não é repassado ao super.
    const erro = new TokenInvalidError("Assinatura do token não confere.");

    expect(erro.message).toBe("Recurso não encontrado em Token.");
  });

  it("deve herdar o contrato do CustomError", () => {
    const erro = new TokenInvalidError();

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(CustomError);
    expect(erro).toBeInstanceOf(TokenInvalidError);
    expect(erro.isOperational).toBe(true);
    // O name vem do CustomError, que o fixa no construtor.
    expect(erro.name).toBe("CustomError");
  });
});
