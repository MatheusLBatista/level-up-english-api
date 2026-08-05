import UserRepository from "../repository/UserRepository.js";
import RankingService from "./RankingService.js";
import { calculateLevel, getProgress } from "../utils/LevelHelper.js";
import logger from "../utils/logger.js";

/**
 * Regras de progressão do aluno (XP, nível e reflexo no ranking).
 *
 * Concentra o que antes vivia apenas no AttitudeLogService, já que agora
 * tanto as atitudes quanto a conclusão de missões creditam XP.
 */
class ProgressionService {
  constructor() {
    this.userRepository = new UserRepository();
    this.rankingService = new RankingService();
  }

  async applyXp(studentId, xpDelta) {
    const student = await this.userRepository.update(studentId, {
      $inc: { xp: xpDelta },
    });

    const previous_level = student.level;
    const level = calculateLevel(student.xp);

    const updated = level === previous_level
      ? student
      : await this.userRepository.update(studentId, { level });

    await this.refreshRankings(updated);

    return {
      student: String(updated._id),
      previous_level,
      leveled_up: level > previous_level,
      leveled_down: level < previous_level,
      ...getProgress(updated.xp),
    };
  }

  /**
   * Mantém o ranking global e o da turma do aluno em dia após uma mudança de XP.
   * Falhas aqui não invalidam o XP já aplicado — apenas ficam registradas no log.
   */
  async refreshRankings(student) {
    try {
      await this.rankingService.refreshGlobal();

      if (student.class) {
        await this.rankingService.refreshClass(student.class);
      }
    } catch (error) {
      logger.error(
        `Falha ao atualizar rankings após mudança de XP do aluno ${student._id}: ${error.message}`,
      );
    }
  }
}

export default ProgressionService;
