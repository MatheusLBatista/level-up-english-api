import AttitudeLogController from "../../controllers/AttitudeLogController.js";
import AttitudeLogService from "../../service/AttitudeLogService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/AttitudeLogService.js");

describe("AttitudeLogController", () => {
  let req;
  let res;
  let controller;

  const LOG_ID = "507f1f77bcf86cd799439031";
  const STUDENT_ID = "507f1f77bcf86cd799439004";
  const ATTITUDE_ID = "507f1f77bcf86cd799439021";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    AttitudeLogService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new AttitudeLogController();
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

  describe("list", () => {
    it("deve devolver 200 com o resultado da listagem", async() => {
      const paginado = { docs: [{ _id: LOG_ID }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(paginado);

      await controller.list(req, res);

      expect(controller.service.list).toHaveBeenCalledWith(req);
      esperarResposta(200, "Requisição bem-sucedida", paginado);
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.list.mockRejectedValue(new Error("Erro inesperado"));

      await expect(controller.list(req, res)).rejects.toThrow("Erro inesperado");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const corpo = { student: STUDENT_ID, attitude: ATTITUDE_ID };

    it("deve devolver 201 com o log e a progressão", async() => {
      const criado = { _id: LOG_ID, xp_applied: 10, progression: { leveled_up: true } };
      controller.service.create.mockResolvedValue(criado);
      req.body = { ...corpo };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(corpo, req);
      esperarResposta(201, "Recurso criado com sucesso", criado);
    });

    it("deve rejeitar quando o aluno não for informado", async() => {
      req.body = { attitude: ATTITUDE_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Required");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o aluno vier vazio", async() => {
      req.body = { ...corpo, student: "" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Aluno obrigatório.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a atitude vier vazia", async() => {
      req.body = { ...corpo, attitude: "" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Atitude obrigatória.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...corpo, xp_applied: 9999, teacher: STUDENT_ID };

      await controller.create(req, res);

      // O XP é calculado a partir da atitude, e quem aplicou vem do token.
      expect(controller.service.create).toHaveBeenCalledWith(corpo, req);
    });
  });

  describe("update", () => {
    it("deve devolver 200 com o log atualizado", async() => {
      const atualizado = { _id: LOG_ID, xp_applied: 25 };
      controller.service.update.mockResolvedValue(atualizado);
      req.params.id = LOG_ID;
      req.body = { attitude: ATTITUDE_ID };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(LOG_ID, { attitude: ATTITUDE_ID }, req);
      esperarResposta(200, "AttitudeLog updated successfully.", atualizado);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { attitude: ATTITUDE_ID };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("AttitudeLog ID is required.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve aceitar um corpo vazio", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = LOG_ID;

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(LOG_ID, {}, req);
    });

    it("deve rejeitar quando a atitude vier vazia", async() => {
      req.params.id = LOG_ID;
      req.body = { attitude: "" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve descartar a tentativa de fixar o xp na mão", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = LOG_ID;
      req.body = { attitude: ATTITUDE_ID, xp_applied: 9999 };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(LOG_ID, { attitude: ATTITUDE_ID }, req);
    });
  });

  describe("delete", () => {
    it("deve devolver 200 sem corpo de dados", async() => {
      controller.service.delete.mockResolvedValue(undefined);
      req.params.id = LOG_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(LOG_ID, req);
      esperarResposta(200, "AttitudeLog deleted successfully.", null);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("AttitudeLog ID is required.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });
});
