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

const formatXp = (xp) => `${xp > 0 ? "+" : ""}${xp} XP`;

const levelChange = (progression) => {
  if (progression?.leveled_up) return ` Você subiu para o nível ${progression.level}!`;
  if (progression?.leveled_down) return ` Você voltou para o nível ${progression.level}.`;
  return "";
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

  async notifyAttitudeApplied(studentId, { log, attitude, xp_applied, progression }) {
    if (!xp_applied) return null;

    return await this.notify(
      studentId,
      "attitude",
      `Atitude registrada: ${attitude.name} (${formatXp(xp_applied)}).${levelChange(progression)}`,
      { xp: xp_applied, attitude_log: String(log._id), attitude: String(attitude._id) },
    );
  }

  async notifyAttitudeChanged(studentId, { log, attitude, xp_applied, progression }) {
    if (!xp_applied) return null;

    return await this.notify(
      studentId,
      "attitude",
      `Uma atitude registrada foi alterada para ${attitude.name} (${formatXp(xp_applied)}).${levelChange(progression)}`,
      { xp: xp_applied, attitude_log: String(log._id), attitude: String(attitude._id) },
    );
  }

  async notifyAttitudeRemoved(studentId, { attitude, xp_applied, progression }) {
    if (!xp_applied) return null;

    const name = attitude?.name ? `A atitude ${attitude.name}` : "Uma atitude";

    return await this.notify(
      studentId,
      "attitude",
      `${name} registrada para você foi removida (${formatXp(xp_applied)}).${levelChange(progression)}`,
      { xp: xp_applied, attitude: attitude?._id ? String(attitude._id) : null },
    );
  }

  async notifyXpAdjustment(studentId, { adjustment, xp_applied, progression }) {
    if (!xp_applied) return null;

    const reason = adjustment.reason ? ` Motivo: ${adjustment.reason}.` : "";

    return await this.notify(
      studentId,
      "xp_adjustment",
      `Seu XP foi ajustado (${formatXp(xp_applied)}).${reason}${levelChange(progression)}`,
      { xp: xp_applied, xp_adjustment: String(adjustment._id) },
    );
  }

  async notifyNewMission(studentIds, { mission, className }) {
    const reward = mission.xp_reward > 0 ? ` Vale até ${mission.xp_reward} XP.` : "";

    return await this.notifyMany(
      studentIds,
      "new_mission",
      `Nova missão na turma ${className}: ${mission.title}.${reward}`,
      { mission: String(mission._id) },
    );
  }

  async removeMissionNotifications(missionId) {
    try {
      return await this.repository.deleteByMission(missionId);
    } catch (error) {
      logger.error(`Falha ao remover as notificações da missão ${missionId}: ${error.message}`);
      return 0;
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
