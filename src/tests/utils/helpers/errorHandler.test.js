// O logger é dublê para que a suíte não escreva arquivo em logs/ e para que dê
// para verificar em que nível cada erro foi registrado.
jest.mock("../../../utils/logger.js", () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn() },
}));

// O id do erro entra na resposta de produção; fixá-lo torna a asserção possível.
jest.mock("uuid", () => ({ v4: jest.fn(() => "erro-fixo-1234") }));

import { ZodError } from "zod";
import mongoose from "mongoose";
import logger from "../../../utils/logger.js";
import errorHandler from "../../../utils/helpers/errorHandler.js";
import CustomError from "../../../utils/helpers/CustomError.js";
import AuthenticationError from "../../../utils/errors/AuthenticationError.js";
import TokenExpiredError from "../../../utils/errors/TokenExpiredError.js";

/**
 * Último middleware da cadeia: qualquer erro que escape de um controller cai
 * aqui e vira resposta HTTP. Cada ramo é testado pelo par (status, corpo) que
 * chega ao cliente — é isso que o front consome. O CommonResponse e o
 * StatusService entram de verdade, porque a mensagem final depende deles.
 */
describe("errorHandler", () => {
  let req;
  let res;
  let next;
  const NODE_ENV_ORIGINAL = process.env.NODE_ENV;

  const corpo = () => res.json.mock.calls[0][0];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    req = { path: "/usuarios", requestId: "req-123" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnValue("resposta-enviada"),
    };
    next = jest.fn();
  });

  afterAll(() => {
    process.env.NODE_ENV = NODE_ENV_ORIGINAL;
  });

  it("não deve repassar o erro adiante", () => {
    // É o fim da linha: chamar next() aqui deixaria a requisição pendurada.
    errorHandler(new Error("qualquer"), req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  describe("erro de validação do Zod", () => {
    const zodError = () => new ZodError([
      { code: "invalid_type", path: ["endereco", "cep"], message: "Esperado string" },
      { code: "too_small", path: ["nome"], message: "Muito curto" },
    ]);

    it("deve responder 400 contando os campos inválidos", () => {
      errorHandler(zodError(), req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(corpo().message).toBe("Erro de validação. 2 campo(s) inválido(s).");
      expect(corpo().data).toBeNull();
    });

    it("deve achatar o caminho de cada campo", () => {
      errorHandler(zodError(), req, res, next);

      expect(corpo().errors).toEqual([
        { path: "endereco.cep", message: "Esperado string" },
        { path: "nome", message: "Muito curto" },
      ]);
    });

    it("deve registrar como aviso, não como erro interno", () => {
      errorHandler(zodError(), req, res, next);

      expect(logger.warn).toHaveBeenCalledWith("Erro de validação", expect.objectContaining({
        path: "/usuarios",
        requestId: "req-123",
      }));
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe("chave duplicada do MongoDB", () => {
    it("deve responder 409 apontando o campo em conflito", () => {
      const erro = Object.assign(new Error("E11000"), {
        code: 11000,
        keyValue: { email: "aluno@escola.com" },
      });

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(corpo().message).toBe("Entrada duplicada no campo \"email\".");
      expect(corpo().errors).toEqual([
        { path: "email", message: "O valor \"aluno@escola.com\" já está em uso." },
      ]);
    });

    it("deve sobreviver a um erro 11000 sem keyValue", () => {
      // Nem todo driver preenche keyValue; a resposta ainda precisa sair.
      errorHandler(Object.assign(new Error("E11000"), { code: 11000 }), req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(corpo().errors).toEqual([
        { path: undefined, message: "O valor \"duplicado\" já está em uso." },
      ]);
    });
  });

  describe("erro de validação do Mongoose", () => {
    it("deve responder 400 com um detalhe por campo", () => {
      const erro = new mongoose.Error.ValidationError();
      erro.errors = {
        nome: { path: "nome", message: "Path `nome` is required." },
        idade: { path: "idade", message: "idade menor que o mínimo." },
      };

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(corpo().message).toBe(
        "Erro de validação. Verifique os dados fornecidos e tente novamente.",
      );
      expect(corpo().errors).toEqual([
        { path: "nome", message: "Path `nome` is required." },
        { path: "idade", message: "idade menor que o mínimo." },
      ]);
    });
  });

  describe("erros de autenticação", () => {
    it.each([
      ["AuthenticationError", () => new AuthenticationError("Token não informado.")],
      ["TokenExpiredError", () => new TokenExpiredError("Sessão expirada.")],
    ])("deve responder o statusCode do %s com a própria mensagem", (_nome, criar) => {
      const erro = criar();

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(498);
      expect(corpo().message).toBe(erro.message);
      expect(corpo().errors).toEqual([{ message: erro.message }]);
      expect(logger.warn).toHaveBeenCalledWith("Erro de autenticação", expect.objectContaining({
        message: erro.message,
      }));
    });
  });

  describe("token expirado", () => {
    it("deve responder com o status e a mensagem do CustomError", () => {
      const erro = new CustomError({
        statusCode: 498,
        errorType: "tokenExpired",
        customMessage: "Seu token expirou. Faça login novamente.",
      });

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(498);
      expect(corpo().message).toBe("Seu token expirou. Faça login novamente.");
      expect(corpo().errors).toEqual([{ message: "Seu token expirou. Faça login novamente." }]);
    });

    it("deve cair em 401 e mensagem padrão quando o erro vem incompleto", () => {
      errorHandler(new CustomError({ errorType: "tokenExpired" }), req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(corpo().message).toBe("Token expirado. Por favor, faça login novamente.");
      expect(corpo().errors).toEqual([{ message: "Token expirado." }]);
    });

    it("não deve tratar como token expirado um CustomError de outro tipo", () => {
      const erro = new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        customMessage: "Turma não encontrada.",
      });

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(logger.warn).toHaveBeenCalledWith("Erro operacional", expect.anything());
    });
  });

  describe("erro operacional", () => {
    it("deve devolver o contrato do erro tal como veio", () => {
      const erro = new CustomError({
        statusCode: 403,
        errorType: "permissionError",
        field: "rota",
        details: [{ message: "Sem permissão para excluir turmas." }],
        customMessage: "Permissão insuficiente.",
      });

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(corpo().message).toBe("Permissão insuficiente.");
      expect(corpo().errors).toEqual([{ message: "Sem permissão para excluir turmas." }]);
    });

    it("deve aplicar os padrões quando o erro traz só o essencial", () => {
      const erro = Object.assign(new Error("falhou"), { isOperational: true, statusCode: 400 });

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(corpo().message).toBe("Erro operacional.");
      expect(corpo().errors).toEqual([]);
    });
  });

  describe("erro interno", () => {
    it("deve responder 500 expondo a stack fora de produção", () => {
      // Em desenvolvimento a stack é o que permite achar a origem do erro.
      const erro = new Error("cannot read property of undefined");

      errorHandler(erro, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(corpo().message).toBe("Erro interno do servidor. Tente novamente mais tarde.");
      expect(corpo().errors).toEqual([{ message: erro.message, stack: erro.stack }]);
    });

    it("deve esconder a stack em produção e devolver só a referência", () => {
      process.env.NODE_ENV = "production";

      errorHandler(new Error("detalhe interno vazando"), req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(corpo().errors).toEqual([
        { message: "Erro interno do servidor. Referência: erro-fixo-1234" },
      ]);
      expect(JSON.stringify(corpo())).not.toContain("detalhe interno vazando");
    });

    it("deve registrar no nível de erro com o mesmo id da resposta", () => {
      errorHandler(new Error("falha inesperada"), req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        "Erro interno [ID: erro-fixo-1234]",
        expect.objectContaining({ message: "falha inesperada", requestId: "req-123" }),
      );
    });
  });

  it("deve registrar N/A quando a requisição não tem requestId", () => {
    errorHandler(new Error("falha"), { path: "/turmas" }, res, next);

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ requestId: "N/A" }),
    );
  });
});
