import PerformanceService from "../service/PerformanceService.js";
import { PerformanceQuerySchema } from "../schemas/PerformanceSchema.js";
import { CommonResponse } from "../utils/helpers/index.js";

class PerformanceController {
  constructor() {
    this.service = new PerformanceService();
  }

  async getByStudent(req, res) {
    const period = PerformanceQuerySchema.parse(req.query);
    const data = await this.service.getByStudent(req.params.id, req, period);
    return CommonResponse.success(res, data);
  }
}

export default PerformanceController;
