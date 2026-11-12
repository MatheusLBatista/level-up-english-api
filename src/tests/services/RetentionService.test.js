import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import RetentionService, {
  DEFAULT_RETENTION_MONTHS,
  retentionCutoff,
  retentionMonthsFromEnv,
} from "../../service/RetentionService.js";
import AnonymizationService from "../../service/AnonymizationService.js";
import LocalDiskStorage from "../../utils/LocalDiskStorage.js";
import User from "../../models/User.js";
import Notification from "../../models/Notification.js";
import XpAdjustment from "../../models/XpAdjustment.js";
import DataErasureLog from "../../models/DataErasureLog.js";
import logger from "../../utils/logger.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("RetentionService", () => {
  describe("retentionMonthsFromEnv", () => {
    it.each([undefined, ""])("deve usar 12 meses quando a variável vier %p", (valor) => {
      expect(retentionMonthsFromEnv(valor)).toBe(12);
      expect(DEFAULT_RETENTION_MONTHS).toBe(12);
    });

    it("deve aceitar um número inteiro de meses", () => {
      expect(retentionMonthsFromEnv("24")).toBe(24);
    });

    it.each(["0", "-3", "1.5", "doze"])("deve recusar o valor %p", (valor) => {
      expect(() => retentionMonthsFromEnv(valor)).toThrow(`(recebido: "${valor}")`);
    });

    it("deve ler RETENTION_MONTHS do ambiente por padrão", () => {
      process.env.RETENTION_MONTHS = "6";

      expect(retentionMonthsFromEnv()).toBe(6);
      delete process.env.RETENTION_MONTHS;
    });
  });

  describe("retentionCutoff", () => {
    it("deve voltar a quantidade de meses a partir de agora", () => {
      const agora = new Date("2026-11-12T03:30:00.000Z");

      expect(retentionCutoff(agora, 12)).toEqual(new Date("2025-11-12T03:30:00.000Z"));
      expect(agora).toEqual(new Date("2026-11-12T03:30:00.000Z"));
    });
  });

  describe("run", () => {
    let userRepository;
    let erasureLogRepository;
    let anonymizationService;
    let service;

    const AGORA = new Date("2026-11-12T03:30:00.000Z");

    beforeEach(() => {
      userRepository = {
        findIdsToAnonymize: jest.fn().mockResolvedValue([]),
        findNotAnonymizedStudentIds: jest.fn().mockResolvedValue([]),
      };
      erasureLogRepository = { findErasedUserIds: jest.fn().mockResolvedValue([]) };
      anonymizationService = { anonymize: jest.fn() };
      service = new RetentionService({ userRepository, erasureLogRepository, anonymizationService });
    });

    it("deve anonimizar os vencidos pelo prazo e registrar a eliminação", async() => {
      userRepository.findIdsToAnonymize.mockResolvedValue(["a", "b"]);

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(userRepository.findIdsToAnonymize).toHaveBeenCalledWith(new Date("2025-11-12T03:30:00.000Z"));
      expect(anonymizationService.anonymize).toHaveBeenCalledWith("a", { reason: "retention" });
      expect(anonymizationService.anonymize).toHaveBeenCalledWith("b", { reason: "retention" });
      expect(resumo).toEqual({
        months: 12,
        cutoff: new Date("2025-11-12T03:30:00.000Z"),
        anonymized: 2,
        reapplied: 0,
        failed: [],
      });
    });

    it("deve reaplicar sem registro novo a anonimização de quem voltou com um backup", async() => {
      erasureLogRepository.findErasedUserIds.mockResolvedValue(["r", "ok"]);
      userRepository.findNotAnonymizedStudentIds.mockResolvedValue(["r"]);

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(userRepository.findNotAnonymizedStudentIds).toHaveBeenCalledWith(["r", "ok"]);
      expect(anonymizationService.anonymize).toHaveBeenCalledWith("r", { reason: "retention", record: false });
      expect(resumo.reapplied).toBe(1);
    });

    it("não deve anonimizar duas vezes quem é restaurado e também está vencido", async() => {
      erasureLogRepository.findErasedUserIds.mockResolvedValue(["r"]);
      userRepository.findNotAnonymizedStudentIds.mockResolvedValue(["r"]);
      userRepository.findIdsToAnonymize.mockResolvedValue(["r", "v"]);

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(anonymizationService.anonymize).toHaveBeenCalledTimes(2);
      expect(resumo).toMatchObject({ reapplied: 1, anonymized: 1 });
    });

    it("deve seguir com os demais e listar só o id e o erro de quem falhar", async() => {
      userRepository.findIdsToAnonymize.mockResolvedValue(["a", "b"]);
      erasureLogRepository.findErasedUserIds.mockResolvedValue(["r"]);
      userRepository.findNotAnonymizedStudentIds.mockResolvedValue(["r"]);
      anonymizationService.anonymize
        .mockRejectedValueOnce(new Error("disco cheio"))
        .mockRejectedValueOnce(new Error("EACCES"))
        .mockResolvedValueOnce({});
      const logError = jest.spyOn(logger, "error").mockImplementation(() => {});

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(resumo.anonymized).toBe(1);
      expect(resumo.reapplied).toBe(0);
      expect(resumo.failed).toEqual([{ user: "r", error: "disco cheio" }, { user: "a", error: "EACCES" }]);
      expect(logError).toHaveBeenCalledTimes(2);
      logError.mockRestore();
    });

    it("deve usar o prazo do ambiente e a data atual quando nada for informado", async() => {
      process.env.RETENTION_MONTHS = "3";

      const resumo = await service.run();

      expect(resumo.months).toBe(3);
      expect(resumo.cutoff.getTime()).toBeLessThan(Date.now());
      delete process.env.RETENTION_MONTHS;
    });

    it("deve montar as dependências padrão quando nada for injetado", () => {
      const padrao = new RetentionService();

      expect(padrao.anonymizationService).toBeInstanceOf(AnonymizationService);
    });
  });

  describe("com banco de verdade", () => {
    const AGORA = new Date("2026-11-12T03:30:00.000Z");
    const baseDir = path.join(os.tmpdir(), `levelup-retention-${process.pid}`);
    let storage;
    let service;

    beforeAll(async() => {
      await connectTestDatabase();
      storage = new LocalDiskStorage(baseDir);
      service = new RetentionService({ anonymizationService: new AnonymizationService({ storage }) });
    });

    afterAll(async() => {
      await disconnectTestDatabase();
      await fs.rm(baseDir, { recursive: true, force: true });
    });

    beforeEach(async() => {
      await clearTestDatabase();
    });

    const aluno = (dados) => User.create({ role: "student", password: "hash", ...dados });

    it("deve anonimizar só o aluno desativado há mais que o prazo, limpando foto, notificações e motivos", async() => {
      await storage.save("avatars/vencido.webp", Buffer.from("foto"));
      const vencido = await aluno({
        name: "Vencido",
        email: "vencido@escola.com",
        xp: 420,
        active: false,
        deactivated_at: new Date("2025-10-01"),
        avatar_url: "/uploads/avatars/vencido.webp",
        refreshtoken: "token",
      });
      const noPrazo = await aluno({
        name: "No prazo",
        email: "noprazo@escola.com",
        active: false,
        deactivated_at: new Date("2026-01-01"),
      });
      const ativo = await aluno({ name: "Ativo", email: "ativo@escola.com" });
      const professora = await User.create({
        name: "Professora",
        email: "prof@escola.com",
        role: "teacher",
        active: false,
        deactivated_at: new Date("2020-01-01"),
      });
      await Notification.create([
        { user: vencido._id, type: "attitude", message: "Você ganhou XP" },
        { user: ativo._id, type: "attitude", message: "Você ganhou XP" },
      ]);
      await XpAdjustment.create([
        { student: vencido._id, teacher: professora._id, amount: 10, reason: "Faltou por doença" },
        { student: ativo._id, teacher: professora._id, amount: 10, reason: "Participação" },
      ]);

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(resumo).toMatchObject({ anonymized: 1, reapplied: 0, failed: [] });

      const salvo = await User.findById(vencido._id).select("+password +refreshtoken");
      expect(salvo).toMatchObject({
        name: "Aluno removido",
        email: `removido-${vencido._id}@anonimizado.invalid`,
        avatar_url: null,
        password: null,
        refreshtoken: null,
        xp: 420,
      });
      expect(salvo.anonymized_at).toBeInstanceOf(Date);
      await expect(fs.access(path.join(baseDir, "avatars/vencido.webp"))).rejects.toThrow();
      expect(await Notification.countDocuments({ user: vencido._id })).toBe(0);
      expect(await Notification.countDocuments({ user: ativo._id })).toBe(1);
      expect((await XpAdjustment.findOne({ student: vencido._id })).reason).toBeNull();
      expect((await XpAdjustment.findOne({ student: ativo._id })).reason).toBe("Participação");

      const registros = await DataErasureLog.find().lean();
      expect(registros).toHaveLength(1);
      expect(registros[0]).toMatchObject({ user: vencido._id, reason: "retention", performed_by: null });

      expect((await User.findById(noPrazo._id)).name).toBe("No prazo");
      expect((await User.findById(professora._id)).name).toBe("Professora");
    });

    it("deve reaplicar a anonimização de um aluno que voltou com a restauração de um backup", async() => {
      const restaurado = await aluno({ name: "Restaurado", email: "restaurado@escola.com" });
      await DataErasureLog.create({ user: restaurado._id, reason: "holder_request" });

      const resumo = await service.run({ now: AGORA, months: 12 });

      expect(resumo).toMatchObject({ anonymized: 0, reapplied: 1 });
      expect((await User.findById(restaurado._id)).name).toBe("Aluno removido");
      expect(await DataErasureLog.countDocuments()).toBe(1);
    });

    it("deve ser idempotente", async() => {
      await aluno({ name: "Vencido", email: "vencido@escola.com", active: false, deactivated_at: new Date("2025-01-01") });

      await service.run({ now: AGORA, months: 12 });
      const segunda = await service.run({ now: AGORA, months: 12 });

      expect(segunda).toMatchObject({ anonymized: 0, reapplied: 0, failed: [] });
      expect(await DataErasureLog.countDocuments()).toBe(1);
    });
  });
});
