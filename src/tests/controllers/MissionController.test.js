import MissionController from "../../controllers/MissionController.js";
import MissionService from "../../service/MissionService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/MissionService.js");

describe("MissionController", () => {
  let req;
  let res;
  let controller;

  const MISSION_ID = "507f1f77bcf86cd799439021";
  const TURMA_ID = "507f1f77bcf86cd799439011";
  const USER_ID = "507f1f77bcf86cd799439002";

  const questoes = (total = 5) =>
    Array.from({ length: total }, (_, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" },
      correct_answer: "a",
    }));

  const quiz = (overrides = {}) => ({
    title: "Explorador de Palavras",
    type: "quiz",
    class_id: TURMA_ID,
    questions: questoes(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    MissionService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new MissionController();
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
      const paginado = { docs: [{ _id: MISSION_ID }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(paginado);

      await controller.list(req, res);

      expect(controller.service.list).toHaveBeenCalledWith(req);
      esperarResposta(200, "Requisição bem-sucedida", paginado);
    });

    it("deve entregar a requisição inteira ao service, que decide pelo id", async() => {
      controller.service.list.mockResolvedValue({ _id: MISSION_ID });
      req.params.id = MISSION_ID;

      await controller.list(req, res);

      expect(controller.service.list).toHaveBeenCalledWith(req);
      esperarResposta(200, "Requisição bem-sucedida", { _id: MISSION_ID });
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.list.mockRejectedValue(new Error("Erro inesperado"));

      await expect(controller.list(req, res)).rejects.toThrow("Erro inesperado");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    beforeEach(() => {
      controller.service.create.mockResolvedValue({ _id: MISSION_ID });
    });

    it("deve devolver 201 com a missão criada", async() => {
      req.body = quiz();

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith({ ...quiz(), xp_reward: 0 }, req);
      esperarResposta(201, "Recurso criado com sucesso", { _id: MISSION_ID });
    });

    it("deve assumir XP zero quando a recompensa não for informada", async() => {
      req.body = quiz();

      await controller.create(req, res);

      expect(controller.service.create.mock.calls[0][0].xp_reward).toBe(0);
    });

    it("deve rejeitar quando o título não for informado", async() => {
      req.body = quiz({ title: undefined });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Required");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o título vier vazio", async() => {
      req.body = quiz({ title: "" });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Título obrigatório.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a turma vier vazia", async() => {
      req.body = quiz({ class_id: "" });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("A turma alvo é obrigatória.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar tipo fora dos previstos", async() => {
      req.body = quiz({ type: "redacao" });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].path).toContain("type");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve exigir no mínimo cinco perguntas no quiz", async() => {
      req.body = quiz({ questions: questoes(4) });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Missões do tipo quiz precisam de no mínimo 5 perguntas.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve exigir conteúdo na missão de vocabulário", async() => {
      req.body = { title: "Animais", type: "vocabulary", class_id: TURMA_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe(
        "Missões do tipo vocabulário precisam de conteúdo (content).",
      );
    });

    it("deve exigir URL na missão de áudio", async() => {
      req.body = { title: "Escuta ativa", type: "audio", class_id: TURMA_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe(
        "Missões do tipo áudio precisam de uma URL (content_url).",
      );
    });

    it("deve rejeitar URL inválida na missão de áudio", async() => {
      req.body = { title: "Escuta ativa", type: "audio", class_id: TURMA_ID, content_url: "nao-e-url" };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("URL inválida.");
    });

    it("deve rejeitar gabarito fora das alternativas", async() => {
      req.body = quiz({ questions: questoes().map((q) => ({ ...q, correct_answer: "e" })) });

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].path).toContain("correct_answer");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      req.body = quiz({ createdBy: USER_ID, active: false });

      await controller.create(req, res);

      // Quem criou vem do token, e a missão nasce ativa.
      expect(controller.service.create.mock.calls[0][0]).not.toHaveProperty("createdBy");
      expect(controller.service.create.mock.calls[0][0]).not.toHaveProperty("active");
    });
  });

  describe("update", () => {
    beforeEach(() => {
      controller.service.update.mockResolvedValue({ _id: MISSION_ID, xp_reward: 150 });
      req.params.id = MISSION_ID;
    });

    it("deve devolver 200 com a missão atualizada", async() => {
      req.body = { xp_reward: 150 };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 150 }, req);
      esperarResposta(200, "Missão atualizada com sucesso.", { _id: MISSION_ID, xp_reward: 150 });
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.params = {};
      req.body = { xp_reward: 150 };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para atualizar.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve aceitar um corpo vazio", async() => {
      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, {}, req);
    });

    it("deve rejeitar título vazio", async() => {
      req.body = { title: "" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve rejeitar XP negativo", async() => {
      req.body = { xp_reward: -10 };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve permitir desativar a missão", async() => {
      req.body = { active: false };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, { active: false }, req);
    });

    it("deve descartar a tentativa de trocar o tipo da missão", async() => {
      req.body = { type: "audio", xp_reward: 150 };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 150 }, req);
    });
  });

  describe("progress", () => {
    const resultado = { mission: MISSION_ID, score: 80, xp_earned: 80 };

    beforeEach(() => {
      controller.service.submitProgress.mockResolvedValue(resultado);
      req.params.id = MISSION_ID;
    });

    it("deve devolver 200 com o progresso apurado", async() => {
      req.body = { answers: ["a", "b", "c", "d", "a"] };

      await controller.progress(req, res);

      expect(controller.service.submitProgress).toHaveBeenCalledWith(
        MISSION_ID,
        { answers: ["a", "b", "c", "d", "a"], done: true },
        req,
      );
      esperarResposta(200, "Progresso registrado com sucesso.", resultado);
    });

    it("deve assumir a missão como concluída quando done não for enviado", async() => {
      req.body = { score: 80 };

      await controller.progress(req, res);

      expect(controller.service.submitProgress).toHaveBeenCalledWith(
        MISSION_ID,
        { score: 80, done: true },
        req,
      );
    });

    it("deve respeitar done falso", async() => {
      req.body = { score: 40, done: false };

      await controller.progress(req, res);

      expect(controller.service.submitProgress.mock.calls[0][1].done).toBe(false);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.params = {};

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para registrar progresso.");
      expect(controller.service.submitProgress).not.toHaveBeenCalled();
    });

    it("deve rejeitar score acima de 100", async() => {
      req.body = { score: 101 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].message).toBe("O score máximo é 100.");
      expect(controller.service.submitProgress).not.toHaveBeenCalled();
    });

    it("deve rejeitar score negativo", async() => {
      req.body = { score: -1 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].message).toBe("O score mínimo é 0.");
    });

    it("deve rejeitar score quebrado", async() => {
      req.body = { score: 80.5 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].message).toBe("O score deve ser um número inteiro.");
    });

    it("deve rejeitar resposta fora das alternativas", async() => {
      req.body = { answers: ["a", "b", "c", "d", "e"] };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].path).toContain("answers");
      expect(controller.service.submitProgress).not.toHaveBeenCalled();
    });

    it("deve descartar a tentativa de informar o XP na mão", async() => {
      req.body = { score: 80, xp_earned: 9999 };

      await controller.progress(req, res);

      expect(controller.service.submitProgress.mock.calls[0][1]).not.toHaveProperty("xp_earned");
    });
  });

  describe("delete", () => {
    it("deve devolver 200 sem corpo de dados", async() => {
      controller.service.delete.mockResolvedValue(undefined);
      req.params.id = MISSION_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(MISSION_ID, req);
      esperarResposta(200, "Missão excluída com sucesso.", null);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para excluir.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });
});
