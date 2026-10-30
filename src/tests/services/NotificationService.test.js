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

  describe("mensagens de XP", () => {
    const LOG_ID = "507f1f77bcf86cd799439041";
    const ATITUDE_ID = "507f1f77bcf86cd799439021";
    const AJUSTE_ID = "507f1f77bcf86cd799439061";

    const SEM_MUDANCA = { leveled_up: false, leveled_down: false, level: 3 };
    const SUBIU = { leveled_up: true, leveled_down: false, level: 4 };
    const DESCEU = { leveled_up: false, leveled_down: true, level: 2 };

    const log = { _id: LOG_ID };
    const participacao = { _id: ATITUDE_ID, name: "Participação" };

    beforeEach(() => {
      repository.create.mockResolvedValue({});
    });

    const notificado = () => repository.create.mock.calls[0][0];

    describe("notifyAttitudeApplied", () => {
      it("deve notificar a atitude com o XP com sinal e as referências", async() => {
        await service.notifyAttitudeApplied(ALUNO_ID, {
          log,
          attitude: participacao,
          xp_applied: 10,
          progression: SEM_MUDANCA,
        });

        expect(notificado()).toEqual({
          user: ALUNO_ID,
          type: "attitude",
          message: "Atitude registrada: Participação (+10 XP).",
          data: { xp: 10, attitude_log: LOG_ID, attitude: ATITUDE_ID },
        });
      });

      it("deve mostrar o XP negativo sem sinal duplicado", async() => {
        await service.notifyAttitudeApplied(ALUNO_ID, {
          log,
          attitude: { _id: ATITUDE_ID, name: "Atraso" },
          xp_applied: -5,
          progression: SEM_MUDANCA,
        });

        expect(notificado().message).toBe("Atitude registrada: Atraso (-5 XP).");
      });

      it("deve incluir a subida de nível na mensagem", async() => {
        await service.notifyAttitudeApplied(ALUNO_ID, { log, attitude: participacao, xp_applied: 10, progression: SUBIU });

        expect(notificado().message).toBe("Atitude registrada: Participação (+10 XP). Você subiu para o nível 4!");
      });

      it("deve incluir a descida de nível na mensagem", async() => {
        await service.notifyAttitudeApplied(ALUNO_ID, {
          log,
          attitude: { _id: ATITUDE_ID, name: "Atraso" },
          xp_applied: -5,
          progression: DESCEU,
        });

        expect(notificado().message).toBe("Atitude registrada: Atraso (-5 XP). Você voltou para o nível 2.");
      });

      it("não deve notificar quando nenhum XP foi aplicado por causa do piso", async() => {
        const resultado = await service.notifyAttitudeApplied(ALUNO_ID, {
          log,
          attitude: participacao,
          xp_applied: 0,
          progression: SEM_MUDANCA,
        });

        expect(resultado).toBeNull();
        expect(repository.create).not.toHaveBeenCalled();
      });
    });

    describe("notifyAttitudeChanged", () => {
      it("deve notificar a atitude nova com a diferença de XP", async() => {
        await service.notifyAttitudeChanged(ALUNO_ID, {
          log,
          attitude: { _id: ATITUDE_ID, name: "Liderança" },
          xp_applied: 15,
          progression: SEM_MUDANCA,
        });

        expect(notificado()).toEqual({
          user: ALUNO_ID,
          type: "attitude",
          message: "Uma atitude registrada foi alterada para Liderança (+15 XP).",
          data: { xp: 15, attitude_log: LOG_ID, attitude: ATITUDE_ID },
        });
      });

      it("não deve notificar quando a troca não mudou o XP", async() => {
        await service.notifyAttitudeChanged(ALUNO_ID, { log, attitude: participacao, xp_applied: 0 });

        expect(repository.create).not.toHaveBeenCalled();
      });
    });

    describe("notifyAttitudeRemoved", () => {
      it("deve notificar o estorno com o nome da atitude", async() => {
        await service.notifyAttitudeRemoved(ALUNO_ID, { attitude: participacao, xp_applied: -10, progression: SEM_MUDANCA });

        expect(notificado()).toEqual({
          user: ALUNO_ID,
          type: "attitude",
          message: "A atitude Participação registrada para você foi removida (-10 XP).",
          data: { xp: -10, attitude: ATITUDE_ID },
        });
      });

      it("deve usar um texto genérico quando a atitude não existir mais", async() => {
        await service.notifyAttitudeRemoved(ALUNO_ID, { attitude: null, xp_applied: 5, progression: SEM_MUDANCA });

        expect(notificado().message).toBe("Uma atitude registrada para você foi removida (+5 XP).");
        expect(notificado().data).toEqual({ xp: 5, attitude: null });
      });

      it("não deve notificar quando o estorno não mudou o XP", async() => {
        await service.notifyAttitudeRemoved(ALUNO_ID, { attitude: participacao, xp_applied: 0 });

        expect(repository.create).not.toHaveBeenCalled();
      });
    });

    describe("notifyXpAdjustment", () => {
      it("deve notificar o ajuste com o motivo", async() => {
        await service.notifyXpAdjustment(ALUNO_ID, {
          adjustment: { _id: AJUSTE_ID, reason: "Feira de idiomas" },
          xp_applied: 30,
          progression: SUBIU,
        });

        expect(notificado()).toEqual({
          user: ALUNO_ID,
          type: "xp_adjustment",
          message: "Seu XP foi ajustado (+30 XP). Motivo: Feira de idiomas. Você subiu para o nível 4!",
          data: { xp: 30, xp_adjustment: AJUSTE_ID },
        });
      });

      it("deve omitir o motivo quando o ajuste não tiver", async() => {
        await service.notifyXpAdjustment(ALUNO_ID, {
          adjustment: { _id: AJUSTE_ID },
          xp_applied: -20,
          progression: SEM_MUDANCA,
        });

        expect(notificado().message).toBe("Seu XP foi ajustado (-20 XP).");
      });

      it("não deve notificar quando o piso impediu o ajuste", async() => {
        await service.notifyXpAdjustment(ALUNO_ID, { adjustment: { _id: AJUSTE_ID }, xp_applied: 0 });

        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("notifyNewMission", () => {
    const missao = { _id: MISSAO_ID, title: "Explorador de Palavras", xp_reward: 100 };

    it("deve notificar todos os alunos com a turma, o título e o XP da missão", async() => {
      repository.createMany.mockResolvedValue([]);

      await service.notifyNewMission([ALUNO_ID, OUTRO_ALUNO_ID], { mission: missao, className: "Turma A" });

      const mensagem = "Nova missão na turma Turma A: Explorador de Palavras. Vale até 100 XP.";
      expect(repository.createMany).toHaveBeenCalledWith([
        { user: ALUNO_ID, type: "new_mission", message: mensagem, data: { mission: MISSAO_ID } },
        { user: OUTRO_ALUNO_ID, type: "new_mission", message: mensagem, data: { mission: MISSAO_ID } },
      ]);
    });

    it("deve omitir o XP quando a missão não der recompensa", async() => {
      repository.createMany.mockResolvedValue([]);

      await service.notifyNewMission([ALUNO_ID], { mission: { ...missao, xp_reward: 0 }, className: "Turma A" });

      expect(repository.createMany.mock.calls[0][0][0].message).toBe("Nova missão na turma Turma A: Explorador de Palavras.");
    });

    it("não deve acessar o banco quando a turma não tiver alunos ativos", async() => {
      await service.notifyNewMission([], { mission: missao, className: "Turma A" });

      expect(repository.createMany).not.toHaveBeenCalled();
    });
  });

  describe("removeMissionNotifications", () => {
    it("deve apagar as notificações da missão", async() => {
      repository.deleteByMission.mockResolvedValue(3);

      const resultado = await service.removeMissionNotifications(MISSAO_ID);

      expect(repository.deleteByMission).toHaveBeenCalledWith(MISSAO_ID);
      expect(resultado).toBe(3);
    });

    it("não deve lançar erro quando a remoção falhar, só registrar no log", async() => {
      repository.deleteByMission.mockRejectedValue(new Error("banco fora do ar"));

      const resultado = await service.removeMissionNotifications(MISSAO_ID);

      expect(resultado).toBe(0);
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
