import MissionController from "../../controllers/MissionController.js";
import MissionService from "../../service/MissionService.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../service/MissionService.js");

describe("MissionController", () => {
  let req;
  let res;
  let controller;

  const MISSION_ID = "507f1f77bcf86cd799439021";
  const CLASS_ID = "507f1f77bcf86cd799439011";
  const USER_ID = "507f1f77bcf86cd799439002";

  const questoes = (total = 5) =>
    Array.from({ length: total }, (_, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" },
      correct_answer: "a",
    }));

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
      const paginado = { docs: [{ title: "Explorador" }], totalDocs: 1 };
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
    const quiz = { title: "Quiz", type: "quiz", class_id: CLASS_ID, questions: questoes() };
    const vocabulario = { title: "Vocabulário", type: "vocabulary", class_id: CLASS_ID, content: "texto" };
    const audio = {
      title: "Áudio",
      type: "audio",
      class_id: CLASS_ID,
      content_url: "https://exemplo.com/audio.mp3",
    };

    it("deve devolver 201 com a missão criada", async() => {
      const criada = { _id: MISSION_ID, ...vocabulario };
      controller.service.create.mockResolvedValue(criada);
      req.body = { ...vocabulario };

      await controller.create(req, res);

      esperarResposta(201, "Recurso criado com sucesso", criada);
    });

    it("deve aplicar zero como recompensa padrão", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...vocabulario };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(
        expect.objectContaining({ xp_reward: 0 }),
        req,
      );
    });

    it("deve aceitar quiz com cinco questões", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...quiz };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalled();
    });

    it("deve aceitar missão de áudio com URL", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...audio };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalled();
    });

    it("deve rejeitar quiz com menos de cinco questões", async() => {
      req.body = { ...quiz, questions: questoes(4) };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Missões do tipo quiz precisam de no mínimo 5 perguntas.");
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quiz sem questões", async() => {
      req.body = { title: "Quiz", type: "quiz", class_id: CLASS_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].path).toEqual(["questions"]);
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar vocabulário sem conteúdo", async() => {
      req.body = { title: "Vocabulário", type: "vocabulary", class_id: CLASS_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Missões do tipo vocabulário precisam de conteúdo (content).");
    });

    it("deve rejeitar vocabulário com conteúdo em branco", async() => {
      req.body = { ...vocabulario, content: "   " };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar áudio sem URL", async() => {
      req.body = { title: "Áudio", type: "audio", class_id: CLASS_ID };

      const erro = await capturarErro(controller.create(req, res));

      expect(erro.errors[0].message).toBe("Missões do tipo áudio precisam de uma URL (content_url).");
    });

    it("deve rejeitar URL malformada", async() => {
      req.body = { ...audio, content_url: "nao-e-url" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar tipo fora dos previstos", async() => {
      req.body = { ...vocabulario, type: "leitura" };

      await expect(controller.create(req, res)).rejects.toThrow();
    });

    it("deve rejeitar missão sem turma", async() => {
      req.body = { title: "Sem turma", type: "vocabulary", content: "texto" };

      await expect(controller.create(req, res)).rejects.toThrow();
    });

    it("deve rejeitar recompensa negativa", async() => {
      req.body = { ...vocabulario, xp_reward: -10 };

      await expect(controller.create(req, res)).rejects.toThrow();
    });

    it("deve rejeitar gabarito fora das alternativas", async() => {
      req.body = {
        ...quiz,
        questions: [...questoes(4), { ...questoes(1)[0], correct_answer: "e" }],
      };

      await expect(controller.create(req, res)).rejects.toThrow();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue({});
      req.body = { ...vocabulario, active: false, createdBy: USER_ID };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(
        { ...vocabulario, xp_reward: 0 },
        req,
      );
    });
  });

  describe("progress", () => {
    it("deve devolver 200 com o progresso registrado", async() => {
      const progresso = { mission: MISSION_ID, score: 80, xp_earned: 80 };
      controller.service.submitProgress.mockResolvedValue(progresso);
      req.params.id = MISSION_ID;
      req.body = { answers: ["a", "b", "c", "d", "a"] };

      await controller.progress(req, res);

      expect(controller.service.submitProgress).toHaveBeenCalledWith(
        MISSION_ID,
        { answers: ["a", "b", "c", "d", "a"], done: true },
        req,
      );
      esperarResposta(200, "Progresso registrado com sucesso.", progresso);
    });

    it("deve considerar a missão concluída por padrão", async() => {
      controller.service.submitProgress.mockResolvedValue({});
      req.params.id = MISSION_ID;
      req.body = { score: 70 };

      await controller.progress(req, res);

      expect(controller.service.submitProgress).toHaveBeenCalledWith(
        MISSION_ID,
        { score: 70, done: true },
        req,
      );
    });

    it("deve aceitar submissão marcada como não concluída", async() => {
      controller.service.submitProgress.mockResolvedValue({});
      req.params.id = MISSION_ID;
      req.body = { score: 20, done: false };

      await controller.progress(req, res);

      expect(controller.service.submitProgress).toHaveBeenCalledWith(
        MISSION_ID,
        { score: 20, done: false },
        req,
      );
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { score: 80 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para registrar progresso.");
      expect(controller.service.submitProgress).not.toHaveBeenCalled();
    });

    it("deve rejeitar score acima de 100", async() => {
      req.params.id = MISSION_ID;
      req.body = { score: 120 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].message).toBe("O score máximo é 100.");
    });

    it("deve rejeitar score negativo", async() => {
      req.params.id = MISSION_ID;
      req.body = { score: -1 };

      const erro = await capturarErro(controller.progress(req, res));

      expect(erro.errors[0].message).toBe("O score mínimo é 0.");
    });

    it("deve rejeitar score fracionado", async() => {
      req.params.id = MISSION_ID;
      req.body = { score: 80.5 };

      await expect(controller.progress(req, res)).rejects.toThrow();
    });

    it("deve rejeitar resposta fora das alternativas", async() => {
      req.params.id = MISSION_ID;
      req.body = { answers: ["a", "b", "c", "d", "e"] };

      await expect(controller.progress(req, res)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("deve devolver 200 com a missão atualizada", async() => {
      const atualizada = { _id: MISSION_ID, xp_reward: 200 };
      controller.service.update.mockResolvedValue(atualizada);
      req.params.id = MISSION_ID;
      req.body = { xp_reward: 200 };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 200 }, req);
      esperarResposta(200, "Missão atualizada com sucesso.", atualizada);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { xp_reward: 200 };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para atualizar.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve aceitar um corpo vazio", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = MISSION_ID;

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, {}, req);
    });

    it("deve descartar a tentativa de trocar o tipo da missão", async() => {
      controller.service.update.mockResolvedValue({});
      req.params.id = MISSION_ID;
      req.body = { xp_reward: 150, type: "audio" };

      await controller.update(req, res);

      // O tipo define o formato da missão; trocar depois deixaria o conteúdo órfão.
      expect(controller.service.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 150 }, req);
    });

    it("deve rejeitar recompensa negativa", async() => {
      req.params.id = MISSION_ID;
      req.body = { xp_reward: -1 };

      await expect(controller.update(req, res)).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("deve devolver 200 sem corpo de dados", async() => {
      controller.service.delete.mockResolvedValue({ _id: MISSION_ID });
      req.params.id = MISSION_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(MISSION_ID, req);
      esperarResposta(200, "Missão excluída com sucesso.", null);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("ID da missão é obrigatório para excluir.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });
});
