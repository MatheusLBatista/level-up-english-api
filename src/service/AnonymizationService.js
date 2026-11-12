import UserRepository from "../repository/UserRepository.js";
import NotificationRepository from "../repository/NotificationRepository.js";
import XpAdjustmentRepository from "../repository/XpAdjustmentRepository.js";
import DataErasureLogRepository from "../repository/DataErasureLogRepository.js";
import RankingService from "./RankingService.js";
import LocalDiskStorage from "../utils/LocalDiskStorage.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import logger from "../utils/logger.js";

export const ANONYMIZED_NAME = "Aluno removido";
export const anonymizedEmail = (id) => `removido-${id}@anonimizado.invalid`;

class AnonymizationService {
  constructor({
    userRepository = new UserRepository(),
    notificationRepository = new NotificationRepository(),
    xpAdjustmentRepository = new XpAdjustmentRepository(),
    erasureLogRepository = new DataErasureLogRepository(),
    rankingService = new RankingService(),
    storage = new LocalDiskStorage(),
  } = {}) {
    this.userRepository = userRepository;
    this.notificationRepository = notificationRepository;
    this.xpAdjustmentRepository = xpAdjustmentRepository;
    this.erasureLogRepository = erasureLogRepository;
    this.rankingService = rankingService;
    this.storage = storage;
  }

  async anonymize(userId, { reason, performedBy = null, record = true }) {
    const user = await this.userRepository.findById(userId);

    if (user.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "student",
        details: [],
        customMessage: "Aluno não encontrado.",
      });
    }

    if (user.anonymized_at) {
      throw new CustomError({
        statusCode: HttpStatusCodes.CONFLICT.code,
        errorType: "conflictError",
        field: "User",
        details: [],
        customMessage: "Os dados deste aluno já foram eliminados.",
      });
    }

    await this.notificationRepository.deleteByUser(user._id);
    await this.xpAdjustmentRepository.clearReasonsByStudent(user._id);

    const avatarKey = this.storage.keyFromUrl(user.avatar_url);
    if (avatarKey) await this.storage.delete(avatarKey);

    const now = new Date();
    const anonymized = await this.userRepository.update(user._id, {
      name: ANONYMIZED_NAME,
      email: anonymizedEmail(user._id),
      avatar_url: null,
      password: null,
      accesstoken: null,
      refreshtoken: null,
      uniqueToken: null,
      password_recovery_code: null,
      exp_password_recovery_code: null,
      active: false,
      deactivated_at: user.deactivated_at ?? now,
      anonymized_at: now,
    });

    if (record) {
      await this.erasureLogRepository.create({ user: user._id, reason, performed_by: performedBy, performed_at: now });
    }

    if (user.active) await this.refreshRankings(user);

    return anonymized;
  }

  async refreshRankings(user) {
    try {
      await this.rankingService.refreshGlobal();
      if (user.class) await this.rankingService.refreshClass(user.class);
    } catch (err) {
      logger.error(`Falha ao atualizar os rankings após anonimizar o usuário ${user._id}: ${err.message}`);
    }
  }
}

export default AnonymizationService;
