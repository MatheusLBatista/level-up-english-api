import NotificationService from "../service/NotificationService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class NotificationController {
  constructor() {
    this.service = new NotificationService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async unreadCount(req, res) {
    const data = await this.service.countUnread(req);
    return CommonResponse.success(res, data);
  }

  async markAsRead(req, res) {
    const data = await this.service.markAsRead(req.params.id, req);
    return CommonResponse.success(res, data);
  }

  async markAllAsRead(req, res) {
    const data = await this.service.markAllAsRead(req);
    return CommonResponse.success(res, data);
  }
}

export default NotificationController;
