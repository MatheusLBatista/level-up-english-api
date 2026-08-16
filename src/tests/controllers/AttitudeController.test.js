import AttitudeController from "../../controllers/AttitudeController.js";
import AttitudeService from "../../service/AttitudeService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/AttitudeService.js");

describe("AttitudeController", () => {
  let req;
  let res;
  let controller;

  const ATTITUDE_ID = "507f1f77bcf86cd799439011";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    AttitudeService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new AttitudeController();
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
      const paginado = { docs: [{ name: "Participação" }], totalDocs: 1 };
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
    const nova = { name: "Participação", xp_value: 10, type: "positive" };

    it("deve devolver 201 com a atitude criada", async() => {
      const criada = { _id: ATTITUDE_ID, ...nova };
      controller.service.create.mockResolvedValue(criada);
      req.body = { ...nova };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(nova, req);
      esperarResposta(201, "Recurso criado com sucesso", criada);
    });

    it("deve repassar a descrição quando informada", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...nova, description: "Participou da aula toda." };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(req.body, req);
    });

    it("deve aceitar xp negativo", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { name: "Atraso", xp_value: -5, type: "negative" };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(req.body, req);
    });

    it("deve rejeitar quando o nome estiver vazio", async() => {
      req.body = { ...nova, name: "" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Nome obrigatório.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o xp não for inteiro", async() => {
      req.body = { ...nova, xp_value: 10.5 };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o xp não for enviado", async() => {
      req.body = { name: "Participação", type: "positive" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o tipo não for positive ou negative", async() => {
      req.body = { ...nova, type: "neutro" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...nova, active: false, createdBy: USER_ID };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(nova, req);
    });
  });

  describe("update", () => {
    it("deve devolver 200 com a atitude atualizada", async() => {
      const atualizada = { _id: ATTITUDE_ID, xp_value: 20 };
      controller.service.update.mockResolvedValue(atualizada);
      req.params.id = ATTITUDE_ID;
      req.body = { xp_value: 20 };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(ATTITUDE_ID, { xp_value: 20 });
      esperarResposta(200, "Attitude updated successfully.", atualizada);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { xp_value: 20 };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Attitude ID is required.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve aceitar um corpo vazio", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = ATTITUDE_ID;

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(ATTITUDE_ID, {});
    });

    it("deve permitir desativar a atitude", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = ATTITUDE_ID;
      req.body = { active: false };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(ATTITUDE_ID, { active: false });
    });

    it("deve rejeitar quando o nome vier vazio", async() => {
      req.params.id = ATTITUDE_ID;
      req.body = { name: "" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o tipo for inválido", async() => {
      req.params.id = ATTITUDE_ID;
      req.body = { type: "neutro" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve devolver 200 sem corpo de dados", async() => {
      controller.service.delete.mockResolvedValue({ _id: ATTITUDE_ID });
      req.params.id = ATTITUDE_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(ATTITUDE_ID);
      esperarResposta(200, "Attitude deleted successfully.", null);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Attitude ID is required.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });
});
