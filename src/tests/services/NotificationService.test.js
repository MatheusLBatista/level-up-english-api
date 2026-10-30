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

  describe("list", () => {
    const pagina = { docs: [], totalDocs: 0 };

    beforeEach(() => {
      repository.listByUser.mockResolvedValue(pagina);
    });

    it("deve listar as notificações do usuário logado com a página pedida", async() => {
      const resultado = await service.list({ user_id: ALUNO_ID, query: { page: "2", limit: "5" } });

      expect(repository.listByUser).toHaveBeenCalledWith(ALUNO_ID, { page: 2, limit: 5 });
      expect(resultado).toBe(pagina);
    });

    it("deve usar a primeira página com 10 itens quando a query não vier", async() => {
      await service.list({ user_id: ALUNO_ID });

      expect(repository.listByUser).toHaveBeenCalledWith(ALUNO_ID, { page: 1, limit: 10 });
    });

    it("deve cair no padrão quando page ou limit forem inválidos", async() => {
      await service.list({ user_id: ALUNO_ID, query: { page: "abc", limit: "-3" } });

      expect(repository.listByUser).toHaveBeenCalledWith(ALUNO_ID, { page: 1, limit: 10 });
    });

    it("deve limitar a 50 itens por página", async() => {
      await service.list({ user_id: ALUNO_ID, query: { limit: "500" } });

      expect(repository.listByUser).toHaveBeenCalledWith(ALUNO_ID, { page: 1, limit: 50 });
    });
  });

  describe("countUnread", () => {
    it("deve devolver a quantidade de não lidas do usuário logado", async() => {
      repository.countUnread.mockResolvedValue(3);

      const resultado = await service.countUnread({ user_id: ALUNO_ID });

      expect(repository.countUnread).toHaveBeenCalledWith(ALUNO_ID);
      expect(resultado).toEqual({ unread: 3 });
    });
  });

  describe("markAsRead", () => {
    const NOTIFICACAO_ID = "507f1f77bcf86cd799439051";

    it("deve marcar como lida a notificação do usuário logado", async() => {
      const atualizada = { _id: NOTIFICACAO_ID, read: true };
      repository.markAsRead.mockResolvedValue(atualizada);

      const resultado = await service.markAsRead(NOTIFICACAO_ID, { user_id: ALUNO_ID });

      expect(repository.markAsRead).toHaveBeenCalledWith(NOTIFICACAO_ID, ALUNO_ID);
      expect(resultado).toBe(atualizada);
    });

    it("deve lançar 404 quando a notificação não for do usuário ou não existir", async() => {
      repository.markAsRead.mockResolvedValue(null);

      await expect(service.markAsRead(NOTIFICACAO_ID, { user_id: OUTRO_ALUNO_ID })).rejects.toMatchObject({
        statusCode: 404,
        customMessage: "Recurso não encontrado em Notification.",
      });
    });

    it("deve lançar 404 sem acessar o banco quando o id for malformado", async() => {
      await expect(service.markAsRead("abc", { user_id: ALUNO_ID })).rejects.toMatchObject({ statusCode: 404 });

      expect(repository.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("deve devolver quantas notificações foram marcadas", async() => {
      repository.markAllAsRead.mockResolvedValue(4);

      const resultado = await service.markAllAsRead({ user_id: ALUNO_ID });

      expect(repository.markAllAsRead).toHaveBeenCalledWith(ALUNO_ID);
      expect(resultado).toEqual({ updated: 4 });
    });
  });
});
