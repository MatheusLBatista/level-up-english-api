import PerformanceService from "../../service/PerformanceService.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("PerformanceService", () => {
  let service;
  let userRepository;
  let classRepository;
  let missionRepository;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_A_ID = "507f1f77bcf86cd799439002";
  const PROF_B_ID = "507f1f77bcf86cd799439003";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const ALUNO_B_ID = "507f1f77bcf86cd799439005";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const QUIZ_ID = "507f1f77bcf86cd799439021";
  const AUDIO_ID = "507f1f77bcf86cd799439022";

  const admin = { _id: ADMIN_ID, role: "admin" };
  const profA = { _id: PROF_A_ID, role: "teacher" };
  const profB = { _id: PROF_B_ID, role: "teacher" };

  const aluno = (overrides = {}) => ({
    _id: ALUNO_A_ID,
    role: "student",
    class: TURMA_A_ID,
    mission_progress: [],
    ...overrides,
  });

  const semNota = { score: null, missions: 0 };

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  const logado = (usuario) => userRepository.findById.mockResolvedValue(usuario);

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([aluno()]),
      findActiveStudentsProgressByClass: jest.fn().mockResolvedValue([]),
    };
    classRepository = { findPlainById: jest.fn().mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_A_ID }) };
    missionRepository = { findTypesByIds: jest.fn().mockResolvedValue([]) };

    service = new PerformanceService({ userRepository, classRepository, missionRepository });
  });

  describe("permissões", () => {
    it("deve deixar o aluno ver o próprio desempenho sem buscar o alvo de novo", async() => {
      logado(aluno());

      await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(userRepository.findByIds).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando o aluno pede o desempenho de outro", async() => {
      logado(aluno());

      const erro = await capturarErro(service.getByStudent(ALUNO_B_ID, { user_id: ALUNO_A_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver o seu desempenho.");
    });

    it("deve deixar a professora ver aluno da turma dela", async() => {
      logado(profA);

      await expect(service.getByStudent(ALUNO_A_ID, { user_id: PROF_A_ID })).resolves.toBeDefined();
    });

    it("deve lançar 403 quando a professora pede aluno de turma de outra", async() => {
      logado(profB);

      const erro = await capturarErro(service.getByStudent(ALUNO_A_ID, { user_id: PROF_B_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver o desempenho de alunos das suas turmas.");
      expect(missionRepository.findTypesByIds).not.toHaveBeenCalled();
    });

    it("deve deixar o admin ver qualquer aluno sem conferir a turma", async() => {
      logado(admin);

      await service.getByStudent(ALUNO_A_ID, { user_id: ADMIN_ID });

      expect(classRepository.findPlainById).not.toHaveBeenCalled();
    });

    it("deve lançar 404 quando o alvo não for aluno", async() => {
      logado(admin);
      userRepository.findByIds.mockResolvedValue([{ _id: PROF_A_ID, role: "teacher" }]);

      const erro = await capturarErro(service.getByStudent(PROF_A_ID, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
    });
  });

  describe("desempenho", () => {
    it("deve devolver a média de cada tipo a partir do tipo das missões", async() => {
      logado(aluno({
        mission_progress: [
          { mission_id: QUIZ_ID, done: true, score: 80 },
          { mission_id: AUDIO_ID, done: true, score: 60 },
        ],
      }));
      missionRepository.findTypesByIds.mockResolvedValue([
        { _id: QUIZ_ID, type: "quiz" },
        { _id: AUDIO_ID, type: "audio" },
      ]);

      const resultado = await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(missionRepository.findTypesByIds).toHaveBeenCalledWith([QUIZ_ID, AUDIO_ID]);
      expect(resultado.student).toEqual({
        quiz: { score: 80, missions: 1 },
        vocabulary: semNota,
        audio: { score: 60, missions: 1 },
      });
    });

    it("não deve buscar missões quando ninguém tiver progresso", async() => {
      logado(aluno());

      const resultado = await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(missionRepository.findTypesByIds).not.toHaveBeenCalled();
      expect(resultado.student).toEqual({ quiz: semNota, vocabulary: semNota, audio: semNota });
    });

    it("deve tratar aluno sem o campo de progresso como sem progresso", async() => {
      logado(aluno({ mission_progress: undefined }));

      const resultado = await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(resultado.student.quiz).toEqual(semNota);
    });
  });

  describe("média da turma", () => {
    const progresso = (quiz, audio) => [
      { mission_id: QUIZ_ID, done: true, score: quiz },
      ...(audio === undefined ? [] : [{ mission_id: AUDIO_ID, done: true, score: audio }]),
    ];

    beforeEach(() => {
      missionRepository.findTypesByIds.mockResolvedValue([
        { _id: QUIZ_ID, type: "quiz" },
        { _id: AUDIO_ID, type: "audio" },
      ]);
    });

    it("deve buscar os alunos ativos da turma do aluno e tirar a média das médias deles", async() => {
      const alunoA = aluno({ mission_progress: progresso(100, 60) });
      logado(alunoA);
      userRepository.findActiveStudentsProgressByClass.mockResolvedValue([
        alunoA,
        { _id: ALUNO_B_ID, mission_progress: progresso(60) },
      ]);

      const resultado = await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(userRepository.findActiveStudentsProgressByClass).toHaveBeenCalledWith(TURMA_A_ID);
      expect(resultado.class).toEqual({
        quiz: { score: 80, students: 2 },
        vocabulary: { score: null, students: 0 },
        audio: { score: 60, students: 1 },
      });
    });

    it("deve buscar o tipo das missões de todos de uma vez, sem repetir id", async() => {
      const alunoA = aluno({ mission_progress: progresso(100, 60) });
      logado(alunoA);
      userRepository.findActiveStudentsProgressByClass.mockResolvedValue([
        alunoA,
        { _id: ALUNO_B_ID, mission_progress: progresso(60, 40) },
      ]);

      await service.getByStudent(ALUNO_A_ID, { user_id: ALUNO_A_ID });

      expect(missionRepository.findTypesByIds).toHaveBeenCalledTimes(1);
      expect(missionRepository.findTypesByIds).toHaveBeenCalledWith([QUIZ_ID, AUDIO_ID]);
    });

    it("deve aplicar o período ao aluno e aos colegas, sem buscar o tipo de missão fora dele", async() => {
      const OUTUBRO = new Date("2026-10-10T12:00:00Z");
      const SETEMBRO = new Date("2026-09-10T12:00:00Z");
      const alunoA = aluno({
        mission_progress: [
          { mission_id: QUIZ_ID, done: true, score: 100, completed_at: OUTUBRO },
          { mission_id: AUDIO_ID, done: true, score: 20, completed_at: SETEMBRO },
        ],
      });
      logado(alunoA);
      userRepository.findActiveStudentsProgressByClass.mockResolvedValue([
        alunoA,
        { _id: ALUNO_B_ID, mission_progress: [{ mission_id: QUIZ_ID, done: true, score: 40, completed_at: SETEMBRO }] },
      ]);

      const resultado = await service.getByStudent(
        ALUNO_A_ID,
        { user_id: ALUNO_A_ID },
        { from: "2026-10-01T00:00:00Z", to: "2026-10-31T23:59:59Z" },
      );

      expect(missionRepository.findTypesByIds).toHaveBeenCalledWith([QUIZ_ID]);
      expect(resultado.student.quiz).toEqual({ score: 100, missions: 1 });
      expect(resultado.student.audio).toEqual({ score: null, missions: 0 });
      expect(resultado.class.quiz).toEqual({ score: 100, students: 1 });
    });

    it("deve devolver class null para aluno sem turma, sem buscar colegas", async() => {
      logado(admin);
      userRepository.findByIds.mockResolvedValue([aluno({ class: null, mission_progress: progresso(70) })]);

      const resultado = await service.getByStudent(ALUNO_A_ID, { user_id: ADMIN_ID });

      expect(userRepository.findActiveStudentsProgressByClass).not.toHaveBeenCalled();
      expect(resultado.student.quiz).toEqual({ score: 70, missions: 1 });
      expect(resultado.class).toBeNull();
    });
  });
});
