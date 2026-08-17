jest.mock("../../repository/UserRepository.js");
jest.mock("../../service/RankingService.js");

import ProgressionService from "../../service/ProgressionService.js";
import UserRepository from "../../repository/UserRepository.js";
import RankingService from "../../service/RankingService.js";
import { MAX_LEVEL, xpForLevel } from "../../utils/LevelHelper.js";

describe("ProgressionService", () => {
  let service;
  let userRepository;
  let rankingService;

  const ALUNO_ID = "507f1f77bcf86cd799439004";
  const TURMA_ID = "507f1f77bcf86cd799439011";

  const aluno = (overrides = {}) => ({
    _id: ALUNO_ID,
    xp: 0,
    level: 1,
    class: TURMA_ID,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    userRepository = { update: jest.fn() };
    rankingService = {
      refreshGlobal: jest.fn().mockResolvedValue({}),
      refreshClass: jest.fn().mockResolvedValue({}),
    };

    UserRepository.mockImplementation(() => userRepository);
    RankingService.mockImplementation(() => rankingService);

    service = new ProgressionService();
  });

  /** Primeira chamada de update devolve o aluno após o $inc; a segunda, após o novo nível. */
  const responderUpdate = (aposXp, aposNivel = aposXp) => {
    userRepository.update.mockResolvedValueOnce(aposXp).mockResolvedValueOnce(aposNivel);
  };

  describe("applyXp", () => {
    it("deve somar o XP com $inc, e não sobrescrever o total", () => {
      responderUpdate(aluno({ xp: 10 }));

      return service.applyXp(ALUNO_ID, 10).then(() => {
        expect(userRepository.update).toHaveBeenNthCalledWith(1, ALUNO_ID, { $inc: { xp: 10 } });
      });
    });

    it("deve aceitar XP negativo no estorno", async() => {
      responderUpdate(aluno({ xp: -5 }));

      await service.applyXp(ALUNO_ID, -5);

      expect(userRepository.update).toHaveBeenNthCalledWith(1, ALUNO_ID, { $inc: { xp: -5 } });
    });

    it("não deve gravar o nível quando ele não muda", async() => {
      responderUpdate(aluno({ xp: 50, level: 1 }));

      const resultado = await service.applyXp(ALUNO_ID, 50);

      expect(userRepository.update).toHaveBeenCalledTimes(1);
      expect(resultado.leveled_up).toBe(false);
      expect(resultado.leveled_down).toBe(false);
    });

    it("deve gravar o nível novo quando o aluno sobe", async() => {
      responderUpdate(aluno({ xp: 100, level: 1 }), aluno({ xp: 100, level: 2 }));

      const resultado = await service.applyXp(ALUNO_ID, 100);

      expect(userRepository.update).toHaveBeenNthCalledWith(2, ALUNO_ID, { level: 2 });
      expect(resultado.previous_level).toBe(1);
      expect(resultado.level).toBe(2);
      expect(resultado.leveled_up).toBe(true);
      expect(resultado.leveled_down).toBe(false);
    });

    it("deve gravar o nível novo quando o aluno desce", async() => {
      responderUpdate(aluno({ xp: 90, level: 2 }), aluno({ xp: 90, level: 1 }));

      const resultado = await service.applyXp(ALUNO_ID, -20);

      expect(userRepository.update).toHaveBeenNthCalledWith(2, ALUNO_ID, { level: 1 });
      expect(resultado.previous_level).toBe(2);
      expect(resultado.leveled_down).toBe(true);
      expect(resultado.leveled_up).toBe(false);
    });

    it("deve devolver a progressão do aluno junto com o resultado", async() => {
      responderUpdate(aluno({ xp: 500, level: 2 }), aluno({ xp: 500, level: 3 }));

      const resultado = await service.applyXp(ALUNO_ID, 100);

      expect(resultado).toEqual({
        student: ALUNO_ID,
        previous_level: 2,
        leveled_up: true,
        leveled_down: false,
        xp: 500,
        level: 3,
        current_level_xp: 400,
        next_level_xp: 900,
        xp_to_next_level: 400,
        percentage: 20,
      });
    });

    it("deve travar no nível máximo", async() => {
      const xpDoTopo = xpForLevel(MAX_LEVEL) + 1000;
      responderUpdate(
        aluno({ xp: xpDoTopo, level: MAX_LEVEL - 1 }),
        aluno({ xp: xpDoTopo, level: MAX_LEVEL }),
      );

      const resultado = await service.applyXp(ALUNO_ID, 1000);

      expect(resultado.level).toBe(MAX_LEVEL);
      expect(resultado.next_level_xp).toBeNull();
    });

    it("deve atualizar o ranking global e o da turma do aluno", async() => {
      responderUpdate(aluno({ xp: 10 }));

      await service.applyXp(ALUNO_ID, 10);

      expect(rankingService.refreshGlobal).toHaveBeenCalledTimes(1);
      expect(rankingService.refreshClass).toHaveBeenCalledWith(TURMA_ID);
    });

    it("deve atualizar só o global quando o aluno não tem turma", async() => {
      responderUpdate(aluno({ xp: 10, class: undefined }));

      await service.applyXp(ALUNO_ID, 10);

      expect(rankingService.refreshGlobal).toHaveBeenCalledTimes(1);
      expect(rankingService.refreshClass).not.toHaveBeenCalled();
    });

    it("deve usar a turma do documento já com o nível atualizado", async() => {
      responderUpdate(
        aluno({ xp: 100, level: 1, class: undefined }),
        aluno({ xp: 100, level: 2, class: TURMA_ID }),
      );

      await service.applyXp(ALUNO_ID, 100);

      expect(rankingService.refreshClass).toHaveBeenCalledWith(TURMA_ID);
    });

    it("não deve invalidar o XP aplicado quando o ranking falhar", async() => {
      responderUpdate(aluno({ xp: 10 }));
      rankingService.refreshGlobal.mockRejectedValue(new Error("ranking fora do ar"));

      const resultado = await service.applyXp(ALUNO_ID, 10);

      // A falha é registrada no log, mas o XP já creditado permanece.
      expect(resultado.xp).toBe(10);
      expect(userRepository.update).toHaveBeenCalledWith(ALUNO_ID, { $inc: { xp: 10 } });
    });

    it("não deve invalidar o XP quando o ranking da turma falhar", async() => {
      responderUpdate(aluno({ xp: 10 }));
      rankingService.refreshClass.mockRejectedValue(new Error("ranking da turma fora do ar"));

      await expect(service.applyXp(ALUNO_ID, 10)).resolves.toMatchObject({ xp: 10 });
    });

    it("deve propagar a falha de gravação do XP", async() => {
      userRepository.update.mockRejectedValue(new Error("banco fora do ar"));

      // Diferente do ranking, falha aqui significa que o XP não foi creditado.
      await expect(service.applyXp(ALUNO_ID, 10)).rejects.toThrow("banco fora do ar");
      expect(rankingService.refreshGlobal).not.toHaveBeenCalled();
    });
  });

  describe("refreshRankings", () => {
    it("deve atualizar global e turma quando o aluno tem turma", async() => {
      await service.refreshRankings(aluno());

      expect(rankingService.refreshGlobal).toHaveBeenCalledTimes(1);
      expect(rankingService.refreshClass).toHaveBeenCalledWith(TURMA_ID);
    });

    it("deve engolir o erro do ranking em vez de propagá-lo", async() => {
      rankingService.refreshGlobal.mockRejectedValue(new Error("falhou"));

      await expect(service.refreshRankings(aluno())).resolves.toBeUndefined();
    });
  });
});
