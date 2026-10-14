import mongoose from "mongoose";
import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";
import XpAdjustmentRepository from "../repository/XpAdjustmentRepository.js";
import MissionRepository from "../repository/MissionRepository.js";
import { ensureTeacherOwnsClass } from "../utils/ClassOwnershipHelper.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const positiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const timeOf = (item) => (item.date ? new Date(item.date).getTime() : -Infinity);

// Mais recente primeiro; item sem data (dado legado) vai para o fim. O id
// desempata, para a ordem não variar entre páginas.
const byDateDesc = (a, b) => timeOf(b) - timeOf(a) || b.id.localeCompare(a.id);

class XpHistoryService {
  constructor({
    userRepository = new UserRepository(),
    classRepository = new ClassRepository(),
    attitudeLogRepository = new AttitudeLogRepository(),
    xpAdjustmentRepository = new XpAdjustmentRepository(),
    missionRepository = new MissionRepository(),
  } = {}) {
    this.userRepository = userRepository;
    this.classRepository = classRepository;
    this.attitudeLogRepository = attitudeLogRepository;
    this.xpAdjustmentRepository = xpAdjustmentRepository;
    this.missionRepository = missionRepository;
  }

  async list(studentId, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const student = await this.findAccessibleStudent(studentId, loggedUser);

    const [attitudeLogs, adjustments, missionItems] = await Promise.all([
      this.attitudeLogRepository.findByStudent(student._id),
      this.xpAdjustmentRepository.findByStudent(student._id),
      this.buildMissionItems(student),
    ]);

    // As três origens são juntadas e paginadas em memória: o volume por aluno
    // é pequeno (algumas dezenas de itens), e não há como paginar no banco uma
    // lista que vem de duas coleções e de um array dentro do usuário.
    const items = [
      ...attitudeLogs.map((log) => ({
        id: String(log._id),
        kind: "attitude",
        xp: log.xp_applied,
        title: log.attitude?.name ?? "Atitude removida",
        detail: log.teacher?.name ?? null,
        date: log.applied_at,
      })),
      ...adjustments.map((adjustment) => ({
        id: String(adjustment._id),
        kind: "adjustment",
        xp: adjustment.xp_applied,
        title: "Ajuste de XP",
        detail: adjustment.reason || null,
        teacher: adjustment.teacher?.name ?? null,
        date: adjustment.applied_at,
      })),
      ...missionItems,
    ].sort(byDateDesc);

    return this.paginate(items, req.query);
  }

  async buildMissionItems(student) {
    const progress = (student.mission_progress ?? []).filter((entry) => entry.xp_earned > 0);
    if (progress.length === 0) return [];

    const missions = await this.missionRepository.findTitlesByIds(progress.map((entry) => entry.mission_id));
    const titles = new Map(missions.map((mission) => [String(mission._id), mission.title]));

    return progress.map((entry) => ({
      id: String(entry.mission_id),
      kind: "mission",
      xp: entry.xp_earned,
      title: titles.get(String(entry.mission_id)) ?? "Missão removida",
      detail: `Melhor nota: ${entry.score ?? 0}%`,
      date: entry.completed_at,
    }));
  }

  async findAccessibleStudent(studentId, loggedUser) {
    if (loggedUser.role === "student") {
      if (String(studentId) !== String(loggedUser._id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "student",
          details: [],
          customMessage: "Você só pode ver o seu histórico de XP.",
        });
      }

      return loggedUser;
    }

    const [student] = mongoose.isValidObjectId(studentId)
      ? await this.userRepository.findByIds([studentId])
      : [];

    if (!student || student.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "student",
        details: [],
        customMessage: "Aluno não encontrado.",
      });
    }

    if (loggedUser.role === "teacher") {
      const classDoc = student.class ? await this.classRepository.findPlainById(student.class) : null;

      ensureTeacherOwnsClass(classDoc, loggedUser, "Você só pode ver o histórico de XP de alunos das suas turmas.");
    }

    return student;
  }

  paginate(items, query = {}) {
    const limit = Math.min(positiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const page = positiveInt(query.page, 1);
    const totalDocs = items.length;
    const totalPages = Math.ceil(totalDocs / limit) || 1;
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      docs: items.slice((page - 1) * limit, page * limit),
      totalDocs,
      limit,
      page,
      totalPages,
      hasPrevPage,
      hasNextPage,
      prevPage: hasPrevPage ? page - 1 : null,
      nextPage: hasNextPage ? page + 1 : null,
    };
  }
}

export default XpHistoryService;
