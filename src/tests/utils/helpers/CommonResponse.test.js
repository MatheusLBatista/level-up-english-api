import CommonResponse from "../../../utils/helpers/CommonResponse.js";

/**
 * O CommonResponse é o formato de saída de toda a API: todo controller responde
 * por ele. O que está em julgamento aqui é o envelope — { message, data, errors }
 * — e o status HTTP que acompanha cada atalho. O res é um dublê porque o
 * transporte já é verificado nos testes de rota.
 */
describe("CommonResponse", () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnValue("resposta-enviada"),
    };
  });

  describe("envelope", () => {
    it("deve montar o envelope com os três campos", () => {
      const resposta = new CommonResponse("ok", { id: 1 }, [{ message: "aviso" }]);

      expect(resposta.toJSON()).toEqual({
        message: "ok",
        data: { id: 1 },
        errors: [{ message: "aviso" }],
      });
    });

    it("deve aplicar os padrões de data e errors", () => {
      const resposta = new CommonResponse("ok");

      expect(resposta.toJSON()).toEqual({ message: "ok", data: null, errors: [] });
    });
  });

  describe("success", () => {
    it("deve responder 200 com a mensagem padrão do código", () => {
      CommonResponse.success(res, { id: 1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Requisição bem-sucedida",
        data: { id: 1 },
        errors: [],
      }));
    });

    it("deve aceitar outro código e buscar a mensagem correspondente", () => {
      CommonResponse.success(res, null, 204);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json.mock.calls[0][0].message).toBe("Sem conteúdo para retornar");
    });

    it("deve preferir a mensagem explícita à do código", () => {
      CommonResponse.success(res, [], 200, "Turmas listadas com sucesso.");

      expect(res.json.mock.calls[0][0].message).toBe("Turmas listadas com sucesso.");
    });

    it("deve avisar quando o código não é conhecido", () => {
      CommonResponse.success(res, null, 599);

      expect(res.status).toHaveBeenCalledWith(599);
      expect(res.json.mock.calls[0][0].message).toBe("Status desconhecido.");
    });

    it("deve devolver o retorno do res.json para o controller", () => {
      // Os controllers fazem `return CommonResponse.success(...)`; a cadeia não pode quebrar.
      expect(CommonResponse.success(res, {})).toBe("resposta-enviada");
    });
  });

  describe("created", () => {
    it("deve responder 201 com a mensagem de recurso criado", () => {
      CommonResponse.created(res, { id: 1 });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Recurso criado com sucesso",
        data: { id: 1 },
        errors: [],
      }));
    });

    it("deve aceitar mensagem própria mantendo o 201", () => {
      CommonResponse.created(res, { id: 1 }, "Aluno cadastrado.");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].message).toBe("Aluno cadastrado.");
    });
  });

  describe("error", () => {
    it("deve traduzir o errorType em mensagem e zerar o data", () => {
      CommonResponse.error(res, 400, "validationError");

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Erro de validação. Verifique os dados fornecidos e tente novamente.",
        data: null,
        errors: [],
      }));
    });

    it("deve repassar o campo para mensagens que dependem dele", () => {
      CommonResponse.error(res, 409, "duplicateEntry", "email");

      expect(res.json.mock.calls[0][0].message)
        .toBe("Já existe um registro com o dado informado no(s) campo(s) email.");
    });

    it("deve carregar a lista de erros detalhados", () => {
      const detalhes = [{ path: "email", message: "Email no formato inválido." }];

      CommonResponse.error(res, 400, "validationError", null, detalhes);

      expect(res.json.mock.calls[0][0].errors).toEqual(detalhes);
    });

    it("deve preferir a customMessage ao errorType", () => {
      CommonResponse.error(res, 401, "unauthorizedAccess", null, [], "Sessão expirada.");

      expect(res.json.mock.calls[0][0].message).toBe("Sessão expirada.");
    });

    it("deve avisar quando o errorType não é conhecido", () => {
      CommonResponse.error(res, 400, "tipoInexistente");

      expect(res.json.mock.calls[0][0].message).toBe("Tipo de erro desconhecido.");
    });
  });

  describe("serverError", () => {
    it("deve responder 500 com a mensagem padrão", () => {
      CommonResponse.serverError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Erro interno do servidor. Tente novamente mais tarde.",
        data: null,
        errors: [],
      }));
    });

    it("deve aceitar mensagem própria mantendo o 500", () => {
      CommonResponse.serverError(res, "Banco indisponível.");

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json.mock.calls[0][0].message).toBe("Banco indisponível.");
    });
  });

  describe("getSwaggerSchema", () => {
    it("deve descrever o envelope com data genérico", () => {
      expect(CommonResponse.getSwaggerSchema()).toEqual({
        type: "object",
        properties: {
          data: { type: "array", items: {}, example: [] },
          message: { type: "string", example: "Operação realizada com sucesso" },
          errors: { type: "array", example: [] },
        },
      });
    });

    it("deve apontar o data para o schema informado", () => {
      const schema = CommonResponse.getSwaggerSchema("#/components/schemas/User", "Usuário encontrado");

      expect(schema.properties.data).toEqual({ $ref: "#/components/schemas/User" });
      expect(schema.properties.message.example).toBe("Usuário encontrado");
    });
  });
});
