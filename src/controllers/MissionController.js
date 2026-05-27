import MissionService from "../service/MissionService.js";
import { CommonResponse, CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import { CreateMissionBodySchema, UpdateMissionBodySchema } from "../schemas/MissionSchema.js";

class MissionController {
  constructor() {
    this.service = new MissionService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async findById(req, res) {
    const { id } = req.params;
    const data = await this.service.findById(id, req);
    return CommonResponse.success(res, data);
  }

  async create(req, res) {
    const body = CreateMissionBodySchema.parse(req.body);
    const data = await this.service.create(body, req);
    return CommonResponse.created(res, data);
  }

  async update(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "ID da missão é obrigatório para atualizar.",
      });
    }

    const body = UpdateMissionBodySchema.parse(req.body);
    const data = await this.service.update(id, body, req);
    return CommonResponse.success(res, data, 200, "Missão atualizada com sucesso.");
  }

  async delete(req, res) {
    const { id } = req.params;
    
    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "ID da missão é obrigatório para excluir.",
      });
    }

    await this.service.delete(id, req);
    return CommonResponse.success(res, null, 200, "Missão excluída com sucesso.");
  }
}

export default MissionController;