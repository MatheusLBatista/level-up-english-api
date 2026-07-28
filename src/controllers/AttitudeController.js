import AttitudeService from "../service/AttitudeService.js";
import { CommonResponse, CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import { CreateAttitudeBodySchema, UpdateAttitudeBodySchema } from "../schemas/AttitudeSchema.js";

class AttitudeController {
  constructor() {
    this.service = new AttitudeService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async create(req, res) {
    const body = CreateAttitudeBodySchema.parse(req.body);
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
        customMessage: "Attitude ID is required.",
      });
    }

    const body = UpdateAttitudeBodySchema.parse(req.body);
    const data = await this.service.update(id, body);
    return CommonResponse.success(res, data, 200, "Attitude updated successfully.");
  }
}

export default AttitudeController;
