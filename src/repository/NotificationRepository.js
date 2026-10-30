import Notification from "../models/Notification.js";

class NotificationRepository {
  constructor({ notificationModel = Notification } = {}) {
    this.notificationModel = notificationModel;
  }

  async create(data) {
    const notification = new this.notificationModel(data);
    return await notification.save();
  }

  async createMany(list) {
    return await this.notificationModel.insertMany(list);
  }

  async listByUser(userId, { page = 1, limit = 10 } = {}) {
    return await this.notificationModel.paginate(
      { user: userId },
      { page, limit, sort: { createdAt: -1 } },
    );
  }

  async countUnread(userId) {
    return await this.notificationModel.countDocuments({ user: userId, read: false });
  }

  async markAsRead(id, userId) {
    return await this.notificationModel.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true },
      { new: true },
    );
  }

  async deleteByMission(missionId) {
    const result = await this.notificationModel.deleteMany({ "data.mission": String(missionId) });
    return result.deletedCount;
  }

  async markAllAsRead(userId) {
    const result = await this.notificationModel.updateMany({ user: userId, read: false }, { read: true });
    return result.modifiedCount;
  }
}

export default NotificationRepository;
