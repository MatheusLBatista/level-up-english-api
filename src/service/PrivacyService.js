import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";
import XpAdjustmentRepository from "../repository/XpAdjustmentRepository.js";
import MissionRepository from "../repository/MissionRepository.js";
import NotificationRepository from "../repository/NotificationRepository.js";
import RankingRepository from "../repository/RankingRepository.js";
import AnonymizationService from "./AnonymizationService.js";
import { findAccessibleStudent } from "../utils/StudentAccessHelper.js";

const ACCESS_MESSAGES = {
  ownOnly: "Você não pode acessar os dados de outro aluno.",
  teacherOnly: "Você só pode acessar os dados de alunos das suas turmas.",
};

const refOf = (doc) => (doc ? { _id: String(doc._id), name: doc.name } : null);

class PrivacyService {
  constructor({
    userRepository = new UserRepository(),
    classRepository = new ClassRepository(),
    attitudeLogRepository = new AttitudeLogRepository(),
    xpAdjustmentRepository = new XpAdjustmentRepository(),
    missionRepository = new MissionRepository(),
    notificationRepository = new NotificationRepository(),
    rankingRepository = new RankingRepository(),
    anonymizationService = new AnonymizationService(),
  } = {}) {
    this.userRepository = userRepository;
    this.classRepository = classRepository;
    this.attitudeLogRepository = attitudeLogRepository;
    this.xpAdjustmentRepository = xpAdjustmentRepository;
    this.missionRepository = missionRepository;
    this.notificationRepository = notificationRepository;
    this.rankingRepository = rankingRepository;
    this.anonymizationService = anonymizationService;
  }

  async findStudent(id, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const student = await findAccessibleStudent(this, id, loggedUser, ACCESS_MESSAGES);
    return { loggedUser, student };
  }

  async eraseStudent(id, req) {
    const { loggedUser, student } = await this.findStudent(id, req);

    return await this.anonymizationService.anonymize(student._id, {
      reason: "holder_request",
      performedBy: loggedUser._id,
    });
  }

  async exportStudentData(id, req) {
    const { student } = await this.findStudent(id, req);

    const progress = student.mission_progress ?? [];

    const [classDoc, recorders, missions, attitudeLogs, adjustments, notifications, rankings] = await Promise.all([
      student.class ? this.classRepository.findPlainById(student.class) : null,
      student.guardian_consent_recorded_by ? this.userRepository.findByIds([student.guardian_consent_recorded_by]) : [],
      progress.length ? this.missionRepository.findTitlesByIds(progress.map((entry) => entry.mission_id)) : [],
      this.attitudeLogRepository.findByStudent(student._id),
      this.xpAdjustmentRepository.findByStudent(student._id),
      this.notificationRepository.findAllByUser(student._id),
      this.rankingRepository.findContainingUser(student._id),
    ]);

    const titles = new Map(missions.map((mission) => [String(mission._id), mission.title]));

    return {
      exported_at: new Date().toISOString(),
      student: {
        _id: String(student._id),
        name: student.name,
        email: student.email,
        role: student.role,
        class: refOf(classDoc),
        xp: student.xp,
        level: student.level,
        badges: student.badges ?? [],
        avatar_url: student.avatar_url ?? null,
        active: student.active,
        show_in_global_ranking: student.show_in_global_ranking !== false,
        deactivated_at: student.deactivated_at ?? null,
        anonymized_at: student.anonymized_at ?? null,
        guardian_consent_at: student.guardian_consent_at ?? null,
        guardian_consent_recorded_by: refOf(recorders[0]),
        guardian_consent_revoked_at: student.guardian_consent_revoked_at ?? null,
        createdAt: student.createdAt ?? null,
        updatedAt: student.updatedAt ?? null,
      },
      mission_progress: progress.map((entry) => ({
        mission: { _id: String(entry.mission_id), title: titles.get(String(entry.mission_id)) ?? null },
        done: entry.done,
        score: entry.score,
        xp_earned: entry.xp_earned,
        completed_at: entry.completed_at ?? null,
      })),
      attitude_logs: attitudeLogs.map((log) => ({
        attitude: log.attitude?.name ?? null,
        teacher: log.teacher?.name ?? null,
        xp_applied: log.xp_applied,
        applied_at: log.applied_at ?? null,
      })),
      xp_adjustments: adjustments.map((adjustment) => ({
        teacher: adjustment.teacher?.name ?? null,
        amount: adjustment.amount,
        xp_applied: adjustment.xp_applied,
        reason: adjustment.reason ?? null,
        applied_at: adjustment.applied_at ?? null,
      })),
      notifications: notifications.map((notification) => ({
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt ?? null,
      })),
      rankings: rankings.map((ranking) => ({
        type: ranking.type,
        class: refOf(ranking.class),
        position: ranking.entries.findIndex((entry) => String(entry.user) === String(student._id)) + 1,
        updatedAt: ranking.updatedAt ?? null,
      })),
    };
  }
}

export default PrivacyService;
