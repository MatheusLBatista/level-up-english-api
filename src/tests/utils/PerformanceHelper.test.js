import { MISSION_TYPES, summarizeByType } from "../../utils/PerformanceHelper.js";

describe("PerformanceHelper", () => {
  describe("summarizeByType", () => {
    const tipos = new Map([
      ["quiz1", "quiz"],
      ["quiz2", "quiz"],
      ["vocab1", "vocabulary"],
      ["audio1", "audio"],
    ]);

    const concluida = (missionId, score) => ({ mission_id: missionId, done: true, score });

    it("deve calcular a média das notas de cada tipo", () => {
      const resultado = summarizeByType(
        [concluida("quiz1", 80), concluida("quiz2", 100), concluida("vocab1", 40), concluida("audio1", 90)],
        tipos,
      );

      expect(resultado).toEqual({
        quiz: { score: 90, missions: 2 },
        vocabulary: { score: 40, missions: 1 },
        audio: { score: 90, missions: 1 },
      });
    });

    it("deve deixar score null no tipo sem missão concluída", () => {
      const resultado = summarizeByType([concluida("quiz1", 70)], tipos);

      expect(resultado.vocabulary).toEqual({ score: null, missions: 0 });
      expect(resultado.audio).toEqual({ score: null, missions: 0 });
    });

    it("deve ignorar missão não concluída, mesmo com nota", () => {
      const resultado = summarizeByType(
        [concluida("quiz1", 100), { mission_id: "quiz2", done: false, score: 20 }],
        tipos,
      );

      expect(resultado.quiz).toEqual({ score: 100, missions: 1 });
    });

    it("deve ignorar missão que não está no mapa, como uma missão excluída", () => {
      const resultado = summarizeByType([concluida("quiz1", 60), concluida("removida", 0)], tipos);

      expect(resultado.quiz).toEqual({ score: 60, missions: 1 });
    });

    it("deve arredondar a média", () => {
      const resultado = summarizeByType([concluida("quiz1", 80), concluida("quiz2", 85)], tipos);

      expect(resultado.quiz.score).toBe(83);
    });

    it("deve contar a nota ausente como zero", () => {
      const resultado = summarizeByType([concluida("quiz1", 80), { mission_id: "quiz2", done: true }], tipos);

      expect(resultado.quiz).toEqual({ score: 40, missions: 2 });
    });

    it("deve comparar o id da missão como texto, para aceitar ObjectId", () => {
      const objectIdFalso = { toString: () => "audio1" };

      const resultado = summarizeByType([concluida(objectIdFalso, 75)], tipos);

      expect(resultado.audio).toEqual({ score: 75, missions: 1 });
    });

    it("deve devolver todos os tipos sem nota quando não houver progresso", () => {
      const resultado = summarizeByType([], tipos);

      expect(Object.keys(resultado)).toEqual(MISSION_TYPES);
      MISSION_TYPES.forEach((tipo) => expect(resultado[tipo]).toEqual({ score: null, missions: 0 }));
    });
  });
});
