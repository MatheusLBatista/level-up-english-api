import AttitudeLogService from "../service/AttitudeLogService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class AttitudeLogController {
  constructor() {
    this.service = new AttitudeLogService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }
}

export default AttitudeLogController;
