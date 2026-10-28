import PerformanceService from "../service/PerformanceService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class PerformanceController {
  constructor() {
    this.service = new PerformanceService();
  }

  async getByStudent(req, res) {
    const data = await this.service.getByStudent(req.params.id, req);
    return CommonResponse.success(res, data);
  }
}

export default PerformanceController;
