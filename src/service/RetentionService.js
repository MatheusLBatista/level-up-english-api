import UserRepository from "../repository/UserRepository.js";
import DataErasureLogRepository from "../repository/DataErasureLogRepository.js";
import AnonymizationService from "./AnonymizationService.js";
import logger from "../utils/logger.js";

export const DEFAULT_RETENTION_MONTHS = 12;

export function retentionMonthsFromEnv(value = process.env.RETENTION_MONTHS) {
  if (value === undefined || value === "") return DEFAULT_RETENTION_MONTHS;

  const months = Number(value);

  if (!Number.isInteger(months) || months < 1) {
    throw new Error(`RETENTION_MONTHS deve ser um número inteiro de meses maior que zero (recebido: "${value}").`);
  }

  return months;
}

export function retentionCutoff(now, months) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

class RetentionService {
  constructor({
    userRepository = new UserRepository(),
    erasureLogRepository = new DataErasureLogRepository(),
    anonymizationService = new AnonymizationService(),
  } = {}) {
    this.userRepository = userRepository;
    this.erasureLogRepository = erasureLogRepository;
    this.anonymizationService = anonymizationService;
  }

  async run({ now = new Date(), months = retentionMonthsFromEnv() } = {}) {
    const cutoff = retentionCutoff(now, months);
    const summary = { months, cutoff, anonymized: 0, reapplied: 0, failed: [] };

    const erasedIds = await this.erasureLogRepository.findErasedUserIds();
    const restoredIds = await this.userRepository.findNotAnonymizedStudentIds(erasedIds);
    const restored = new Set(restoredIds.map(String));

    for (const id of restoredIds) {
      if (await this.#anonymize(id, { reason: "retention", record: false }, summary)) summary.reapplied += 1;
    }

    const expiredIds = await this.userRepository.findIdsToAnonymize(cutoff);

    for (const id of expiredIds.filter((expiredId) => !restored.has(String(expiredId)))) {
      if (await this.#anonymize(id, { reason: "retention" }, summary)) summary.anonymized += 1;
    }

    return summary;
  }

  async #anonymize(id, options, summary) {
    try {
      await this.anonymizationService.anonymize(id, options);
      return true;
    } catch (err) {
      logger.error(`Falha ao anonimizar o usuário ${id} pela retenção: ${err.message}`);
      summary.failed.push({ user: String(id), error: err.message });
      return false;
    }
  }
}

export default RetentionService;
