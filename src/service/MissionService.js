import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import MissionRepository from "../repository/MissionRepository.js";
import UserRepository from "../repository/UserRepository.js";
import ProgressionService from "./ProgressionService.js";
import NotificationService from "./NotificationService.js";
import Class from "../models/Class.js";
import { getMissionContentIssues } from "../schemas/MissionSchema.js";
import logger from "../utils/logger.js";

const DUPLICATE_TITLE_MESSAGE = "Já existe uma missão com este título nesta turma.";

class MissionService {
  constructor() {
    this.repository = new MissionRepository();
    this.userRepository = new UserRepository();
    this.progressionService = new ProgressionService();
    this.notificationService = new NotificationService();
  }

  async list(req) {
    const id = req?.params?.id;
    if (id) return await this.findById(id, req);

    const loggedUser = await this.userRepository.findById(req.user_id);

    let query = req.query;

    if (loggedUser.role === "student") {
      if (!loggedUser.class) {
        return { docs: [], totalDocs: 0, page: 1, totalPages: 0 };
      }
      query = { ...req.query, class_id: String(loggedUser.class) };
    }

    const result = await this.repository.list({ query });

    if (loggedUser.role !== "student") return result;

    return { ...result, docs: result.docs.map((mission) => this.hideAnswers(mission)) };
  }

  async findById(id, req) {
    const { mission, loggedUser } = await this.findAccessible(id, req);

    return loggedUser.role === "student" ? this.hideAnswers(mission) : mission;
  }

  async findAccessible(id, req) {
    const mission = await this.repository.findById(id);
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (
      loggedUser.role === "student" &&
      String(mission.class_id?._id ?? mission.class_id) !== String(loggedUser.class)
    ) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Mission",
        details: [],
        customMessage: "Você não tem acesso a esta missão.",
      });
    }

    return { mission, loggedUser };
  }

  hideAnswers(mission) {
    const plain = typeof mission.toObject === "function" ? mission.toObject() : mission;

    if (!plain.questions?.length) return plain;

    return {
      ...plain,
      questions: plain.questions.map(({ correct_answer, ...question }) => question),
    };
  }

  async create(parsedData, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const classDoc = await this.ensureClassExists(parsedData.class_id);

    this.ensureOwnsClass(classDoc, loggedUser);

    await this.validateTitle(parsedData.title, parsedData.class_id);

    const mission = await this.repository.create({
      ...parsedData,
      createdBy: req.user_id,
    });

    await Class.findByIdAndUpdate(parsedData.class_id, {
      $addToSet: { missions: mission._id },
    });

    await this.notifyStudents(mission, classDoc);

    return mission;
  }

  async update(id, parsedData, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const mission = await this.repository.findById(id);

    if (
      loggedUser.role === "teacher" &&
      String(mission.createdBy?._id ?? mission.createdBy) !== String(loggedUser._id)
    ) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Mission",
        details: [],
        customMessage: "Você só pode editar missões que criou.",
      });
    }

    const contentIssues = getMissionContentIssues(mission.type, parsedData, {
      partial: true,
      hasSavedQuestions: (mission.questions?.length ?? 0) > 0,
    });

    if (contentIssues.length > 0) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: null,
        details: contentIssues,
        customMessage: `Erro de validação. ${contentIssues.length} campo(s) inválido(s).`,
      });
    }

    const oldClassId = String(mission.class_id?._id ?? mission.class_id);

    if (parsedData.class_id) {
      const targetClass = await this.ensureClassExists(parsedData.class_id);

      this.ensureOwnsClass(targetClass, loggedUser);
    }

    // Mudar só a turma também pode colidir com uma missão de mesmo título na
    // turma de destino, então a checagem usa o título e a turma finais.
    if (parsedData.title || parsedData.class_id) {
      await this.validateTitle(parsedData.title ?? mission.title, parsedData.class_id ?? oldClassId, id);
    }

    const updated = await this.repository.update(id, parsedData);

    const newClassId = parsedData.class_id ? String(parsedData.class_id) : oldClassId;

    if (oldClassId !== newClassId) {
      await Class.findByIdAndUpdate(oldClassId, { $pull: { missions: mission._id } });
      await Class.findByIdAndUpdate(newClassId, { $addToSet: { missions: mission._id } });
    }

    return updated;
  }

  async delete(id, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const mission = await this.repository.findById(id);

    if (
      loggedUser.role === "teacher" &&
      String(mission.createdBy?._id ?? mission.createdBy) !== String(loggedUser._id)
    ) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Mission",
        details: [],
        customMessage: "Você só pode excluir missões que criou.",
      });
    }

    await Class.findByIdAndUpdate(mission.class_id, {
      $pull: { missions: mission._id },
    });

    return await this.repository.delete(id);
  }

  async submitProgress(missionId, parsedData, req) {
    const { mission, loggedUser } = await this.findAccessible(missionId, req);

    if (!mission.active) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "mission",
        details: [],
        customMessage: "Esta missão está inativa.",
      });
    }

    const previous = await this.userRepository.findMissionProgress(loggedUser._id, missionId);
    const credited_so_far = previous?.xp_earned ?? 0;

    const { done } = parsedData;
    const { score, correct_answers, total_questions } = this.resolveScore(mission, parsedData);

    const entitled = done
      ? Math.round((mission.xp_reward ?? 0) * (score / 100))
      : 0;

    const xp_earned = Math.max(entitled - credited_so_far, 0);

    const best_score = Math.max(previous?.score ?? 0, score);
    const progressData = { done: done || previous?.done === true, score: best_score };

    if (xp_earned > 0) {
      progressData.xp_earned = credited_so_far + xp_earned;
      progressData.completed_at = previous?.completed_at ?? new Date();
    }

    await this.userRepository.upsertMissionProgress(loggedUser._id, missionId, progressData);

    const progression = xp_earned > 0
      ? await this.progressionService.applyXp(String(loggedUser._id), xp_earned)
      : null;

    return {
      mission: String(mission._id),
      student: String(loggedUser._id),
      done,
      score,
      best_score,
      correct_answers,
      total_questions,
      xp_earned,
      credited_so_far: credited_so_far + xp_earned,
      already_rewarded: credited_so_far > 0,
      progression,
    };
  }

  /** O score vem sempre do servidor; o enviado no corpo é ignorado em todos os tipos. */
  resolveScore(mission, { answers, done }) {
    const questions = mission.questions ?? [];

    if (questions.length === 0 && mission.type !== "quiz") {
      // Vocabulário ou áudio antigo, cadastrado antes das perguntas de checagem.
      return { score: done ? 100 : 0, correct_answers: null, total_questions: null };
    }

    if (questions.length === 0) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "mission",
        details: [],
        customMessage: "Esta missão de quiz não possui questões cadastradas.",
      });
    }

    if (!answers || answers.length !== questions.length) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "answers",
        details: [],
        customMessage: `Envie exatamente ${questions.length} respostas, na ordem das questões.`,
      });
    }

    const correct_answers = questions.reduce(
      (total, question, index) => total + (question.correct_answer === answers[index] ? 1 : 0),
      0,
    );

    return {
      score: Math.round((correct_answers / questions.length) * 100),
      correct_answers,
      total_questions: questions.length,
    };
  }

  /** O título é único por turma; missão desativada continua ocupando o título. */
  async validateTitle(title, classId, excludeId = null) {
    const existing = await this.repository.findByTitleInClass(title, classId, excludeId);
    if (existing) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "title",
        details: [{ path: "title", message: DUPLICATE_TITLE_MESSAGE }],
        customMessage: "Título já cadastrado nesta turma.",
      });
    }
  }

  /**
   * Professor só põe missão em turma que é dele; admin não tem essa amarra.
   * Mesma regra que o ClassService aplica no update da turma.
   */
  ensureOwnsClass(classDoc, loggedUser) {
    if (loggedUser.role !== "teacher") return;

    const ownerId = classDoc.teacher?._id ?? classDoc.teacher;

    if (String(ownerId) !== String(loggedUser._id)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "class_id",
        details: [],
        customMessage: "Você só pode criar missões nas suas turmas.",
      });
    }
  }

  async notifyStudents(mission, classDoc) {
    try {
      const studentIds = await this.userRepository.findActiveStudentIdsByClass(classDoc._id);

      await this.notificationService.notifyNewMission(studentIds, { mission, className: classDoc.name });
    } catch (error) {
      logger.error(`Falha ao notificar os alunos sobre a missão ${mission._id}: ${error.message}`);
    }
  }

  async ensureClassExists(classId) {
    const cls = await Class.findById(classId);
    if (!cls) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "class_id",
        details: [],
        customMessage: "Turma não encontrada.",
      });
    }
    return cls;
  }
}

export default MissionService;
