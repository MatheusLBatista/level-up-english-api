jest.mock("../../repository/MissionRepository.js");
jest.mock("../../repository/UserRepository.js");
jest.mock("../../service/ProgressionService.js");
jest.mock("../../models/Class.js", () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));

import MissionService from "../../service/MissionService.js";
import MissionRepository from "../../repository/MissionRepository.js";
import UserRepository from "../../repository/UserRepository.js";
import ProgressionService from "../../service/ProgressionService.js";
import Class from "../../models/Class.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("MissionService", () => {
  let service;
  let repository;
  let userRepository;
  let progressionService;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_A_ID = "507f1f77bcf86cd799439002";
  const PROF_B_ID = "507f1f77bcf86cd799439003";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const TURMA_B_ID = "507f1f77bcf86cd799439012";
  const MISSION_ID = "507f1f77bcf86cd799439021";

  const PROGRESSION = { student: ALUNO_A_ID, previous_level: 1, leveled_up: false };

  let usuarios;

  const registrar = (usuario) => {
    usuarios.set(String(usuario._id), usuario);
    return usuario;
  };

  const questoes = (gabarito = ["a", "b", "c", "d", "a"]) =>
    gabarito.map((correct_answer, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" },
      correct_answer,
    }));

  const missao = (overrides = {}) => {
    const dados = {
      _id: MISSION_ID,
      title: "Explorador",
      type: "quiz",
      xp_reward: 100,
      class_id: TURMA_A_ID,
      createdBy: PROF_A_ID,
      active: true,
      questions: questoes(),
      ...overrides,
    };

    return { ...dados, toObject: () => ({ ...dados }) };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    usuarios = new Map();
    registrar({ _id: ADMIN_ID, role: "admin" });
    registrar({ _id: PROF_A_ID, role: "teacher" });
    registrar({ _id: PROF_B_ID, role: "teacher" });
    registrar({ _id: ALUNO_A_ID, role: "student", class: TURMA_A_ID });

    repository = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(missao()),
      findByTitle: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    userRepository = {
      findById: jest.fn(async(id) => {
        const encontrado = usuarios.get(String(id));
        if (!encontrado) throw new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
        return encontrado;
      }),
      findMissionProgress: jest.fn().mockResolvedValue(null),
      upsertMissionProgress: jest.fn(),
    };

    progressionService = { applyXp: jest.fn().mockResolvedValue(PROGRESSION) };

    MissionRepository.mockImplementation(() => repository);
    UserRepository.mockImplementation(() => userRepository);
    ProgressionService.mockImplementation(() => progressionService);

    Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_A_ID });
    Class.findByIdAndUpdate.mockResolvedValue({});

    service = new MissionService();
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("hideAnswers", () => {
    it("deve remover o gabarito de todas as questões", () => {
      const resultado = service.hideAnswers(missao());

      resultado.questions.forEach((questao) => {
        expect(questao).not.toHaveProperty("correct_answer");
        expect(questao.options).toBeDefined();
      });
    });

    it("deve devolver a missão intacta quando não houver questões", () => {
      const semQuestoes = missao({ type: "vocabulary", questions: undefined });

      expect(service.hideAnswers(semQuestoes).title).toBe("Explorador");
    });

    it("deve aceitar objeto simples, sem toObject", () => {
      const plain = { title: "Explorador", questions: questoes() };

      expect(service.hideAnswers(plain).questions[0]).not.toHaveProperty("correct_answer");
    });
  });

  describe("list", () => {
    it("deve listar tudo para a professora, com gabarito", async() => {
      const paginado = { docs: [missao()], totalDocs: 1 };
      repository.list.mockResolvedValue(paginado);

      const resultado = await service.list({ params: {}, query: {}, user_id: PROF_A_ID });

      expect(resultado).toBe(paginado);
      expect(resultado.docs[0].questions[0].correct_answer).toBe("a");
    });

    it("deve limitar o aluno às missões da turma dele", async() => {
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: {}, user_id: ALUNO_A_ID });

      expect(repository.list).toHaveBeenCalledWith({ query: { class_id: TURMA_A_ID } });
    });

    it("não deve deixar o aluno forçar outra turma pela querystring", async() => {
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: { class_id: TURMA_B_ID }, user_id: ALUNO_A_ID });

      expect(repository.list).toHaveBeenCalledWith({ query: { class_id: TURMA_A_ID } });
    });

    it("deve esconder o gabarito na listagem do aluno", async() => {
      repository.list.mockResolvedValue({ docs: [missao()], totalDocs: 1 });

      const resultado = await service.list({ params: {}, query: {}, user_id: ALUNO_A_ID });

      expect(resultado.docs[0].questions[0]).not.toHaveProperty("correct_answer");
      expect(resultado.totalDocs).toBe(1);
    });

    it("deve devolver lista vazia para o aluno sem turma", async() => {
      registrar({ _id: ALUNO_A_ID, role: "student" });

      const resultado = await service.list({ params: {}, query: {}, user_id: ALUNO_A_ID });

      expect(resultado).toEqual({ docs: [], totalDocs: 0, page: 1, totalPages: 0 });
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("deve buscar por id quando ele vier na rota", async() => {
      const resultado = await service.list({ params: { id: MISSION_ID }, user_id: PROF_A_ID });

      expect(repository.findById).toHaveBeenCalledWith(MISSION_ID);
      expect(resultado.title).toBe("Explorador");
    });
  });

  describe("findById", () => {
    it("deve entregar a missão com gabarito para a professora", async() => {
      const resultado = await service.findById(MISSION_ID, { user_id: PROF_A_ID });

      expect(resultado.questions[0].correct_answer).toBe("a");
    });

    it("deve esconder o gabarito do aluno", async() => {
      const resultado = await service.findById(MISSION_ID, { user_id: ALUNO_A_ID });

      expect(resultado.questions[0]).not.toHaveProperty("correct_answer");
    });

    it("deve lançar 403 quando a missão não for da turma do aluno", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      const erro = await capturarErro(service.findById(MISSION_ID, { user_id: ALUNO_A_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você não tem acesso a esta missão.");
    });

    it("deve reconhecer a turma mesmo vindo populada", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: { _id: TURMA_A_ID, name: "Turma A" } }));

      await expect(service.findById(MISSION_ID, { user_id: ALUNO_A_ID })).resolves.toBeDefined();
    });

    it("deve permitir que a professora veja missão de turma que não é dela", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      await expect(service.findById(MISSION_ID, { user_id: PROF_A_ID })).resolves.toBeDefined();
    });
  });

  describe("resolveScore", () => {
    it("deve exigir o score fora do quiz", () => {
      const vocabulario = missao({ type: "vocabulary", questions: undefined });

      expect(() => service.resolveScore(vocabulario, {})).toThrow(CustomError);
    });

    it("deve aceitar o score informado fora do quiz", () => {
      const vocabulario = missao({ type: "vocabulary", questions: undefined });

      expect(service.resolveScore(vocabulario, { score: 80 })).toEqual({
        score: 80,
        correct_answers: null,
        total_questions: null,
      });
    });

    it("deve aceitar score zero fora do quiz", () => {
      const audio = missao({ type: "audio", questions: undefined });

      expect(service.resolveScore(audio, { score: 0 }).score).toBe(0);
    });

    it("deve apurar o score do quiz pelo gabarito", () => {
      const resultado = service.resolveScore(missao(), { answers: ["a", "b", "c", "d", "a"] });

      expect(resultado).toEqual({ score: 100, correct_answers: 5, total_questions: 5 });
    });

    it("deve contar apenas os acertos", () => {
      const resultado = service.resolveScore(missao(), { answers: ["a", "b", "c", "a", "b"] });

      expect(resultado).toEqual({ score: 60, correct_answers: 3, total_questions: 5 });
    });

    it("deve arredondar o score do quiz", () => {
      const comTres = missao({ questions: questoes(["a", "b", "c"]) });

      // 2 de 3 = 66,67 → 67
      expect(service.resolveScore(comTres, { answers: ["a", "b", "d"] }).score).toBe(67);
    });

    it("deve ignorar o score enviado no corpo do quiz", () => {
      const resultado = service.resolveScore(missao(), {
        score: 100,
        answers: ["a", "b", "c", "d", "b"],
      });

      // O servidor corrige; o que o aluno diz sobre a própria nota não conta.
      expect(resultado.score).toBe(80);
    });

    it("deve lançar 400 quando o quiz não tiver questões", () => {
      const semQuestoes = missao({ questions: [] });

      const erro = capturarErroSync(() => service.resolveScore(semQuestoes, { answers: [] }));
      expect(erro.customMessage).toBe("Esta missão de quiz não possui questões cadastradas.");
    });

    it("deve lançar 400 quando o quiz nem tiver o campo de questões", () => {
      const semCampo = missao({ questions: undefined });

      const erro = capturarErroSync(() => service.resolveScore(semCampo, { answers: [] }));
      expect(erro.customMessage).toBe("Esta missão de quiz não possui questões cadastradas.");
    });

    it("deve lançar 400 quando faltarem respostas", () => {
      const erro = capturarErroSync(() => service.resolveScore(missao(), { answers: ["a", "b"] }));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Envie exatamente 5 respostas, na ordem das questões.");
    });

    it("deve lançar 400 quando não vierem respostas", () => {
      const erro = capturarErroSync(() => service.resolveScore(missao(), {}));

      expect(erro.customMessage).toBe("Envie exatamente 5 respostas, na ordem das questões.");
    });
  });

  describe("submitProgress", () => {
    const req = { user_id: ALUNO_A_ID };
    const todasCertas = { answers: ["a", "b", "c", "d", "a"], done: true };

    it("deve creditar o XP proporcional ao score", async() => {
      const resultado = await service.submitProgress(MISSION_ID, todasCertas, req);

      expect(resultado.score).toBe(100);
      expect(resultado.xp_earned).toBe(100);
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 100);
    });

    it("deve creditar proporcionalmente em acerto parcial", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { answers: ["a", "b", "c", "a", "b"], done: true },
        req,
      );

      // 60% de 100 de recompensa.
      expect(resultado.score).toBe(60);
      expect(resultado.xp_earned).toBe(60);
    });

    it("deve gravar o progresso do aluno", async() => {
      await service.submitProgress(MISSION_ID, todasCertas, req);

      const [studentId, missionId, dados] = userRepository.upsertMissionProgress.mock.calls[0];
      expect(studentId).toBe(ALUNO_A_ID);
      expect(missionId).toBe(MISSION_ID);
      expect(dados).toMatchObject({ done: true, score: 100, xp_earned: 100 });
      expect(dados.completed_at).toBeInstanceOf(Date);
    });

    it("não deve pagar XP quando a missão não for concluída", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { ...todasCertas, done: false },
        req,
      );

      expect(resultado.xp_earned).toBe(0);
      expect(resultado.progression).toBeNull();
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve pagar apenas a diferença quando o aluno melhora o desempenho", async() => {
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 60, completed_at: new Date() });

      const resultado = await service.submitProgress(MISSION_ID, todasCertas, req);

      expect(resultado.xp_earned).toBe(40);
      expect(resultado.credited_so_far).toBe(100);
      expect(resultado.already_rewarded).toBe(true);
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 40);
    });

    it("não deve pagar nada quando o aluno repete a missão com desempenho pior", async() => {
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 100, completed_at: new Date() });

      const resultado = await service.submitProgress(
        MISSION_ID,
        { answers: ["a", "b", "c", "a", "b"], done: true },
        req,
      );

      // Refazer não premia de novo, e o XP já pago não é retirado.
      expect(resultado.xp_earned).toBe(0);
      expect(resultado.credited_so_far).toBe(100);
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve preservar a data da primeira conclusão", async() => {
      const primeira = new Date("2026-01-01T00:00:00.000Z");
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 60, completed_at: primeira });

      await service.submitProgress(MISSION_ID, todasCertas, req);

      const [, , dados] = userRepository.upsertMissionProgress.mock.calls[0];
      expect(dados.completed_at).toBe(primeira);
    });

    it("não deve gravar xp_earned quando não houver XP a pagar", async() => {
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 100 });

      await service.submitProgress(MISSION_ID, todasCertas, req);

      const [, , dados] = userRepository.upsertMissionProgress.mock.calls[0];
      expect(dados).toEqual({ done: true, score: 100 });
    });

    it("deve devolver os acertos do quiz", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { answers: ["a", "b", "c", "d", "b"], done: true },
        req,
      );

      expect(resultado.correct_answers).toBe(4);
      expect(resultado.total_questions).toBe(5);
    });

    it("deve arredondar o XP proporcional", async() => {
      repository.findById.mockResolvedValue(missao({ xp_reward: 75 }));

      const resultado = await service.submitProgress(
        MISSION_ID,
        { answers: ["a", "b", "c", "a", "b"], done: true },
        req,
      );

      // 60% de 75 = 45.
      expect(resultado.xp_earned).toBe(45);
    });

    it("deve tratar missão sem recompensa cadastrada", async() => {
      repository.findById.mockResolvedValue(missao({ xp_reward: undefined }));

      const resultado = await service.submitProgress(MISSION_ID, todasCertas, req);

      expect(resultado.xp_earned).toBe(0);
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando a missão estiver inativa", async() => {
      repository.findById.mockResolvedValue(missao({ active: false }));

      const erro = await capturarErro(service.submitProgress(MISSION_ID, todasCertas, req));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta missão está inativa.");
      expect(userRepository.upsertMissionProgress).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a missão não for da turma do aluno", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      const erro = await capturarErro(service.submitProgress(MISSION_ID, todasCertas, req));

      expect(erro.statusCode).toBe(403);
      expect(userRepository.upsertMissionProgress).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const nova = { title: "Nova Missão", type: "vocabulary", content: "texto", class_id: TURMA_A_ID };

    beforeEach(() => {
      repository.create.mockResolvedValue({ _id: MISSION_ID, ...nova });
    });

    it("deve registrar quem criou a missão", async() => {
      await service.create({ ...nova }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalledWith({ ...nova, createdBy: PROF_A_ID });
    });

    it("deve anexar a missão à turma", async() => {
      await service.create({ ...nova }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenCalledWith(TURMA_A_ID, {
        $addToSet: { missions: MISSION_ID },
      });
    });

    it("deve lançar 404 quando a turma não existir", async() => {
      Class.findById.mockResolvedValue(null);

      const erro = await capturarErro(service.create({ ...nova }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Turma não encontrada.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a professora não for dona da turma", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      const erro = await capturarErro(service.create({ ...nova }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode criar missões nas suas turmas.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve reconhecer a dona da turma mesmo vindo populada", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: { _id: PROF_A_ID } });

      await service.create({ ...nova }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalled();
    });

    it("deve permitir que o admin crie missão em qualquer turma", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      await service.create({ ...nova }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: ADMIN_ID }));
    });

    it("deve lançar 400 quando o título já existir", async() => {
      repository.findByTitle.mockResolvedValue({ _id: "outra" });

      const erro = await capturarErro(service.create({ ...nova }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Título já cadastrado.");
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    beforeEach(() => {
      repository.update.mockResolvedValue({ _id: MISSION_ID });
    });

    it("deve permitir que a autora atualize a missão", async() => {
      await service.update(MISSION_ID, { xp_reward: 200 }, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 200 });
    });

    it("deve lançar 403 quando a professora não criou a missão", async() => {
      const erro = await capturarErro(
        service.update(MISSION_ID, { xp_reward: 200 }, { user_id: PROF_B_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode editar missões que criou.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve reconhecer a autora mesmo vindo populada", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: { _id: PROF_A_ID, name: "Professora A" } }));

      await service.update(MISSION_ID, { xp_reward: 200 }, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalled();
    });

    it("deve permitir que o admin atualize missão de qualquer professora", async() => {
      await service.update(MISSION_ID, { xp_reward: 200 }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalled();
    });

    it("deve ignorar a própria missão ao conferir o título", async() => {
      await service.update(MISSION_ID, { title: "Explorador" }, { user_id: PROF_A_ID });

      expect(repository.findByTitle).toHaveBeenCalledWith("Explorador", MISSION_ID);
    });

    it("deve lançar 400 quando o título novo já for de outra missão", async() => {
      repository.findByTitle.mockResolvedValue({ _id: "outra" });

      const erro = await capturarErro(
        service.update(MISSION_ID, { title: "Outra" }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("não deve conferir o título quando ele não for alterado", async() => {
      await service.update(MISSION_ID, { xp_reward: 200 }, { user_id: PROF_A_ID });

      expect(repository.findByTitle).not.toHaveBeenCalled();
    });

    it("deve mover a referência da missão ao trocar de turma", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_B_ID, teacher: PROF_A_ID });

      await service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenNthCalledWith(1, TURMA_A_ID, {
        $pull: { missions: MISSION_ID },
      });
      expect(Class.findByIdAndUpdate).toHaveBeenNthCalledWith(2, TURMA_B_ID, {
        $addToSet: { missions: MISSION_ID },
      });
    });

    it("não deve mexer nas turmas quando a turma informada for a mesma", async() => {
      await service.update(MISSION_ID, { class_id: TURMA_A_ID }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("deve lançar 403 ao mover a missão para turma de outra professora", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_B_ID, teacher: PROF_B_ID });

      const erro = await capturarErro(
        service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 404 quando a turma alvo não existir", async() => {
      Class.findById.mockResolvedValue(null);

      const erro = await capturarErro(
        service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(404);
    });
  });

  describe("delete", () => {
    it("deve remover a missão e a referência na turma", async() => {
      repository.delete.mockResolvedValue({ _id: MISSION_ID });

      await service.delete(MISSION_ID, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenCalledWith(TURMA_A_ID, {
        $pull: { missions: MISSION_ID },
      });
      expect(repository.delete).toHaveBeenCalledWith(MISSION_ID);
    });

    it("deve lançar 403 quando a professora não criou a missão", async() => {
      const erro = await capturarErro(service.delete(MISSION_ID, { user_id: PROF_B_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode excluir missões que criou.");
      expect(repository.delete).not.toHaveBeenCalled();
      expect(Class.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin exclua missão de qualquer professora", async() => {
      repository.delete.mockResolvedValue({ _id: MISSION_ID });

      await service.delete(MISSION_ID, { user_id: ADMIN_ID });

      expect(repository.delete).toHaveBeenCalledWith(MISSION_ID);
    });
  });
});

/** Captura o erro de uma chamada síncrona, como o resolveScore. */
function capturarErroSync(fn) {
  try {
    fn();
  } catch (erro) {
    return erro;
  }

  throw new Error("Esperava que a chamada lançasse um erro, mas ela retornou.");
}
