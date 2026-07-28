import AttitudeLogService from "../service/AttitudeLogService.js";
import { CommonResponse, CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import { CreateAttitudeLogBodySchema, UpdateAttitudeLogBodySchema } from "../schemas/AttitudeLogSchema.js";

class AttitudeLogController {
  constructor() {
    this.service = new AttitudeLogService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async create(req, res) {
    const body = CreateAttitudeLogBodySchema.parse(req.body);
    const data = await this.service.create(body, req);
    return CommonResponse.created(res, data);
  }

  async delete(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "AttitudeLog ID is required.",
      });
    }

    await this.service.delete(id);
    return CommonResponse.success(res, null, 200, "AttitudeLog deleted successfully.");
  }

  async update(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "AttitudeLog ID is required.",
      });
    }

    const body = UpdateAttitudeLogBodySchema.parse(req.body);
    const data = await this.service.update(id, body);
    return CommonResponse.success(res, data, 200, "AttitudeLog updated successfully.");
  }
}

export default AttitudeLogController;
