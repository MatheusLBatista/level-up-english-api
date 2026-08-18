import CustomError from "../../../utils/helpers/CustomError.js";

/**
 * O CustomError é o contrato que repositórios e services usam para dizer ao
 * errorHandler qual resposta HTTP o cliente deve receber. O que importa aqui é
 * que ele continue sendo um Error de verdade e que os campos desse contrato
 * (statusCode, errorType, isOperational) cheguem intactos.
 */
describe("CustomError", () => {
  it("deve preservar os dados do erro informados", () => {
    const erro = new CustomError({
      statusCode: 404,
      errorType: "resourceNotFound",
      field: "email",
      details: [{ path: "email", message: "não encontrado" }],
      customMessage: "Usuário não encontrado.",
    });

    expect(erro.statusCode).toBe(404);
    expect(erro.errorType).toBe("resourceNotFound");
    expect(erro.field).toBe("email");
    expect(erro.details).toEqual([{ path: "email", message: "não encontrado" }]);
    expect(erro.customMessage).toBe("Usuário não encontrado.");
  });

  it("deve usar a customMessage como mensagem do Error", () => {
    // O errorHandler loga err.message; sem isso o log sairia genérico.
    const erro = new CustomError({ statusCode: 401, customMessage: "Token expirado." });

    expect(erro.message).toBe("Token expirado.");
  });

  it("deve cair numa mensagem padrão quando não há customMessage", () => {
    const erro = new CustomError({ statusCode: 500, errorType: "serverError" });

    expect(erro.message).toBe("An error occurred");
    expect(erro.customMessage).toBeNull();
  });

  it("deve funcionar sem nenhum argumento", () => {
    const erro = new CustomError();

    expect(erro.message).toBe("An error occurred");
    expect(erro.statusCode).toBeUndefined();
    expect(erro.errorType).toBeUndefined();
  });

  it("deve aplicar os padrões de field e details", () => {
    const erro = new CustomError({ statusCode: 400, errorType: "validationError" });

    expect(erro.field).toBeNull();
    expect(erro.details).toEqual([]);
  });

  it("deve se marcar como operacional", () => {
    // O errorHandler usa isOperational para separar erro esperado de erro interno.
    const erro = new CustomError({ statusCode: 400 });

    expect(erro.isOperational).toBe(true);
  });

  it("deve continuar sendo um Error capturável por instanceof e try/catch", () => {
    const erro = new CustomError({ statusCode: 403, errorType: "forbidden" });

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(CustomError);
    expect(erro.name).toBe("CustomError");
    expect(typeof erro.stack).toBe("string");

    expect(() => {
      throw erro;
    }).toThrow(CustomError);
  });
});
