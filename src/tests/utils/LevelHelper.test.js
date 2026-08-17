import {
  BASE_XP,
  MIN_LEVEL,
  MAX_LEVEL,
  xpForLevel,
  calculateLevel,
  getProgress,
} from "../../utils/LevelHelper.js";

describe("LevelHelper", () => {
  describe("xpForLevel", () => {
    it("deve exigir zero XP no primeiro nível", () => {
      expect(xpForLevel(MIN_LEVEL)).toBe(0);
    });

    it("deve seguir a curva quadrática", () => {
      // BASE_XP * (n - 1)^2
      expect(xpForLevel(2)).toBe(100);
      expect(xpForLevel(3)).toBe(400);
      expect(xpForLevel(4)).toBe(900);
      expect(xpForLevel(5)).toBe(1600);
    });

    it("deve calcular o XP do último nível", () => {
      expect(xpForLevel(MAX_LEVEL)).toBe(BASE_XP * (MAX_LEVEL - 1) ** 2);
      expect(xpForLevel(MAX_LEVEL)).toBe(240100);
    });

    it("deve tratar nível zero ou negativo como zero XP", () => {
      expect(xpForLevel(0)).toBe(0);
      expect(xpForLevel(-5)).toBe(0);
    });

    it("deve exigir cada vez mais XP a cada nível", () => {
      for (let nivel = 2; nivel <= 10; nivel += 1) {
        const faixaAtual = xpForLevel(nivel + 1) - xpForLevel(nivel);
        const faixaAnterior = xpForLevel(nivel) - xpForLevel(nivel - 1);

        expect(faixaAtual).toBeGreaterThan(faixaAnterior);
      }
    });
  });

  describe("calculateLevel", () => {
    it("deve começar no nível 1 com zero XP", () => {
      expect(calculateLevel(0)).toBe(MIN_LEVEL);
    });

    it("deve subir de nível exatamente no XP da faixa", () => {
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(399)).toBe(2);
      expect(calculateLevel(400)).toBe(3);
      expect(calculateLevel(900)).toBe(4);
    });

    it("deve tratar XP negativo como nível 1", () => {
      // O aluno pode ficar com XP negativo por atitude negativa; o nível não cai abaixo de 1.
      expect(calculateLevel(-50)).toBe(MIN_LEVEL);
      expect(calculateLevel(-1)).toBe(MIN_LEVEL);
    });

    it("deve tratar valor inválido como nível 1", () => {
      expect(calculateLevel(undefined)).toBe(MIN_LEVEL);
      expect(calculateLevel(null)).toBe(MIN_LEVEL);
      expect(calculateLevel(NaN)).toBe(MIN_LEVEL);
      expect(calculateLevel(Infinity)).toBe(MIN_LEVEL);
    });

    it("deve travar no nível máximo", () => {
      expect(calculateLevel(xpForLevel(MAX_LEVEL))).toBe(MAX_LEVEL);
      expect(calculateLevel(999999999)).toBe(MAX_LEVEL);
    });

    it("deve ser coerente com o xpForLevel em toda a curva", () => {
      for (let nivel = MIN_LEVEL; nivel < MAX_LEVEL; nivel += 1) {
        expect(calculateLevel(xpForLevel(nivel))).toBe(nivel);
        expect(calculateLevel(xpForLevel(nivel + 1) - 1)).toBe(nivel);
      }
    });
  });

  describe("getProgress", () => {
    it("deve descrever a posição do aluno dentro da faixa", () => {
      expect(getProgress(500)).toEqual({
        xp: 500,
        level: 3,
        current_level_xp: 400,
        next_level_xp: 900,
        xp_to_next_level: 400,
        percentage: 20,
      });
    });

    it("deve zerar a porcentagem no início da faixa", () => {
      const progresso = getProgress(400);

      expect(progresso.level).toBe(3);
      expect(progresso.percentage).toBe(0);
      expect(progresso.xp_to_next_level).toBe(500);
    });

    it("deve arredondar a porcentagem", () => {
      // 250 de 100 a 400: 150 de 300 = 50%
      expect(getProgress(250).percentage).toBe(50);
      // 133 de 100 a 400: 33 de 300 = 11%
      expect(getProgress(133).percentage).toBe(11);
    });

    it("deve indicar faixa cheia no nível máximo", () => {
      const progresso = getProgress(xpForLevel(MAX_LEVEL));

      expect(progresso.level).toBe(MAX_LEVEL);
      expect(progresso.next_level_xp).toBeNull();
      expect(progresso.xp_to_next_level).toBe(0);
      expect(progresso.percentage).toBe(100);
    });

    it("deve manter o nível máximo mesmo com XP muito acima", () => {
      const progresso = getProgress(999999999);

      expect(progresso.level).toBe(MAX_LEVEL);
      expect(progresso.percentage).toBe(100);
      expect(progresso.xp).toBe(999999999);
    });

    it("deve tratar XP negativo como zero", () => {
      const progresso = getProgress(-100);

      expect(progresso.xp).toBe(0);
      expect(progresso.level).toBe(MIN_LEVEL);
      expect(progresso.percentage).toBe(0);
    });

    it("deve tratar valor inválido como zero", () => {
      expect(getProgress(undefined).xp).toBe(0);
      expect(getProgress(NaN).level).toBe(MIN_LEVEL);
    });

    it("deve devolver porcentagem entre 0 e 100 em toda a curva", () => {
      for (let xp = 0; xp <= 5000; xp += 137) {
        const { percentage } = getProgress(xp);

        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    });
  });
});
