import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import MissionRepository from "../repository/MissionRepository.js";
import UserRepository from "../repository/UserRepository.js";
import ProgressionService from "./ProgressionService.js";
import Class from "../models/Class.js";

class MissionService {
  constructor() {
    this.repository = new MissionRepository();
    this.userRepository = new UserRepository();
    this.progressionService = new ProgressionService();
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

    await this.validateTitle(parsedData.title);

    const mission = await this.repository.create({
      ...parsedData,
      createdBy: req.user_id,
    });

    await Class.findByIdAndUpdate(parsedData.class_id, {
      $addToSet: { missions: mission._id },
    });

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

    if (parsedData.title) {
      await this.validateTitle(parsedData.title, id);
    }

    if (parsedData.class_id) {
      const targetClass = await this.ensureClassExists(parsedData.class_id);

      this.ensureOwnsClass(targetClass, loggedUser);

      const oldClassId = String(mission.class_id?._id ?? mission.class_id);
      const newClassId = String(parsedData.class_id);

      if (oldClassId !== newClassId) {
        await Class.findByIdAndUpdate(oldClassId, { $pull: { missions: mission._id } });
        await Class.findByIdAndUpdate(newClassId, { $addToSet: { missions: mission._id } });
      }
    }

    return await this.repository.update(id, parsedData);
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

    const progressData = { done, score };

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
      correct_answers,
      total_questions,
      xp_earned,
      credited_so_far: credited_so_far + xp_earned,
      already_rewarded: credited_so_far > 0,
      progression,
    };
  }

  resolveScore(mission, { score, answers }) {
    if (mission.type !== "quiz") {
      if (score === undefined) {
        throw new CustomError({
          statusCode: HttpStatusCodes.BAD_REQUEST.code,
          errorType: "validationError",
          field: "score",
          details: [],
          customMessage: "O score é obrigatório para missões que não são do tipo quiz.",
        });
      }

      return { score, correct_answers: null, total_questions: null };
    }

    const questions = mission.questions ?? [];

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

  async validateTitle(title, excludeId = null) {
    const existing = await this.repository.findByTitle(title, excludeId);
    if (existing) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "title",
        details: [{ path: "title", message: "Já existe uma missão com este título." }],
        customMessage: "Título já cadastrado.",
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
