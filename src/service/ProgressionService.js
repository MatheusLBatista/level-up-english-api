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
   * Ajuste manual: como o applyXp, mas uma remoção nunca deixa o XP negativo.
   * Devolve quanto foi de fato aplicado, que pode ser menor que o pedido.
   */
  async adjustXp(studentId, amount) {
    const before = await this.userRepository.addXpWithFloor(studentId, amount);

    const previousXp = before.xp ?? 0;
    const xp = Math.max(previousXp + amount, Math.min(previousXp, 0));

    const previous_level = before.level;
    const level = calculateLevel(xp);

    if (level !== previous_level) {
      await this.userRepository.update(studentId, { level });
    }

    await this.refreshRankings(before);

    return {
      xp_applied: xp - previousXp,
      progression: {
        student: String(before._id),
        previous_level,
        leveled_up: level > previous_level,
        leveled_down: level < previous_level,
        ...getProgress(xp),
      },
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
