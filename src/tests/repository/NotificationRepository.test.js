import NotificationRepository from "../../repository/NotificationRepository.js";

describe("NotificationRepository", () => {
  let modelo;
  let repository;

  const NOTIFICACAO_ID = "507f1f77bcf86cd799439051";
  const ALUNO_ID = "507f1f77bcf86cd799439001";
  const OUTRO_ALUNO_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();

    modelo = jest.fn();
    repository = new NotificationRepository({ notificationModel: modelo });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salva = { _id: NOTIFICACAO_ID, type: "attitude" };
      const save = jest.fn().mockResolvedValue(salva);
      modelo.mockImplementation(() => ({ save }));

      const dados = { user: ALUNO_ID, type: "attitude", message: "Você ganhou 50 XP", data: { xp: 50 } };
      const resultado = await repository.create(dados);

      expect(modelo).toHaveBeenCalledWith(dados);
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salva);
    });

    it("deve usar o model Notification por padrão", () => {
      const padrao = new NotificationRepository();

      expect(padrao.notificationModel.modelName).toBe("notifications");
    });
  });

  describe("createMany", () => {
    it("deve inserir todas as notificações de uma vez", async() => {
      const lista = [
        { user: ALUNO_ID, type: "new_mission", message: "Nova missão" },
        { user: OUTRO_ALUNO_ID, type: "new_mission", message: "Nova missão" },
      ];
      modelo.insertMany = jest.fn().mockResolvedValue(lista);

      const resultado = await repository.createMany(lista);

      expect(modelo.insertMany).toHaveBeenCalledWith(lista);
      expect(resultado).toBe(lista);
    });
  });

  describe("listByUser", () => {
    it("deve paginar só as notificações do usuário, das mais recentes para as mais antigas", async() => {
      const pagina = { docs: [], totalDocs: 0 };
      modelo.paginate = jest.fn().mockResolvedValue(pagina);

      const resultado = await repository.listByUser(ALUNO_ID, { page: 2, limit: 5 });

      expect(modelo.paginate).toHaveBeenCalledWith(
        { user: ALUNO_ID },
        { page: 2, limit: 5, sort: { createdAt: -1 } },
      );
      expect(resultado).toBe(pagina);
    });

    it("deve usar a primeira página com 10 itens por padrão", async() => {
      modelo.paginate = jest.fn().mockResolvedValue({ docs: [] });

      await repository.listByUser(ALUNO_ID);

      expect(modelo.paginate).toHaveBeenCalledWith(
        { user: ALUNO_ID },
        { page: 1, limit: 10, sort: { createdAt: -1 } },
      );
    });
  });

  describe("countUnread", () => {
    it("deve contar só as não lidas do usuário", async() => {
      modelo.countDocuments = jest.fn().mockResolvedValue(3);

      const resultado = await repository.countUnread(ALUNO_ID);

      expect(modelo.countDocuments).toHaveBeenCalledWith({ user: ALUNO_ID, read: false });
      expect(resultado).toBe(3);
    });
  });

  describe("markAsRead", () => {
    it("deve marcar como lida filtrando pelo id e pelo dono", async() => {
      const atualizada = { _id: NOTIFICACAO_ID, read: true };
      modelo.findOneAndUpdate = jest.fn().mockResolvedValue(atualizada);

      const resultado = await repository.markAsRead(NOTIFICACAO_ID, ALUNO_ID);

      expect(modelo.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: NOTIFICACAO_ID, user: ALUNO_ID },
        { read: true },
        { new: true },
      );
      expect(resultado).toBe(atualizada);
    });

    it("deve devolver null quando a notificação for de outro usuário", async() => {
      modelo.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      const resultado = await repository.markAsRead(NOTIFICACAO_ID, OUTRO_ALUNO_ID);

      expect(resultado).toBeNull();
    });
  });

  describe("deleteByMission", () => {
    it("deve apagar as notificações que apontam para a missão e devolver quantas", async() => {
      const MISSAO_ID = "507f1f77bcf86cd799439031";
      modelo.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });

      const resultado = await repository.deleteByMission(MISSAO_ID);

      expect(modelo.deleteMany).toHaveBeenCalledWith({ "data.mission": MISSAO_ID });
      expect(resultado).toBe(5);
    });
  });

  describe("markAllAsRead", () => {
    it("deve marcar todas as não lidas do usuário e devolver quantas mudaram", async() => {
      modelo.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 4 });

      const resultado = await repository.markAllAsRead(ALUNO_ID);

      expect(modelo.updateMany).toHaveBeenCalledWith({ user: ALUNO_ID, read: false }, { read: true });
      expect(resultado).toBe(4);
    });
  });
});
