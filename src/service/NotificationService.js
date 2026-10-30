import NotificationRepository from "../repository/NotificationRepository.js";
import logger from "../utils/logger.js";

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
}

export default NotificationService;
