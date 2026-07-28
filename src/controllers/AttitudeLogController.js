import AttitudeLogService from "../service/AttitudeLogService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { CreateAttitudeLogBodySchema } from "../schemas/AttitudeLogSchema.js";

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
}

export default AttitudeLogController;
