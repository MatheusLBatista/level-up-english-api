import XpAdjustmentController from "../../controllers/XpAdjustmentController.js";
import XpAdjustmentService from "../../service/XpAdjustmentService.js";

jest.mock("../../service/XpAdjustmentService.js");

describe("XpAdjustmentController", () => {
  let req;
  let res;
  let controller;

  const AJUSTE_ID = "507f1f77bcf86cd799439041";
  const STUDENT_ID = "507f1f77bcf86cd799439004";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    XpAdjustmentService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new XpAdjustmentController();
  });

  const esperarResposta = (status, message, data) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ message, data, errors: [] });
  };

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("create", () => {
    const corpo = { student: STUDENT_ID, amount: 50 };

    it("deve devolver 201 com o ajuste e a progressão", async() => {
      const criado = { _id: AJUSTE_ID, amount: 50, xp_applied: 50, progression: { leveled_up: true } };
      controller.service.create.mockResolvedValue(criado);
      req.body = { ...corpo };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(corpo, req);
      esperarResposta(201, "Recurso criado com sucesso", criado);
    });

    it("deve aceitar amount negativo para remover XP", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { student: STUDENT_ID, amount: -30 };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith({ student: STUDENT_ID, amount: -30 }, req);
    });

    it("deve repassar o motivo sem os espaços das pontas", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...corpo, reason: "  Ajudou na feira  " };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith({ ...corpo, reason: "Ajudou na feira" }, req);
    });

    it("deve aceitar os limites de ±10000", async() => {
      controller.service.create.mockResolvedValue({});

      req.body = { student: STUDENT_ID, amount: 10000 };
      await controller.create(req, res);
      req.body = { student: STUDENT_ID, amount: -10000 };
      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledTimes(2);
    });

    it("deve rejeitar amount igual a 0", async() => {
      req.body = { ...corpo, amount: 0 };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("A quantidade não pode ser zero.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar amount acima de 10000", async() => {
      req.body = { ...corpo, amount: 10001 };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("A quantidade máxima é 10000.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar amount abaixo de -10000", async() => {
      req.body = { ...corpo, amount: -10001 };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("A quantidade mínima é -10000.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar amount fracionado", async() => {
      req.body = { ...corpo, amount: 10.5 };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("A quantidade deve ser um número inteiro.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar amount enviado como texto", async() => {
      req.body = { ...corpo, amount: "50" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o amount não for informado", async() => {
      req.body = { student: STUDENT_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Quantidade obrigatória.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o aluno vier vazio", async() => {
      req.body = { ...corpo, student: "" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Aluno obrigatório.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar motivo com mais de 200 caracteres", async() => {
      req.body = { ...corpo, reason: "x".repeat(201) };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("O motivo deve ter no máximo 200 caracteres.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...corpo, xp_applied: 9999, teacher: STUDENT_ID };

      await controller.create(req, res);

      // O valor aplicado é calculado no service, e quem aplicou vem do token.
      expect(controller.service.create).toHaveBeenCalledWith(corpo, req);
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.create.mockRejectedValue(new Error("Erro inesperado"));
      req.body = { ...corpo };

      await expect(controller.create(req, res)).rejects.toThrow("Erro inesperado");
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
