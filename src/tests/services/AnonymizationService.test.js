import AnonymizationService, { ANONYMIZED_NAME, anonymizedEmail } from "../../service/AnonymizationService.js";
import { CustomError } from "../../utils/helpers/index.js";
import logger from "../../utils/logger.js";

describe("AnonymizationService", () => {
  let service;
  let userRepository;
  let notificationRepository;
  let xpAdjustmentRepository;
  let erasureLogRepository;
  let rankingService;
  let storage;

  const ALUNO_ID = "507f1f77bcf86cd799439004";
  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const TURMA_ID = "507f1f77bcf86cd799439021";

  const aluno = (overrides = {}) => ({
    _id: ALUNO_ID,
    role: "student",
    name: "Bia Souza",
    email: "bia@escola.com",
    class: TURMA_ID,
    avatar_url: "/uploads/avatars/bia.webp",
    active: true,
    deactivated_at: null,
    anonymized_at: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = {
      findById: jest.fn().mockResolvedValue(aluno()),
      update: jest.fn(async(id, dados) => ({ _id: id, ...dados })),
    };
    notificationRepository = { deleteByUser: jest.fn().mockResolvedValue(3) };
    xpAdjustmentRepository = { clearReasonsByStudent: jest.fn().mockResolvedValue(1) };
    erasureLogRepository = { create: jest.fn().mockResolvedValue({}) };
    rankingService = { refreshGlobal: jest.fn(), refreshClass: jest.fn() };
    storage = {
      keyFromUrl: jest.fn((url) => (url ? url.replace("/uploads/", "") : null)),
      delete: jest.fn(),
    };

    service = new AnonymizationService({
      userRepository,
      notificationRepository,
      xpAdjustmentRepository,
      erasureLogRepository,
      rankingService,
      storage,
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

  const dadosGravados = () => userRepository.update.mock.calls[0][1];

  it("deve trocar nome e e-mail por valores fictícios únicos e apagar credenciais e foto", async() => {
    await service.anonymize(ALUNO_ID, { reason: "holder_request", performedBy: ADMIN_ID });

    expect(userRepository.update).toHaveBeenCalledWith(ALUNO_ID, expect.objectContaining({
      name: "Aluno removido",
      email: `removido-${ALUNO_ID}@anonimizado.invalid`,
      avatar_url: null,
      password: null,
      accesstoken: null,
      refreshtoken: null,
      uniqueToken: null,
      password_recovery_code: null,
      exp_password_recovery_code: null,
    }));
    expect(ANONYMIZED_NAME).toBe("Aluno removido");
    expect(anonymizedEmail("abc")).toBe("removido-abc@anonimizado.invalid");
  });

  it("não deve mexer em XP, nível, progresso nem turma", async() => {
    await service.anonymize(ALUNO_ID, { reason: "retention" });

    const dados = dadosGravados();
    ["xp", "level", "mission_progress", "class", "badges"].forEach((campo) => {
      expect(dados).not.toHaveProperty(campo);
    });
  });

  it("deve apagar o arquivo da foto antes de limpar a URL", async() => {
    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(storage.delete).toHaveBeenCalledWith("avatars/bia.webp");
    expect(storage.delete.mock.invocationCallOrder[0])
      .toBeLessThan(userRepository.update.mock.invocationCallOrder[0]);
  });

  it("não deve tocar no disco quando o aluno não tiver foto", async() => {
    userRepository.findById.mockResolvedValue(aluno({ avatar_url: null }));

    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("deve interromper sem anonimizar nem registrar quando não conseguir apagar a foto", async() => {
    storage.delete.mockRejectedValue(new Error("EACCES"));

    await expect(service.anonymize(ALUNO_ID, { reason: "retention" })).rejects.toThrow("EACCES");

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(erasureLogRepository.create).not.toHaveBeenCalled();
  });

  it("deve apagar as notificações e os motivos dos ajustes de XP do aluno", async() => {
    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(notificationRepository.deleteByUser).toHaveBeenCalledWith(ALUNO_ID);
    expect(xpAdjustmentRepository.clearReasonsByStudent).toHaveBeenCalledWith(ALUNO_ID);
  });

  it("deve marcar anonymized_at e desativar a conta", async() => {
    const antes = Date.now();

    await service.anonymize(ALUNO_ID, { reason: "holder_request", performedBy: ADMIN_ID });

    const dados = dadosGravados();
    expect(dados.active).toBe(false);
    expect(dados.anonymized_at.getTime()).toBeGreaterThanOrEqual(antes);
    expect(dados.deactivated_at).toBe(dados.anonymized_at);
  });

  it("deve manter a data de desativação original quando o aluno já estava desativado", async() => {
    const desativadoEm = new Date("2025-01-01");
    userRepository.findById.mockResolvedValue(aluno({ active: false, deactivated_at: desativadoEm }));

    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(dadosGravados().deactivated_at).toBe(desativadoEm);
  });

  it("deve registrar quem executou, quando e o motivo, sem dados pessoais", async() => {
    await service.anonymize(ALUNO_ID, { reason: "holder_request", performedBy: ADMIN_ID });

    const [registro] = erasureLogRepository.create.mock.calls[0];
    expect(registro).toEqual({
      user: ALUNO_ID,
      reason: "holder_request",
      performed_by: ADMIN_ID,
      performed_at: dadosGravados().anonymized_at,
    });
  });

  it("não deve criar registro novo quando chamado com record false", async() => {
    await service.anonymize(ALUNO_ID, { reason: "retention", record: false });

    expect(userRepository.update).toHaveBeenCalled();
    expect(erasureLogRepository.create).not.toHaveBeenCalled();
  });

  it("deve registrar performed_by nulo quando quem executa é o job de retenção", async() => {
    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(erasureLogRepository.create.mock.calls[0][0].performed_by).toBeNull();
  });

  it("deve recalcular os rankings quando o aluno ainda estava ativo", async() => {
    await service.anonymize(ALUNO_ID, { reason: "holder_request", performedBy: ADMIN_ID });

    expect(rankingService.refreshGlobal).toHaveBeenCalled();
    expect(rankingService.refreshClass).toHaveBeenCalledWith(TURMA_ID);
  });

  it("deve recalcular só o ranking global quando o aluno ativo não tiver turma", async() => {
    userRepository.findById.mockResolvedValue(aluno({ class: null }));

    await service.anonymize(ALUNO_ID, { reason: "holder_request" });

    expect(rankingService.refreshGlobal).toHaveBeenCalled();
    expect(rankingService.refreshClass).not.toHaveBeenCalled();
  });

  it("não deve recalcular rankings quando o aluno já estava desativado", async() => {
    userRepository.findById.mockResolvedValue(aluno({ active: false, deactivated_at: new Date() }));

    await service.anonymize(ALUNO_ID, { reason: "retention" });

    expect(rankingService.refreshGlobal).not.toHaveBeenCalled();
  });

  it("deve concluir a anonimização e só registrar no log quando o ranking falhar", async() => {
    rankingService.refreshGlobal.mockRejectedValue(new Error("mongo fora"));
    const logError = jest.spyOn(logger, "error").mockImplementation(() => {});

    const resultado = await service.anonymize(ALUNO_ID, { reason: "holder_request" });

    expect(resultado.name).toBe("Aluno removido");
    expect(logError).toHaveBeenCalledWith(expect.stringContaining("mongo fora"));
    logError.mockRestore();
  });

  it("deve lançar 404 sem apagar nada quando o alvo não for aluno", async() => {
    userRepository.findById.mockResolvedValue(aluno({ role: "teacher" }));

    const erro = await capturarErro(service.anonymize(ALUNO_ID, { reason: "holder_request" }));

    expect(erro).toBeInstanceOf(CustomError);
    expect(erro.statusCode).toBe(404);
    expect(erro.customMessage).toBe("Aluno não encontrado.");
    expect(notificationRepository.deleteByUser).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it("deve lançar 409 sem apagar nada quando o aluno já tiver sido anonimizado", async() => {
    userRepository.findById.mockResolvedValue(aluno({ anonymized_at: new Date() }));

    const erro = await capturarErro(service.anonymize(ALUNO_ID, { reason: "holder_request" }));

    expect(erro.statusCode).toBe(409);
    expect(erro.errorType).toBe("conflictError");
    expect(erro.customMessage).toBe("Os dados deste aluno já foram eliminados.");
    expect(notificationRepository.deleteByUser).not.toHaveBeenCalled();
    expect(erasureLogRepository.create).not.toHaveBeenCalled();
  });

  it("deve propagar o 404 do repositório quando o usuário não existir", async() => {
    userRepository.findById.mockRejectedValue(new CustomError({ statusCode: 404, customMessage: "x" }));

    const erro = await capturarErro(service.anonymize(ALUNO_ID, { reason: "holder_request" }));

    expect(erro.statusCode).toBe(404);
  });

  it("deve montar as dependências padrão quando nada for injetado", () => {
    const padrao = new AnonymizationService();

    expect(padrao.userRepository).toBeDefined();
    expect(padrao.erasureLogRepository.dataErasureLogModel.modelName).toBe("dataErasureLogs");
  });
});
