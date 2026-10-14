import XpHistoryController from "../../controllers/XpHistoryController.js";
import XpHistoryService from "../../service/XpHistoryService.js";

jest.mock("../../service/XpHistoryService.js");

describe("XpHistoryController", () => {
  let req;
  let res;
  let controller;

  const STUDENT_ID = "507f1f77bcf86cd799439004";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    XpHistoryService.mockClear();

    req = { params: { id: STUDENT_ID }, body: {}, query: { page: "2" }, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new XpHistoryController();
  });

  describe("list", () => {
    it("deve repassar o id do aluno e a requisição e devolver 200 com a página", async() => {
      const pagina = { docs: [{ kind: "attitude", xp: 10 }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(pagina);

      await controller.list(req, res);

      expect(controller.service.list).toHaveBeenCalledWith(STUDENT_ID, req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String), data: pagina, errors: [] });
    });

    it("deve propagar o erro do service", async() => {
      const erro = new Error("proibido");
      controller.service.list.mockRejectedValue(erro);

      await expect(controller.list(req, res)).rejects.toBe(erro);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
