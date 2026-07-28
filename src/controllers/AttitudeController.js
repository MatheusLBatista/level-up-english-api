import AttitudeService from "../service/AttitudeService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { CreateAttitudeBodySchema } from "../schemas/AttitudeSchema.js";

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
}

export default AttitudeController;
