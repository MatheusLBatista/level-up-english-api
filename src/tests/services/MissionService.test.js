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
  const SEM_TURMA_ID = "507f1f77bcf86cd799439005";
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

  const questoesCertas = () => ["a", "b", "c", "d", "a"];

  const missao = (overrides = {}) => ({
    _id: MISSION_ID,
    title: "Explorador de Palavras",
    type: "quiz",
    xp_reward: 100,
    class_id: TURMA_A_ID,
    createdBy: PROF_A_ID,
    active: true,
    questions: questoes(),
    toObject() {
      const { toObject, ...resto } = this;
      return resto;
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    usuarios = new Map();
    registrar({ _id: ADMIN_ID, role: "admin" });
    registrar({ _id: PROF_A_ID, role: "teacher" });
    registrar({ _id: PROF_B_ID, role: "teacher" });
    registrar({ _id: ALUNO_A_ID, role: "student", class: TURMA_A_ID });
    registrar({ _id: SEM_TURMA_ID, role: "student" });

    repository = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue(missao()),
      findByTitle: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(missao()),
      update: jest.fn().mockResolvedValue(missao()),
      delete: jest.fn().mockResolvedValue(missao()),
    };

    userRepository = {
      findById: jest.fn(async(id) => {
        const encontrado = usuarios.get(String(id));
        if (!encontrado) throw new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
        return encontrado;
      }),
      findMissionProgress: jest.fn().mockResolvedValue(null),
      upsertMissionProgress: jest.fn().mockResolvedValue({}),
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

  describe("list", () => {
    beforeEach(() => {
      repository.list.mockResolvedValue({ docs: [missao()], totalDocs: 1, page: 1, totalPages: 1 });
    });

    it("deve repassar a query original quando quem lista não é aluno", async() => {
      const req = { params: {}, query: { type: "quiz" }, user_id: PROF_A_ID };

      const resultado = await service.list(req);

      expect(repository.list).toHaveBeenCalledWith({ query: { type: "quiz" } });
      expect(resultado.docs[0].questions[0].correct_answer).toBe("a");
    });

    it("deve prender a listagem do aluno à turma dele", async() => {
      await service.list({ params: {}, query: { type: "quiz" }, user_id: ALUNO_A_ID });

      expect(repository.list).toHaveBeenCalledWith({
        query: { type: "quiz", class_id: TURMA_A_ID },
      });
    });

    it("deve sobrescrever a turma que o aluno tentar forçar na query", async() => {
      await service.list({ params: {}, query: { class_id: TURMA_B_ID }, user_id: ALUNO_A_ID });

      expect(repository.list).toHaveBeenCalledWith({ query: { class_id: TURMA_A_ID } });
    });

    it("deve esconder o gabarito das missões listadas para o aluno", async() => {
      const resultado = await service.list({ params: {}, query: {}, user_id: ALUNO_A_ID });

      expect(resultado.docs[0].questions).toHaveLength(5);
      expect(resultado.docs[0].questions[0]).not.toHaveProperty("correct_answer");
      expect(resultado.docs[0].questions[0].question).toBe("Pergunta 1");
    });

    it("deve devolver lista vazia quando o aluno não tem turma", async() => {
      const resultado = await service.list({ params: {}, query: {}, user_id: SEM_TURMA_ID });

      expect(resultado).toEqual({ docs: [], totalDocs: 0, page: 1, totalPages: 0 });
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("deve buscar por id quando ele vier na rota", async() => {
      const resultado = await service.list({ params: { id: MISSION_ID }, user_id: PROF_A_ID });

      expect(repository.findById).toHaveBeenCalledWith(MISSION_ID);
      expect(repository.list).not.toHaveBeenCalled();
      expect(resultado.title).toBe("Explorador de Palavras");
    });
  });

  describe("findById", () => {
    it("deve devolver a missão inteira para a professora", async() => {
      const resultado = await service.findById(MISSION_ID, { user_id: PROF_A_ID });

      expect(resultado.questions[0].correct_answer).toBe("a");
    });

    it("deve esconder o gabarito para o aluno da turma", async() => {
      const resultado = await service.findById(MISSION_ID, { user_id: ALUNO_A_ID });

      expect(resultado.questions[0]).not.toHaveProperty("correct_answer");
    });

    it("deve lançar 403 quando o aluno for de outra turma", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      const erro = await capturarErro(service.findById(MISSION_ID, { user_id: ALUNO_A_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você não tem acesso a esta missão.");
    });

    it("deve reconhecer a turma do aluno mesmo vindo populada", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: { _id: TURMA_A_ID, name: "Turma A" } }));

      await expect(service.findById(MISSION_ID, { user_id: ALUNO_A_ID })).resolves.toBeDefined();
    });

    it("deve permitir que a professora veja missão de qualquer turma", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      await expect(service.findById(MISSION_ID, { user_id: PROF_B_ID })).resolves.toBeDefined();
    });
  });

  describe("hideAnswers", () => {
    it("deve devolver a missão sem alterações quando não houver questões", () => {
      const semQuestoes = missao({ type: "vocabulary", questions: undefined });

      const resultado = service.hideAnswers(semQuestoes);

      expect(resultado.title).toBe("Explorador de Palavras");
      expect(resultado.questions).toBeUndefined();
    });

    it("deve aceitar objeto simples, sem toObject", () => {
      const resultado = service.hideAnswers({ title: "Sem mongoose", questions: questoes() });

      expect(resultado.questions[0]).not.toHaveProperty("correct_answer");
    });

    it("não deve alterar o documento original", () => {
      const original = missao();

      service.hideAnswers(original);

      expect(original.questions[0].correct_answer).toBe("a");
    });
  });

  describe("create", () => {
    const corpo = { title: "Explorador de Palavras", type: "quiz", class_id: TURMA_A_ID };

    it("deve registrar quem criou a missão", async() => {
      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalledWith({ ...corpo, createdBy: PROF_A_ID });
    });

    it("deve vincular a missão à turma", async() => {
      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenCalledWith(TURMA_A_ID, {
        $addToSet: { missions: MISSION_ID },
      });
    });

    it("deve lançar 404 quando a turma não existir", async() => {
      Class.findById.mockResolvedValue(null);

      const erro = await capturarErro(service.create({ ...corpo }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Turma não encontrada.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a turma não for da professora", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      const erro = await capturarErro(service.create({ ...corpo }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode criar missões nas suas turmas.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve reconhecer a dona da turma mesmo vindo populada", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: { _id: PROF_A_ID } });

      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalled();
    });

    it("deve permitir que o admin crie missão em qualquer turma", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      await service.create({ ...corpo }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: ADMIN_ID }));
    });

    it("deve lançar 400 quando o título já existir", async() => {
      repository.findByTitle.mockResolvedValue(missao());

      const erro = await capturarErro(service.create({ ...corpo }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Título já cadastrado.");
      expect(repository.create).not.toHaveBeenCalled();
      expect(Class.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("deve devolver a missão atualizada pelo repositório", async() => {
      const atualizada = missao({ xp_reward: 150 });
      repository.update.mockResolvedValue(atualizada);

      const resultado = await service.update(MISSION_ID, { xp_reward: 150 }, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalledWith(MISSION_ID, { xp_reward: 150 });
      expect(resultado).toBe(atualizada);
    });

    it("deve lançar 403 quando a professora não criou a missão", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: PROF_B_ID }));

      const erro = await capturarErro(
        service.update(MISSION_ID, { xp_reward: 150 }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode editar missões que criou.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve reconhecer a autora mesmo vindo populada", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: { _id: PROF_A_ID, name: "Professora A" } }));

      await service.update(MISSION_ID, { xp_reward: 150 }, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalled();
    });

    it("deve permitir que o admin edite missão de qualquer professora", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: PROF_B_ID }));

      await service.update(MISSION_ID, { xp_reward: 150 }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalled();
    });

    it("deve ignorar a própria missão ao checar o título repetido", async() => {
      await service.update(MISSION_ID, { title: "Outro Título" }, { user_id: PROF_A_ID });

      expect(repository.findByTitle).toHaveBeenCalledWith("Outro Título", MISSION_ID);
    });

    it("deve lançar 400 quando o novo título já for de outra missão", async() => {
      repository.findByTitle.mockResolvedValue(missao({ _id: "507f1f77bcf86cd799439022" }));

      const erro = await capturarErro(
        service.update(MISSION_ID, { title: "Outro Título" }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("não deve checar título quando ele não for enviado", async() => {
      await service.update(MISSION_ID, { xp_reward: 150 }, { user_id: PROF_A_ID });

      expect(repository.findByTitle).not.toHaveBeenCalled();
    });

    it("deve mover a missão entre as turmas ao trocar de turma", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_B_ID, teacher: PROF_A_ID });

      await service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenNthCalledWith(1, TURMA_A_ID, {
        $pull: { missions: MISSION_ID },
      });
      expect(Class.findByIdAndUpdate).toHaveBeenNthCalledWith(2, TURMA_B_ID, {
        $addToSet: { missions: MISSION_ID },
      });
    });

    it("não deve mexer nas turmas quando a turma enviada for a mesma", async() => {
      await service.update(MISSION_ID, { class_id: TURMA_A_ID }, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
    });

    it("deve lançar 404 quando a turma de destino não existir", async() => {
      Class.findById.mockResolvedValue(null);

      const erro = await capturarErro(
        service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(404);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a turma de destino não for da professora", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_B_ID, teacher: PROF_B_ID });

      const erro = await capturarErro(
        service.update(MISSION_ID, { class_id: TURMA_B_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode criar missões nas suas turmas.");
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve desvincular a missão da turma antes de excluir", async() => {
      await service.delete(MISSION_ID, { user_id: PROF_A_ID });

      expect(Class.findByIdAndUpdate).toHaveBeenCalledWith(TURMA_A_ID, {
        $pull: { missions: MISSION_ID },
      });
      expect(repository.delete).toHaveBeenCalledWith(MISSION_ID);
    });

    it("deve lançar 403 quando a professora não criou a missão", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: PROF_B_ID }));

      const erro = await capturarErro(service.delete(MISSION_ID, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode excluir missões que criou.");
      expect(repository.delete).not.toHaveBeenCalled();
      expect(Class.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin exclua missão de qualquer professora", async() => {
      repository.findById.mockResolvedValue(missao({ createdBy: PROF_B_ID }));

      await service.delete(MISSION_ID, { user_id: ADMIN_ID });

      expect(repository.delete).toHaveBeenCalledWith(MISSION_ID);
    });

    it("deve propagar o 404 do repositório", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound" }),
      );

      const erro = await capturarErro(service.delete(MISSION_ID, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe("submitProgress", () => {
    const req = { user_id: ALUNO_A_ID };

    it("deve apurar o score do quiz pelo gabarito", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: true, answers: ["a", "b", "c", "d", "b"] },
        req,
      );

      expect(resultado).toMatchObject({
        mission: MISSION_ID,
        student: ALUNO_A_ID,
        done: true,
        score: 80,
        correct_answers: 4,
        total_questions: 5,
      });
    });

    it("deve creditar o XP proporcional ao score", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: true, answers: ["a", "b", "c", "d", "b"] },
        req,
      );

      expect(resultado.xp_earned).toBe(80);
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 80);
      expect(resultado.progression).toBe(PROGRESSION);
    });

    it("deve gravar o progresso do aluno na missão", async() => {
      await service.submitProgress(MISSION_ID, { done: true, answers: questoesCertas() }, req);

      expect(userRepository.upsertMissionProgress).toHaveBeenCalledWith(
        ALUNO_A_ID,
        MISSION_ID,
        expect.objectContaining({ done: true, score: 100, xp_earned: 100 }),
      );
    });

    it("deve creditar só a diferença quando o aluno refizer a missão melhor", async() => {
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 80, completed_at: new Date() });

      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: true, answers: questoesCertas() },
        req,
      );

      expect(resultado.xp_earned).toBe(20);
      expect(resultado.credited_so_far).toBe(100);
      expect(resultado.already_rewarded).toBe(true);
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 20);
    });

    it("não deve estornar XP quando o aluno refizer a missão pior", async() => {
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 100 });

      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: true, answers: ["a", "b", "c", "d", "b"] },
        req,
      );

      expect(resultado.xp_earned).toBe(0);
      expect(resultado.credited_so_far).toBe(100);
      expect(resultado.progression).toBeNull();
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve manter a data da primeira conclusão ao refazer a missão", async() => {
      const primeiraVez = new Date("2026-01-01T10:00:00.000Z");
      userRepository.findMissionProgress.mockResolvedValue({ xp_earned: 80, completed_at: primeiraVez });

      await service.submitProgress(MISSION_ID, { done: true, answers: questoesCertas() }, req);

      expect(userRepository.upsertMissionProgress).toHaveBeenCalledWith(
        ALUNO_A_ID,
        MISSION_ID,
        expect.objectContaining({ completed_at: primeiraVez }),
      );
    });

    it("não deve creditar XP quando a missão não for marcada como concluída", async() => {
      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: false, answers: questoesCertas() },
        req,
      );

      expect(resultado.xp_earned).toBe(0);
      expect(resultado.score).toBe(100);
      expect(userRepository.upsertMissionProgress).toHaveBeenCalledWith(ALUNO_A_ID, MISSION_ID, {
        done: false,
        score: 100,
      });
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve usar o score enviado em missões que não são quiz", async() => {
      repository.findById.mockResolvedValue(
        missao({ type: "vocabulary", questions: undefined, content: "The cat..." }),
      );

      const resultado = await service.submitProgress(MISSION_ID, { done: true, score: 50 }, req);

      expect(resultado).toMatchObject({
        score: 50,
        correct_answers: null,
        total_questions: null,
        xp_earned: 50,
      });
    });

    it("deve lançar 400 quando faltar o score em missão que não é quiz", async() => {
      repository.findById.mockResolvedValue(missao({ type: "audio", questions: undefined }));

      const erro = await capturarErro(service.submitProgress(MISSION_ID, { done: true }, req));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe(
        "O score é obrigatório para missões que não são do tipo quiz.",
      );
      expect(userRepository.upsertMissionProgress).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o quiz não tiver questões cadastradas", async() => {
      repository.findById.mockResolvedValue(missao({ questions: [] }));

      const erro = await capturarErro(
        service.submitProgress(MISSION_ID, { done: true, answers: [] }, req),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta missão de quiz não possui questões cadastradas.");
    });

    it("deve lançar 400 quando o quiz nem tiver o campo de questões", async() => {
      repository.findById.mockResolvedValue(missao({ questions: undefined }));

      const erro = await capturarErro(
        service.submitProgress(MISSION_ID, { done: true, answers: [] }, req),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta missão de quiz não possui questões cadastradas.");
    });

    it("deve lançar 400 quando o número de respostas não bater com o de questões", async() => {
      const erro = await capturarErro(
        service.submitProgress(MISSION_ID, { done: true, answers: ["a", "b"] }, req),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Envie exatamente 5 respostas, na ordem das questões.");
    });

    it("deve lançar 400 quando o quiz vier sem respostas", async() => {
      const erro = await capturarErro(service.submitProgress(MISSION_ID, { done: true }, req));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Envie exatamente 5 respostas, na ordem das questões.");
    });

    it("deve lançar 400 quando a missão estiver inativa", async() => {
      repository.findById.mockResolvedValue(missao({ active: false }));

      const erro = await capturarErro(
        service.submitProgress(MISSION_ID, { done: true, answers: questoesCertas() }, req),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta missão está inativa.");
      expect(userRepository.upsertMissionProgress).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a missão for de outra turma", async() => {
      repository.findById.mockResolvedValue(missao({ class_id: TURMA_B_ID }));

      const erro = await capturarErro(
        service.submitProgress(MISSION_ID, { done: true, answers: questoesCertas() }, req),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você não tem acesso a esta missão.");
    });

    it("deve arredondar o XP da missão sem recompensa cadastrada", async() => {
      repository.findById.mockResolvedValue(missao({ xp_reward: undefined }));

      const resultado = await service.submitProgress(
        MISSION_ID,
        { done: true, answers: questoesCertas() },
        req,
      );

      expect(resultado.xp_earned).toBe(0);
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });
  });
});
