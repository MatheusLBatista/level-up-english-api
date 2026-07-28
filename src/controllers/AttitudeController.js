import AttitudeService from "../service/AttitudeService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class AttitudeController {
  constructor() {
    this.service = new AttitudeService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }
}

export default AttitudeController;
