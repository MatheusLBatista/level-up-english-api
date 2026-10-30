jest.mock("../../repository/NotificationRepository.js");

import NotificationService from "../../service/NotificationService.js";
import NotificationRepository from "../../repository/NotificationRepository.js";
import logger from "../../utils/logger.js";

describe("NotificationService", () => {
  let service;
  let repository;

  const ALUNO_ID = "507f1f77bcf86cd799439001";
  const OUTRO_ALUNO_ID = "507f1f77bcf86cd799439002";
  const MISSAO_ID = "507f1f77bcf86cd799439031";

  beforeEach(() => {
    jest.clearAllMocks();

    service = new NotificationService();
    repository = NotificationRepository.mock.instances[NotificationRepository.mock.instances.length - 1];

    jest.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logger.error.mockRestore();
  });

  describe("notify", () => {
    it("deve criar a notificação para o usuário", async() => {
      const salva = { _id: "n1" };
      repository.create.mockResolvedValue(salva);

      const resultado = await service.notify(ALUNO_ID, "attitude", "Você ganhou 50 XP", { xp: 50 });

      expect(repository.create).toHaveBeenCalledWith({
        user: ALUNO_ID,
        type: "attitude",
        message: "Você ganhou 50 XP",
        data: { xp: 50 },
      });
      expect(resultado).toBe(salva);
    });

    it("deve usar data vazio quando não for informado", async() => {
      repository.create.mockResolvedValue({});

      await service.notify(ALUNO_ID, "xp_adjustment", "Você perdeu 10 XP");

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
    });

    it("não deve lançar erro quando a criação falhar, só registrar no log", async() => {
      repository.create.mockRejectedValue(new Error("banco fora do ar"));

      const resultado = await service.notify(ALUNO_ID, "attitude", "Você ganhou 50 XP");

      expect(resultado).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("banco fora do ar"));
    });
  });

  describe("notifyMany", () => {
    it("deve criar uma notificação por usuário de uma vez", async() => {
      repository.createMany.mockResolvedValue([{}, {}]);

      await service.notifyMany([ALUNO_ID, OUTRO_ALUNO_ID], "new_mission", "Nova missão", { mission: MISSAO_ID });

      expect(repository.createMany).toHaveBeenCalledWith([
        { user: ALUNO_ID, type: "new_mission", message: "Nova missão", data: { mission: MISSAO_ID } },
        { user: OUTRO_ALUNO_ID, type: "new_mission", message: "Nova missão", data: { mission: MISSAO_ID } },
      ]);
    });

    it("não deve acessar o banco quando a lista estiver vazia", async() => {
      const resultado = await service.notifyMany([], "new_mission", "Nova missão");

      expect(repository.createMany).not.toHaveBeenCalled();
      expect(resultado).toEqual([]);
    });

    it("não deve lançar erro quando a criação falhar, só registrar no log", async() => {
      repository.createMany.mockRejectedValue(new Error("banco fora do ar"));

      const resultado = await service.notifyMany([ALUNO_ID], "new_mission", "Nova missão");

      expect(resultado).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("banco fora do ar"));
    });
  });
});
