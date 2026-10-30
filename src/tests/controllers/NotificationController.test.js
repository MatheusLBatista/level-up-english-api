import NotificationController from "../../controllers/NotificationController.js";
import NotificationService from "../../service/NotificationService.js";

jest.mock("../../service/NotificationService.js");

describe("NotificationController", () => {
  let req;
  let res;
  let controller;

  const NOTIFICACAO_ID = "507f1f77bcf86cd799439051";
  const USER_ID = "507f1f77bcf86cd799439001";

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationService.mockClear();

    req = { params: { id: NOTIFICACAO_ID }, body: {}, query: { page: "2" }, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new NotificationController();
  });

  const respondeuCom = (data) => {
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: expect.any(String), data, errors: [] });
  };

  describe("list", () => {
    it("deve repassar a requisição e devolver 200 com a página", async() => {
      const pagina = { docs: [{ type: "attitude" }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(pagina);

      await controller.list(req, res);

      expect(controller.service.list).toHaveBeenCalledWith(req);
      respondeuCom(pagina);
    });
  });

  describe("unreadCount", () => {
    it("deve devolver 200 com a quantidade de não lidas", async() => {
      controller.service.countUnread.mockResolvedValue({ unread: 3 });

      await controller.unreadCount(req, res);

      expect(controller.service.countUnread).toHaveBeenCalledWith(req);
      respondeuCom({ unread: 3 });
    });
  });

  describe("markAsRead", () => {
    it("deve repassar o id da notificação e devolver 200 com ela atualizada", async() => {
      const atualizada = { _id: NOTIFICACAO_ID, read: true };
      controller.service.markAsRead.mockResolvedValue(atualizada);

      await controller.markAsRead(req, res);

      expect(controller.service.markAsRead).toHaveBeenCalledWith(NOTIFICACAO_ID, req);
      respondeuCom(atualizada);
    });

    it("deve propagar o erro do service", async() => {
      const erro = new Error("não encontrada");
      controller.service.markAsRead.mockRejectedValue(erro);

      await expect(controller.markAsRead(req, res)).rejects.toBe(erro);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("deve devolver 200 com quantas foram marcadas", async() => {
      controller.service.markAllAsRead.mockResolvedValue({ updated: 4 });

      await controller.markAllAsRead(req, res);

      expect(controller.service.markAllAsRead).toHaveBeenCalledWith(req);
      respondeuCom({ updated: 4 });
    });
  });
});
