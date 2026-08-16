import ClassController from "../../controllers/ClassController.js";
import ClassService from "../../service/ClassService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/ClassService.js");

describe("ClassController", () => {
  let req;
  let res;
  let controller;

  const CLASS_ID = "507f1f77bcf86cd799439011";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    ClassService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new ClassController();
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
      const paginado = { docs: [{ name: "Turma A" }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(paginado);

      await controller.list(req, res);

      // A requisição inteira vai ao service: é ele que decide entre listar e
      // buscar por id, e precisa do user_id para julgar a permissão.
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
    it("deve devolver 201 com a turma criada", async() => {
      const criada = { _id: CLASS_ID, name: "Turma A" };
      controller.service.create.mockResolvedValue(criada);
      req.body = { name: "Turma A" };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith({ name: "Turma A" }, req);
      esperarResposta(201, "Recurso criado com sucesso", criada);
    });

    it("deve repassar professora, alunos e missões quando informados", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = {
        name: "Turma A",
        active: true,
        teacher: USER_ID,
        students: [USER_ID],
        missions: [CLASS_ID],
      };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(req.body, req);
    });

    it("deve rejeitar quando o nome estiver vazio", async() => {
      req.body = { name: "" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("O nome da turma é obrigatório.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o nome não for enviado", async() => {
      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a lista de alunos não for de textos", async() => {
      req.body = { name: "Turma A", students: [123] };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { name: "Turma A", _id: CLASS_ID, createdAt: "2026-01-01T00:00:00.000Z" };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith({ name: "Turma A" }, req);
    });
  });

  describe("update", () => {
    it("deve devolver 200 com a turma atualizada", async() => {
      const atualizada = { _id: CLASS_ID, name: "Turma Renomeada" };
      controller.service.update.mockResolvedValue(atualizada);
      req.params.id = CLASS_ID;
      req.body = { name: "Turma Renomeada" };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(CLASS_ID, { name: "Turma Renomeada" }, req);
      esperarResposta(200, "Class updated successfully.", atualizada);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { name: "Turma Renomeada" };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Class ID is required.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve aceitar um corpo vazio", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = CLASS_ID;

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(CLASS_ID, {}, req);
    });

    it("deve rejeitar quando o nome vier vazio", async() => {
      req.params.id = CLASS_ID;
      req.body = { name: "" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando active não for booleano", async() => {
      req.params.id = CLASS_ID;
      req.body = { active: "sim" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve devolver 200 sem corpo de dados", async() => {
      controller.service.delete.mockResolvedValue(null);
      req.params.id = CLASS_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(CLASS_ID, req);
      esperarResposta(200, "Class deleted successfully.", null);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Class ID is required.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });
});
