import XpAdjustmentService from "../service/XpAdjustmentService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { CreateXpAdjustmentBodySchema } from "../schemas/XpAdjustmentSchema.js";

class XpAdjustmentController {
  constructor() {
    this.service = new XpAdjustmentService();
  }

  async create(req, res) {
    const body = CreateXpAdjustmentBodySchema.parse(req.body);
    const data = await this.service.create(body, req);
    return CommonResponse.created(res, data);
  }
}

export default XpAdjustmentController;
