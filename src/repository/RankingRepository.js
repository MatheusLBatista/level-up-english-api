import Ranking from "../models/Ranking.js";
import User from "../models/User.js";
import Class from "../models/Class.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class RankingRepository {
  constructor({ rankingModel = Ranking, userModel = User, classModel = Class } = {}) {
    this.rankingModel = rankingModel;
    this.userModel = userModel;
    this.classModel = classModel;
  }

  async findGlobal() {
    const ranking = await this.rankingModel
      .findOne({ type: "global" })
      .populate("entries.user", "name email level xp");

    if (!ranking) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Ranking",
        details: [],
        customMessage: messages.error.resourceNotFound("Ranking"),
      });
    }

    return ranking;
  }

  async findByClass(classId) {
    const ranking = await this.rankingModel
      .findOne({ type: "class", class: classId })
      .populate("entries.user", "name email level xp")
      .populate("class", "name");

    if (!ranking) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Ranking",
        details: [],
        customMessage: messages.error.resourceNotFound("Ranking"),
      });
    }

    return ranking;
  }

  /**
   * Alunos ativos ordenados por XP — base para montar as entradas do ranking.
   * Quando classId é informado, considera apenas os alunos daquela turma.
   */
  async listRankedUsers(classId = null) {
    const filter = { active: true, role: "student" };
    if (classId) filter.class = classId;

    return await this.userModel
      .find(filter)
      .select("_id xp level")
      .sort({ xp: -1, level: -1 });
  }

  async findActiveClasses() {
    return await this.classModel.find({ active: true }).select("_id");
  }

  async upsert({ type, classId = null, entries }) {
    const filter = type === "class" ? { type, class: classId } : { type };

    return await this.rankingModel.findOneAndUpdate(
      filter,
      { type, class: classId, entries, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
}

export default RankingRepository;
