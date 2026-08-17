import Ranking from "../../models/Ranking.js";

/**
 * O campo `class` é obrigatório só quando o ranking é de turma.
 * A validação roda em memória, sem precisar de conexão com o banco.
 */
describe("Model Ranking", () => {
  const TURMA_ID = "507f1f77bcf86cd799439011";
  const ALUNO_ID = "507f1f77bcf86cd799439004";

  describe("obrigatoriedade da turma", () => {
    it("deve exigir a turma quando o ranking for do tipo class", () => {
      const erro = new Ranking({ type: "class" }).validateSync();

      expect(erro.errors.class).toBeDefined();
    });

    it("deve aceitar o ranking de turma quando a turma vier preenchida", () => {
      const erro = new Ranking({ type: "class", class: TURMA_ID }).validateSync();

      expect(erro).toBeUndefined();
    });

    it("não deve exigir turma no ranking global", () => {
      const erro = new Ranking({ type: "global" }).validateSync();

      expect(erro).toBeUndefined();
    });
  });

  describe("entradas", () => {
    it("deve aceitar as entradas com aluno, XP e nível", () => {
      const ranking = new Ranking({
        type: "global",
        entries: [{ user: ALUNO_ID, xp: 400, level: 3 }],
      });

      expect(ranking.validateSync()).toBeUndefined();
      expect(ranking.entries[0].xp).toBe(400);
    });

    it("deve assumir XP zero e nível 1 quando não forem informados", () => {
      const ranking = new Ranking({ type: "global", entries: [{ user: ALUNO_ID }] });

      expect(ranking.entries[0].xp).toBe(0);
      expect(ranking.entries[0].level).toBe(1);
    });

    it("deve recusar tipo fora de global e class", () => {
      const erro = new Ranking({ type: "turma" }).validateSync();

      expect(erro.errors.type).toBeDefined();
    });
  });
});
