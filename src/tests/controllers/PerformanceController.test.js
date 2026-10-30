import { ZodError } from "zod";
import PerformanceController from "../../controllers/PerformanceController.js";
import PerformanceService from "../../service/PerformanceService.js";

jest.mock("../../service/PerformanceService.js");

describe("PerformanceController", () => {
  let req;
  let res;
  let controller;

  const STUDENT_ID = "507f1f77bcf86cd799439004";
  const USER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceService.mockClear();

    req = { params: { id: STUDENT_ID }, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new PerformanceController();
  });

  describe("getByStudent", () => {
    it("deve repassar o id do aluno e a requisição e devolver 200 com o desempenho", async() => {
      const desempenho = { student: { quiz: { score: 90, missions: 2 } } };
      controller.service.getByStudent.mockResolvedValue(desempenho);

      await controller.getByStudent(req, res);

      expect(controller.service.getByStudent).toHaveBeenCalledWith(STUDENT_ID, req, {});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: expect.any(String), data: desempenho, errors: [] });
    });

    it("deve repassar o período informado na querystring", async() => {
      req.query = { from: "2026-08-01T00:00:00-04:00", to: "2026-10-31T23:59:59-04:00" };

      await controller.getByStudent(req, res);

      expect(controller.service.getByStudent).toHaveBeenCalledWith(STUDENT_ID, req, req.query);
    });

    it.each([
      ["from sem fuso", { from: "2026-08-01T00:00:00" }],
      ["só a data", { to: "2026-10-31" }],
      ["texto qualquer", { from: "ontem" }],
      ["from depois de to", { from: "2026-10-31T00:00:00Z", to: "2026-08-01T00:00:00Z" }],
    ])("deve recusar o período com %s, sem chamar o service", async(_, query) => {
      req.query = query;

      await expect(controller.getByStudent(req, res)).rejects.toBeInstanceOf(ZodError);
      expect(controller.service.getByStudent).not.toHaveBeenCalled();
    });
  });
});
