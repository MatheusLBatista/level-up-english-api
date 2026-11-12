import PrivacyController from "../../controllers/PrivacyController.js";
import PrivacyService from "../../service/PrivacyService.js";

jest.mock("../../service/PrivacyService.js");

describe("PrivacyController", () => {
  let req;
  let res;
  let controller;

  const ALUNO_ID = "507f1f77bcf86cd799439004";

  beforeEach(() => {
    jest.clearAllMocks();
    PrivacyService.mockClear();

    req = { params: { id: ALUNO_ID }, body: {}, query: {}, user_id: "507f1f77bcf86cd799439001" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    controller = new PrivacyController();
  });

  describe("erase", () => {
    it("deve eliminar com a confirmação e devolver o registro anonimizado sem a senha", async() => {
      const anonimizado = { _id: ALUNO_ID, name: "Aluno removido" };
      controller.service.eraseStudent.mockResolvedValue({ toObject: () => ({ ...anonimizado, password: null }) });
      req.body = { confirm: true };

      await controller.erase(req, res);

      expect(controller.service.eraseStudent).toHaveBeenCalledWith(ALUNO_ID, req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Dados do aluno eliminados.", data: anonimizado, errors: [] });
    });

    it.each([
      ["sem corpo", undefined],
      ["sem confirmação", {}],
      ["com confirmação falsa", { confirm: false }],
      ["com confirmação em texto", { confirm: "true" }],
    ])("deve rejeitar %s sem chamar o service", async(_, corpo) => {
      req.body = corpo;

      await expect(controller.erase(req, res)).rejects.toMatchObject({
        issues: [expect.objectContaining({
          path: ["confirm"],
          message: "Confirme a eliminação definitiva dos dados do aluno.",
        })],
      });
      expect(controller.service.eraseStudent).not.toHaveBeenCalled();
    });
  });

  describe("exportData", () => {
    it("deve devolver os dados como anexo JSON nomeado pelo id do aluno", async() => {
      const exportado = { exported_at: "2026-11-12T00:00:00.000Z", student: { _id: ALUNO_ID } };
      controller.service.exportStudentData.mockResolvedValue(exportado);

      await controller.exportData(req, res);

      expect(controller.service.exportStudentData).toHaveBeenCalledWith(ALUNO_ID, req);
      expect(res.set).toHaveBeenCalledWith("Content-Disposition", `attachment; filename="dados-aluno-${ALUNO_ID}.json"`);
      expect(res.json).toHaveBeenCalledWith({ message: "Dados do aluno exportados.", data: exportado, errors: [] });
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.exportStudentData.mockRejectedValue(new Error("Aluno não encontrado."));

      await expect(controller.exportData(req, res)).rejects.toThrow("Aluno não encontrado.");
      expect(res.set).not.toHaveBeenCalled();
    });
  });
});
