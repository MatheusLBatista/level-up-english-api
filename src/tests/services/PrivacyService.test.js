import PrivacyService from "../../service/PrivacyService.js";
import AnonymizationService from "../../service/AnonymizationService.js";

describe("PrivacyService", () => {
  let service;
  let userRepository;
  let classRepository;
  let attitudeLogRepository;
  let xpAdjustmentRepository;
  let missionRepository;
  let notificationRepository;
  let rankingRepository;
  let anonymizationService;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_ID = "507f1f77bcf86cd799439002";
  const ALUNO_ID = "507f1f77bcf86cd799439004";
  const OUTRO_ID = "507f1f77bcf86cd799439005";
  const TURMA_ID = "507f1f77bcf86cd799439021";
  const MISSAO_ID = "507f1f77bcf86cd799439031";

  const admin = { _id: ADMIN_ID, role: "admin", active: true };

  const aluno = (overrides = {}) => ({
    _id: ALUNO_ID,
    role: "student",
    name: "Bia Souza",
    email: "bia@escola.com",
    password: "hash",
    refreshtoken: "token",
    class: TURMA_ID,
    xp: 320,
    level: 2,
    badges: [],
    avatar_url: "/uploads/avatars/bia.webp",
    active: true,
    show_in_global_ranking: true,
    deactivated_at: null,
    anonymized_at: null,
    guardian_consent_at: new Date("2026-02-01"),
    guardian_consent_recorded_by: PROF_ID,
    guardian_consent_revoked_at: null,
    mission_progress: [
      { mission_id: MISSAO_ID, done: true, score: 80, xp_earned: 80, completed_at: new Date("2026-03-01") },
    ],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findById: jest.fn().mockResolvedValue(admin),
      findByIds: jest.fn(async(ids) => (String(ids[0]) === ALUNO_ID ? [aluno()] : [{ _id: PROF_ID, name: "Ana Prof" }])),
    };
    classRepository = { findPlainById: jest.fn().mockResolvedValue({ _id: TURMA_ID, name: "Turma A", teacher: PROF_ID }) };
    attitudeLogRepository = {
      findByStudent: jest.fn().mockResolvedValue([
        { attitude: { name: "Participação" }, teacher: { name: "Ana Prof" }, xp_applied: 20, applied_at: new Date("2026-03-02") },
        { attitude: null, teacher: null, xp_applied: -5, applied_at: null },
      ]),
    };
    xpAdjustmentRepository = {
      findByStudent: jest.fn().mockResolvedValue([
        { teacher: { name: "Ana Prof" }, amount: 10, xp_applied: 10, reason: "Monitoria", applied_at: new Date("2026-03-03") },
        { teacher: null, amount: -10, xp_applied: -10, reason: undefined, applied_at: undefined },
      ]),
    };
    missionRepository = { findTitlesByIds: jest.fn().mockResolvedValue([{ _id: MISSAO_ID, title: "Verbos" }]) };
    notificationRepository = {
      findAllByUser: jest.fn().mockResolvedValue([
        { type: "attitude", message: "Você ganhou 20 XP", read: false, createdAt: new Date("2026-03-02"), user: ALUNO_ID },
      ]),
    };
    rankingRepository = {
      findContainingUser: jest.fn().mockResolvedValue([
        { type: "global", class: null, entries: [{ user: OUTRO_ID }, { user: ALUNO_ID }], updatedAt: new Date("2026-03-04") },
        { type: "class", class: { _id: TURMA_ID, name: "Turma A" }, entries: [{ user: ALUNO_ID }] },
      ]),
    };
    anonymizationService = { anonymize: jest.fn().mockResolvedValue({ _id: ALUNO_ID, name: "Aluno removido" }) };

    service = new PrivacyService({
      userRepository,
      classRepository,
      attitudeLogRepository,
      xpAdjustmentRepository,
      missionRepository,
      notificationRepository,
      rankingRepository,
      anonymizationService,
    });
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("eraseStudent", () => {
    it("deve anonimizar o aluno a pedido do titular registrando o admin que executou", async() => {
      const resultado = await service.eraseStudent(ALUNO_ID, { user_id: ADMIN_ID });

      expect(anonymizationService.anonymize).toHaveBeenCalledWith(ALUNO_ID, {
        reason: "holder_request",
        performedBy: ADMIN_ID,
      });
      expect(resultado.name).toBe("Aluno removido");
    });

    it.each([
      ["não for aluno", [{ _id: ALUNO_ID, role: "teacher" }]],
      ["não existir", []],
    ])("deve lançar 404 sem anonimizar quando o alvo %s", async(_, encontrados) => {
      userRepository.findByIds.mockResolvedValue(encontrados);

      const erro = await capturarErro(service.eraseStudent(ALUNO_ID, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
      expect(anonymizationService.anonymize).not.toHaveBeenCalled();
    });

    it("deve lançar 404 sem consultar o banco quando o id for inválido", async() => {
      const erro = await capturarErro(service.eraseStudent("nao-e-id", { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
      expect(userRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe("exportStudentData", () => {
    const exportar = () => service.exportStudentData(ALUNO_ID, { user_id: ADMIN_ID });

    it("deve exportar o perfil sem senha, tokens nem campos internos", async() => {
      const { student, exported_at } = await exportar();

      expect(new Date(exported_at).getTime()).toBeLessThanOrEqual(Date.now());
      expect(student).toEqual({
        _id: ALUNO_ID,
        name: "Bia Souza",
        email: "bia@escola.com",
        role: "student",
        class: { _id: TURMA_ID, name: "Turma A" },
        xp: 320,
        level: 2,
        badges: [],
        avatar_url: "/uploads/avatars/bia.webp",
        active: true,
        show_in_global_ranking: true,
        deactivated_at: null,
        anonymized_at: null,
        guardian_consent_at: new Date("2026-02-01"),
        guardian_consent_recorded_by: { _id: PROF_ID, name: "Ana Prof" },
        guardian_consent_revoked_at: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-03-01"),
      });
    });

    it("deve exportar o progresso das missões com o título", async() => {
      const { mission_progress } = await exportar();

      expect(mission_progress).toEqual([{
        mission: { _id: MISSAO_ID, title: "Verbos" },
        done: true,
        score: 80,
        xp_earned: 80,
        completed_at: new Date("2026-03-01"),
      }]);
    });

    it("deve exportar atitudes, ajustes de XP e notificações só com os campos do aluno", async() => {
      const { attitude_logs, xp_adjustments, notifications } = await exportar();

      expect(attitude_logs).toEqual([
        { attitude: "Participação", teacher: "Ana Prof", xp_applied: 20, applied_at: new Date("2026-03-02") },
        { attitude: null, teacher: null, xp_applied: -5, applied_at: null },
      ]);
      expect(xp_adjustments).toEqual([
        { teacher: "Ana Prof", amount: 10, xp_applied: 10, reason: "Monitoria", applied_at: new Date("2026-03-03") },
        { teacher: null, amount: -10, xp_applied: -10, reason: null, applied_at: null },
      ]);
      expect(notifications).toEqual([
        { type: "attitude", message: "Você ganhou 20 XP", read: false, createdAt: new Date("2026-03-02") },
      ]);
    });

    it("deve exportar a posição do aluno em cada ranking", async() => {
      const { rankings } = await exportar();

      expect(rankings).toEqual([
        { type: "global", class: null, position: 2, updatedAt: new Date("2026-03-04") },
        { type: "class", class: { _id: TURMA_ID, name: "Turma A" }, position: 1, updatedAt: null },
      ]);
    });

    it("deve exportar um aluno sem turma, sem progresso e sem termo registrado", async() => {
      userRepository.findByIds.mockResolvedValue([aluno({
        class: null,
        mission_progress: undefined,
        guardian_consent_recorded_by: null,
        guardian_consent_at: undefined,
        badges: undefined,
        avatar_url: undefined,
        show_in_global_ranking: false,
        createdAt: undefined,
        updatedAt: undefined,
      })]);

      const { student, mission_progress } = await exportar();

      expect(classRepository.findPlainById).not.toHaveBeenCalled();
      expect(missionRepository.findTitlesByIds).not.toHaveBeenCalled();
      expect(mission_progress).toEqual([]);
      expect(student).toMatchObject({
        class: null,
        badges: [],
        avatar_url: null,
        show_in_global_ranking: false,
        guardian_consent_at: null,
        guardian_consent_recorded_by: null,
        createdAt: null,
        updatedAt: null,
      });
    });

    it("deve marcar como nula a data de notificação legada sem createdAt", async() => {
      notificationRepository.findAllByUser.mockResolvedValue([{ type: "new_mission", message: "Nova missão", read: true }]);

      const { notifications } = await exportar();

      expect(notifications).toEqual([{ type: "new_mission", message: "Nova missão", read: true, createdAt: null }]);
    });

    it("deve marcar como nulo o título de missão que não existe mais", async() => {
      missionRepository.findTitlesByIds.mockResolvedValue([]);
      userRepository.findByIds.mockResolvedValueOnce([aluno({
        mission_progress: [{ mission_id: MISSAO_ID, done: false, score: 0, xp_earned: 0 }],
        guardian_consent_recorded_by: null,
      })]);

      const { mission_progress } = await exportar();

      expect(mission_progress[0]).toMatchObject({ mission: { _id: MISSAO_ID, title: null }, completed_at: null });
    });

    it("deve lançar 404 quando o alvo não for aluno", async() => {
      userRepository.findByIds.mockResolvedValue([{ _id: ALUNO_ID, role: "admin" }]);

      const erro = await capturarErro(exportar());

      expect(erro.statusCode).toBe(404);
      expect(attitudeLogRepository.findByStudent).not.toHaveBeenCalled();
    });
  });

  it("deve montar as dependências padrão quando nada for injetado", () => {
    expect(new PrivacyService().anonymizationService).toBeInstanceOf(AnonymizationService);
  });
});
