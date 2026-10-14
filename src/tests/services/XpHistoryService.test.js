import XpHistoryService from "../../service/XpHistoryService.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("XpHistoryService", () => {
  let service;
  let userRepository;
  let classRepository;
  let attitudeLogRepository;
  let xpAdjustmentRepository;
  let missionRepository;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_A_ID = "507f1f77bcf86cd799439002";
  const PROF_B_ID = "507f1f77bcf86cd799439003";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const ALUNO_B_ID = "507f1f77bcf86cd799439005";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const MISSAO_ID = "507f1f77bcf86cd799439021";

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

    userRepository = { findById: jest.fn(), findByIds: jest.fn().mockResolvedValue([aluno()]) };
    classRepository = { findPlainById: jest.fn().mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_A_ID }) };
    attitudeLogRepository = { findByStudent: jest.fn().mockResolvedValue([]) };
    xpAdjustmentRepository = { findByStudent: jest.fn().mockResolvedValue([]) };
    missionRepository = { findTitlesByIds: jest.fn().mockResolvedValue([]) };

    service = new XpHistoryService({
      userRepository,
      classRepository,
      attitudeLogRepository,
      xpAdjustmentRepository,
      missionRepository,
    });
  });

  describe("permissões", () => {
    it("deve deixar o aluno ver o próprio histórico sem buscar o alvo de novo", async() => {
      logado(aluno());

      await service.list(ALUNO_A_ID, { user_id: ALUNO_A_ID, query: {} });

      expect(userRepository.findByIds).not.toHaveBeenCalled();
      expect(attitudeLogRepository.findByStudent).toHaveBeenCalledWith(ALUNO_A_ID);
    });

    it("deve lançar 403 quando o aluno pede o histórico de outro", async() => {
      logado(aluno());

      const erro = await capturarErro(service.list(ALUNO_B_ID, { user_id: ALUNO_A_ID, query: {} }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver o seu histórico de XP.");
      expect(attitudeLogRepository.findByStudent).not.toHaveBeenCalled();
    });

    it("deve deixar a professora ver aluno da turma dela", async() => {
      logado(profA);

      await service.list(ALUNO_A_ID, { user_id: PROF_A_ID, query: {} });

      expect(classRepository.findPlainById).toHaveBeenCalledWith(TURMA_A_ID);
      expect(xpAdjustmentRepository.findByStudent).toHaveBeenCalledWith(ALUNO_A_ID);
    });

    it("deve lançar 403 quando a professora pede aluno de turma de outra", async() => {
      logado(profB);

      const erro = await capturarErro(service.list(ALUNO_A_ID, { user_id: PROF_B_ID, query: {} }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver o histórico de XP de alunos das suas turmas.");
    });

    it("deve lançar 403 quando a professora pede aluno sem turma", async() => {
      logado(profA);
      userRepository.findByIds.mockResolvedValue([aluno({ class: null })]);

      const erro = await capturarErro(service.list(ALUNO_A_ID, { user_id: PROF_A_ID, query: {} }));

      expect(erro.statusCode).toBe(403);
      expect(classRepository.findPlainById).not.toHaveBeenCalled();
    });

    it("deve deixar o admin ver qualquer aluno sem conferir a turma", async() => {
      logado(admin);
      userRepository.findByIds.mockResolvedValue([aluno({ class: null })]);

      await service.list(ALUNO_A_ID, { user_id: ADMIN_ID, query: {} });

      expect(classRepository.findPlainById).not.toHaveBeenCalled();
    });

    it("deve lançar 404 quando o alvo não for aluno, não existir ou tiver id malformado", async() => {
      logado(admin);

      userRepository.findByIds.mockResolvedValueOnce([{ _id: PROF_A_ID, role: "teacher" }]);
      const naoAluno = await capturarErro(service.list(PROF_A_ID, { user_id: ADMIN_ID, query: {} }));

      userRepository.findByIds.mockResolvedValueOnce([]);
      const inexistente = await capturarErro(service.list(ALUNO_B_ID, { user_id: ADMIN_ID, query: {} }));

      const malformado = await capturarErro(service.list("abc", { user_id: ADMIN_ID, query: {} }));

      [naoAluno, inexistente, malformado].forEach((erro) => {
        expect(erro.statusCode).toBe(404);
        expect(erro.customMessage).toBe("Aluno não encontrado.");
      });
      // O id malformado não chega ao banco, onde viraria CastError (500).
      expect(userRepository.findByIds).toHaveBeenCalledTimes(2);
    });
  });

  describe("itens", () => {
    beforeEach(() => logado(admin));

    const listar = async(query = {}) => await service.list(ALUNO_A_ID, { user_id: ADMIN_ID, query });

    it("deve montar o item de atitude com o xp_applied, o nome da atitude e quem aplicou", async() => {
      attitudeLogRepository.findByStudent.mockResolvedValue([
        { _id: "log-1", xp_applied: -5, attitude: { name: "Atraso" }, teacher: { name: "Professora A" }, applied_at: new Date("2026-10-03") },
      ]);

      const { docs } = await listar();

      expect(docs).toEqual([
        { id: "log-1", kind: "attitude", xp: -5, title: "Atraso", detail: "Professora A", date: new Date("2026-10-03") },
      ]);
    });

    it("deve montar o item de ajuste com o xp_applied, o motivo e quem ajustou", async() => {
      xpAdjustmentRepository.findByStudent.mockResolvedValue([
        { _id: "aj-1", amount: -50, xp_applied: -3, reason: "Correção", teacher: { name: "Professora A" }, applied_at: new Date("2026-10-04") },
      ]);

      const { docs } = await listar();

      expect(docs).toEqual([
        {
          id: "aj-1",
          kind: "adjustment",
          xp: -3,
          title: "Ajuste de XP",
          detail: "Correção",
          teacher: "Professora A",
          date: new Date("2026-10-04"),
        },
      ]);
    });

    it("deve montar o item de missão só para progresso que rendeu XP", async() => {
      userRepository.findByIds.mockResolvedValue([
        aluno({
          mission_progress: [
            { mission_id: MISSAO_ID, score: 80, xp_earned: 80, completed_at: new Date("2026-10-02") },
            { mission_id: "sem-xp", score: 0, xp_earned: 0, completed_at: null },
          ],
        }),
      ]);
      missionRepository.findTitlesByIds.mockResolvedValue([{ _id: MISSAO_ID, title: "Quiz de Cores" }]);

      const { docs } = await listar();

      expect(missionRepository.findTitlesByIds).toHaveBeenCalledWith([MISSAO_ID]);
      expect(docs).toEqual([
        {
          id: MISSAO_ID,
          kind: "mission",
          xp: 80,
          title: "Quiz de Cores",
          detail: "Melhor nota: 80%",
          date: new Date("2026-10-02"),
        },
      ]);
    });

    it("não deve buscar missões quando nenhum progresso rendeu XP", async() => {
      await listar();

      expect(missionRepository.findTitlesByIds).not.toHaveBeenCalled();
    });

    it("deve usar os textos de reserva para atitude e missão removidas, quem aplicou removido e ajuste sem motivo", async() => {
      attitudeLogRepository.findByStudent.mockResolvedValue([
        { _id: "log-1", xp_applied: 10, attitude: null, teacher: null, applied_at: new Date("2026-10-01") },
      ]);
      xpAdjustmentRepository.findByStudent.mockResolvedValue([
        { _id: "aj-1", xp_applied: 20, reason: undefined, teacher: null, applied_at: new Date("2026-10-02") },
      ]);
      userRepository.findByIds.mockResolvedValue([
        aluno({ mission_progress: [{ mission_id: MISSAO_ID, score: 50, xp_earned: 50, completed_at: new Date("2026-10-03") }] }),
      ]);

      const { docs } = await listar();

      expect(docs.map(({ title, detail, teacher }) => ({ title, detail, teacher }))).toEqual([
        { title: "Missão removida", detail: "Melhor nota: 50%", teacher: undefined },
        { title: "Ajuste de XP", detail: null, teacher: null },
        { title: "Atitude removida", detail: null, teacher: undefined },
      ]);
    });

    it("deve ordenar da data mais recente para a mais antiga, com item sem data no fim", async() => {
      attitudeLogRepository.findByStudent.mockResolvedValue([
        { _id: "a", xp_applied: 1, applied_at: new Date("2026-10-01") },
        { _id: "c", xp_applied: 1, applied_at: new Date("2026-10-03") },
      ]);
      userRepository.findByIds.mockResolvedValue([
        aluno({ mission_progress: [{ mission_id: "legado", score: 100, xp_earned: 10, completed_at: null }] }),
      ]);
      xpAdjustmentRepository.findByStudent.mockResolvedValue([
        { _id: "b", xp_applied: 1, applied_at: new Date("2026-10-02") },
      ]);

      const { docs } = await listar();

      expect(docs.map((item) => item.id)).toEqual(["c", "b", "a", "legado"]);
    });
  });

  describe("paginação", () => {
    beforeEach(() => {
      logado(admin);
      attitudeLogRepository.findByStudent.mockResolvedValue(
        Array.from({ length: 23 }, (_, index) => ({
          _id: `log-${String(index).padStart(2, "0")}`,
          xp_applied: 1,
          applied_at: new Date(Date.UTC(2026, 9, index + 1)),
        })),
      );
    });

    const listar = async(query) => await service.list(ALUNO_A_ID, { user_id: ADMIN_ID, query });

    it("deve usar página 1 e limit 10 por padrão", async() => {
      const pagina = await listar({});

      expect(pagina).toMatchObject({
        totalDocs: 23,
        limit: 10,
        page: 1,
        totalPages: 3,
        hasPrevPage: false,
        hasNextPage: true,
        prevPage: null,
        nextPage: 2,
      });
      expect(pagina.docs).toHaveLength(10);
      expect(pagina.docs[0].id).toBe("log-22");
    });

    it("deve devolver a última página incompleta", async() => {
      const pagina = await listar({ page: "3", limit: "10" });

      expect(pagina.docs.map((item) => item.id)).toEqual(["log-02", "log-01", "log-00"]);
      expect(pagina).toMatchObject({ hasPrevPage: true, hasNextPage: false, prevPage: 2, nextPage: null });
    });

    it("deve limitar o limit a 50", async() => {
      expect((await listar({ limit: "500" })).limit).toBe(50);
    });

    it("deve voltar ao padrão com page ou limit inválidos", async() => {
      const pagina = await listar({ page: "0", limit: "abc" });

      expect(pagina).toMatchObject({ page: 1, limit: 10 });
    });

    it("deve devolver docs vazio para página além da última", async() => {
      const pagina = await listar({ page: "9" });

      expect(pagina.docs).toEqual([]);
      expect(pagina.totalPages).toBe(3);
    });
  });
});
