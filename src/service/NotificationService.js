import mongoose from "mongoose";
import NotificationRepository from "../repository/NotificationRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";
import logger from "../utils/logger.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const positiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

class NotificationService {
  constructor() {
    this.repository = new NotificationRepository();
  }

  async notify(userId, type, message, data = {}) {
    try {
      return await this.repository.create({ user: userId, type, message, data });
    } catch (error) {
      logger.error(`Falha ao notificar o usuário ${userId} (${type}): ${error.message}`);
      return null;
    }
  }

  async notifyMany(userIds, type, message, data = {}) {
    if (!userIds?.length) return [];

    try {
      return await this.repository.createMany(
        userIds.map((userId) => ({ user: userId, type, message, data })),
      );
    } catch (error) {
      logger.error(`Falha ao notificar ${userIds.length} usuários (${type}): ${error.message}`);
      return [];
    }
  }

  async list(req) {
    const page = positiveInt(req.query?.page, 1);
    const limit = Math.min(positiveInt(req.query?.limit, DEFAULT_LIMIT), MAX_LIMIT);

    return await this.repository.listByUser(req.user_id, { page, limit });
  }

  async countUnread(req) {
    return { unread: await this.repository.countUnread(req.user_id) };
  }

  async markAsRead(id, req) {
    const notification = mongoose.isValidObjectId(id)
      ? await this.repository.markAsRead(id, req.user_id)
      : null;

    if (!notification) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "Notification",
        details: [],
        customMessage: messages.error.resourceNotFound("Notification"),
      });
    }

    return notification;
  }

  async markAllAsRead(req) {
    return { updated: await this.repository.markAllAsRead(req.user_id) };
  }
}

export default NotificationService;
