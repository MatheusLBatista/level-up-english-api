import RankingService from "../service/RankingService.js";
import { CommonResponse, CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

class RankingController {
  constructor() {
    this.service = new RankingService();
  }

  async global(req, res) {
    const data = await this.service.getGlobal();
    return CommonResponse.success(res, data);
  }

  async myClass(req, res) {
    const data = await this.service.getMyClass(req);
    return CommonResponse.success(res, data);
  }

  async byClass(req, res) {
    const { classId } = req.params;

    if (!classId) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "classId",
        details: [],
        customMessage: "ID da turma é obrigatório para consultar o ranking.",
      });
    }

    const data = await this.service.getByClass(classId, req);
    return CommonResponse.success(res, data);
  }

  async refresh(req, res) {
    const data = await this.service.refreshAll(req);
    return CommonResponse.success(res, data, 200, "Rankings recalculados com sucesso.");
  }
}

export default RankingController;
