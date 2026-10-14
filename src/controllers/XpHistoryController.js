import XpHistoryService from "../service/XpHistoryService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class XpHistoryController {
  constructor() {
    this.service = new XpHistoryService();
  }

  async list(req, res) {
    const data = await this.service.list(req.params.id, req);
    return CommonResponse.success(res, data);
  }
}

export default XpHistoryController;
