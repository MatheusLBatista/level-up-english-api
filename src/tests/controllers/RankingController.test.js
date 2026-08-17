import RankingController from "../../controllers/RankingController.js";
import RankingService from "../../service/RankingService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/RankingService.js");

describe("RankingController", () => {
  let req;
  let res;
  let controller;

  const TURMA_ID = "507f1f77bcf86cd799439011";
  const ALUNO_ID = "507f1f77bcf86cd799439004";

  beforeEach(() => {
    jest.clearAllMocks();
    RankingService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: ALUNO_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new RankingController();
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

  describe("global", () => {
    it("deve devolver 200 com o ranking global", async() => {
      const ranking = { type: "global", entries: [{ user: ALUNO_ID, xp: 100 }] };
      controller.service.getGlobal.mockResolvedValue(ranking);

      await controller.global(req, res);

      expect(controller.service.getGlobal).toHaveBeenCalledTimes(1);
      esperarResposta(200, "Requisição bem-sucedida", ranking);
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.getGlobal.mockRejectedValue(new Error("Erro inesperado"));

      await expect(controller.global(req, res)).rejects.toThrow("Erro inesperado");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("myClass", () => {
    it("deve devolver 200 com o ranking da turma do usuário logado", async() => {
      const ranking = { type: "class", class: TURMA_ID };
      controller.service.getMyClass.mockResolvedValue(ranking);

      await controller.myClass(req, res);

      expect(controller.service.getMyClass).toHaveBeenCalledWith(req);
      esperarResposta(200, "Requisição bem-sucedida", ranking);
    });

    it("deve propagar o 404 de quem não tem turma", async() => {
      controller.service.getMyClass.mockRejectedValue(
        new CustomError({
          statusCode: 404,
          errorType: "resourceNotFound",
          customMessage: "Você não está matriculado em nenhuma turma.",
        }),
      );

      const erro = await capturarErro(controller.myClass(req, res));

      expect(erro.statusCode).toBe(404);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("byClass", () => {
    it("deve devolver 200 com o ranking da turma pedida", async() => {
      const ranking = { type: "class", class: TURMA_ID };
      controller.service.getByClass.mockResolvedValue(ranking);
      req.params.classId = TURMA_ID;

      await controller.byClass(req, res);

      expect(controller.service.getByClass).toHaveBeenCalledWith(TURMA_ID, req);
      esperarResposta(200, "Requisição bem-sucedida", ranking);
    });

    it("deve lançar 400 quando a turma não vier na rota", async() => {
      const erro = await capturarErro(controller.byClass(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da turma é obrigatório para consultar o ranking.");
      expect(controller.service.getByClass).not.toHaveBeenCalled();
    });

    it("deve propagar o 403 de turma alheia", async() => {
      controller.service.getByClass.mockRejectedValue(
        new CustomError({
          statusCode: 403,
          errorType: "permissionError",
          customMessage: "Você só pode ver o ranking da sua própria turma.",
        }),
      );
      req.params.classId = TURMA_ID;

      const erro = await capturarErro(controller.byClass(req, res));

      expect(erro.statusCode).toBe(403);
    });
  });

  describe("refresh", () => {
    it("deve devolver 200 com os rankings recalculados", async() => {
      const resultado = { global: { type: "global" }, classes: [{ type: "class" }] };
      controller.service.refreshFromUsers.mockResolvedValue(resultado);

      await controller.refresh(req, res);

      expect(controller.service.refreshFromUsers).toHaveBeenCalledTimes(1);
      esperarResposta(200, "Rankings recalculados com sucesso.", resultado);
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.refreshFromUsers.mockRejectedValue(new Error("Falha no recálculo"));

      await expect(controller.refresh(req, res)).rejects.toThrow("Falha no recálculo");
    });
  });
});
