import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import RankingRepository from "../repository/RankingRepository.js";
import UserRepository from "../repository/UserRepository.js";
import { calculateLevel } from "../utils/LevelHelper.js";

const MAX_ENTRIES = 30;

class RankingService {
  constructor() {
    this.repository = new RankingRepository();
    this.userRepository = new UserRepository();
  }

  async getGlobal() {
    return await this.repository.findGlobal();
  }

  async getByClass(classId, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role === "student" && String(loggedUser.class) !== String(classId)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Ranking",
        details: [],
        customMessage: "Você só pode ver o ranking da sua própria turma.",
      });
    }

    return await this.repository.findByClass(classId);
  }

  /**
   * Ranking da turma do aluno logado — atalho para o app do estudante.
   */
  async getMyClass(req) {
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (!loggedUser.class) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "class",
        details: [],
        customMessage: "Você não está matriculado em nenhuma turma.",
      });
    }

    return await this.repository.findByClass(loggedUser.class);
  }

  /**
   * Recalcula o ranking global e o de cada turma ativa a partir do XP atual dos alunos.
   */
  async refreshAll(req) {
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role !== "admin") {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Ranking",
        details: [],
        customMessage: "Apenas administradores podem recalcular os rankings.",
      });
    }

    const global = await this.refreshGlobal();

    const classes = await this.repository.findActiveClasses();
    const classRankings = [];

    for (const turma of classes) {
      classRankings.push(await this.refreshClass(turma._id));
    }

    return { global, classes: classRankings };
  }

  async refreshGlobal() {
    const users = await this.repository.listRankedUsers();

    return await this.repository.upsert({
      type: "global",
      entries: this.buildEntries(users),
    });
  }

  async refreshClass(classId) {
    const users = await this.repository.listRankedUsers(classId);

    return await this.repository.upsert({
      type: "class",
      classId,
      entries: this.buildEntries(users),
    });
  }

  /**
   * Monta as entradas do ranking já ordenadas e limitadas ao top MAX_ENTRIES.
   * O nível é recalculado a partir do XP para não depender de dados defasados.
   */
  buildEntries(users) {
    return users
      .map((user) => ({
        user: user._id,
        xp: user.xp || 0,
        level: calculateLevel(user.xp || 0),
      }))
      .sort((a, b) => b.xp - a.xp || b.level - a.level)
      .slice(0, MAX_ENTRIES);
  }
}

export default RankingService;
