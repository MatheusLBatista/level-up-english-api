import { MISSION_TYPES, averageByType, summarizeByType, withinPeriod } from "../../utils/PerformanceHelper.js";

describe("PerformanceHelper", () => {
  describe("withinPeriod", () => {
    const setembro = { mission_id: "m1", completed_at: new Date("2026-09-15T12:00:00Z") };
    const outubro = { mission_id: "m2", completed_at: new Date("2026-10-15T12:00:00Z") };
    const semData = { mission_id: "m3", completed_at: null };
    const progresso = [setembro, outubro, semData];

    it("deve devolver o progresso inteiro, inclusive sem data, quando não houver período", () => {
      expect(withinPeriod(progresso, {})).toBe(progresso);
      expect(withinPeriod(progresso)).toBe(progresso);
    });

    it("deve manter só o que foi concluído entre from e to", () => {
      const resultado = withinPeriod(progresso, { from: "2026-10-01T00:00:00Z", to: "2026-10-31T23:59:59Z" });

      expect(resultado).toEqual([outubro]);
    });

    it("deve aceitar só o início ou só o fim", () => {
      expect(withinPeriod(progresso, { from: "2026-10-01T00:00:00Z" })).toEqual([outubro]);
      expect(withinPeriod(progresso, { to: "2026-09-30T23:59:59Z" })).toEqual([setembro]);
    });

    it("deve incluir as duas pontas do período", () => {
      const resultado = withinPeriod(progresso, { from: "2026-09-15T12:00:00Z", to: "2026-10-15T12:00:00Z" });

      expect(resultado).toEqual([setembro, outubro]);
    });

    it("deve comparar o instante, respeitando o fuso informado", () => {
      const resultado = withinPeriod(progresso, { from: "2026-10-15T09:00:00-03:00" });

      expect(resultado).toEqual([outubro]);
    });

    it("deve deixar de fora o progresso sem data quando houver período", () => {
      const resultado = withinPeriod(progresso, { from: "2000-01-01T00:00:00Z" });

      expect(resultado).not.toContain(semData);
    });
  });

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

  describe("averageByType", () => {
    const resumo = (quiz, vocabulary = null, audio = null) => ({
      quiz: { score: quiz, missions: quiz === null ? 0 : 1 },
      vocabulary: { score: vocabulary, missions: vocabulary === null ? 0 : 1 },
      audio: { score: audio, missions: audio === null ? 0 : 1 },
    });

    it("deve tirar a média das médias dos alunos em cada tipo", () => {
      const resultado = averageByType([resumo(90, 40, 60), resumo(70, 60, 80)]);

      expect(resultado).toEqual({
        quiz: { score: 80, students: 2 },
        vocabulary: { score: 50, students: 2 },
        audio: { score: 70, students: 2 },
      });
    });

    it("deve deixar de fora o aluno sem nota no tipo, em vez de contar zero", () => {
      const resultado = averageByType([resumo(90), resumo(null), resumo(70)]);

      expect(resultado.quiz).toEqual({ score: 80, students: 2 });
    });

    it("deve dar o mesmo peso a cada aluno, não importa quantas missões ele fez", () => {
      const muitasMissoes = { ...resumo(100), quiz: { score: 100, missions: 10 } };

      const resultado = averageByType([muitasMissoes, resumo(50)]);

      expect(resultado.quiz.score).toBe(75);
    });

    it("deve arredondar a média", () => {
      const resultado = averageByType([resumo(80), resumo(85)]);

      expect(resultado.quiz.score).toBe(83);
    });

    it("deve deixar score null no tipo em que nenhum aluno tem nota", () => {
      const resultado = averageByType([resumo(90), resumo(70)]);

      expect(resultado.audio).toEqual({ score: null, students: 0 });
    });

    it("deve devolver todos os tipos sem nota quando não houver alunos", () => {
      const resultado = averageByType([]);

      expect(Object.keys(resultado)).toEqual(MISSION_TYPES);
      MISSION_TYPES.forEach((tipo) => expect(resultado[tipo]).toEqual({ score: null, students: 0 }));
    });
  });
});
