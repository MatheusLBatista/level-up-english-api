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

    if (loggedUser.role === "student") {
      if (!loggedUser.class) {
        return { docs: [], totalDocs: 0, page: 1, totalPages: 0 };
      }
      req.query = { ...req.query, class_id: String(loggedUser.class) };
    }

    return await this.repository.list(req);
  }

  async findById(id, req) {
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

    return mission;
  }

  async create(parsedData, req) {
    await this.ensureClassExists(parsedData.class_id);

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
      await this.ensureClassExists(parsedData.class_id);

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

  /**
   * Registra a tentativa do aluno logado em uma missão.
   *
   * O XP é proporcional ao score (RF-006) e creditado uma única vez, na primeira
   * conclusão: refazer a missão atualiza o score registrado, mas não premia de novo.
   */
  async submitProgress(missionId, parsedData, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Mission",
        details: [],
        customMessage: "Apenas alunos podem registrar progresso em missões.",
      });
    }

    // Reaproveita a checagem de turma já existente em findById.
    const mission = await this.findById(missionId, req);

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
    const alreadyRewarded = Boolean(previous?.completed_at);

    const { score, done } = parsedData;
    const xp_earned = done && !alreadyRewarded
      ? Math.round((mission.xp_reward ?? 0) * (score / 100))
      : 0;

    const progressData = { done, score };

    if (done && !alreadyRewarded) {
      progressData.xp_earned = xp_earned;
      progressData.completed_at = new Date();
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
      xp_earned,
      already_rewarded: alreadyRewarded,
      progression,
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
