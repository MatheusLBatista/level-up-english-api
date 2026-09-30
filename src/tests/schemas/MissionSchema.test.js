import { getMissionContentIssues } from "../../schemas/MissionSchema.js";

describe("getMissionContentIssues", () => {
  const questoes = (quantidade) =>
    Array.from({ length: quantidade }, (_, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" },
      correct_answer: "a",
    }));

  describe("com partial: false (POST)", () => {
    it("deve aceitar quiz com cinco perguntas", () => {
      expect(getMissionContentIssues("quiz", { questions: questoes(5) })).toEqual([]);
    });

    it("deve apontar quiz com menos de cinco perguntas", () => {
      expect(getMissionContentIssues("quiz", { questions: questoes(4) })).toEqual([
        { path: "questions", message: "Missões do tipo quiz precisam de no mínimo 5 perguntas." },
      ]);
    });

    it("deve apontar quiz sem questions", () => {
      expect(getMissionContentIssues("quiz", {})[0].path).toBe("questions");
    });

    it("deve apontar vocabulário com content só de espaços", () => {
      expect(getMissionContentIssues("vocabulary", { content: "   " })).toEqual([
        { path: "content", message: "Missões do tipo vocabulário precisam de conteúdo (content)." },
      ]);
    });

    it("deve apontar vocabulário sem content", () => {
      expect(getMissionContentIssues("vocabulary", {})[0].path).toBe("content");
    });

    it("deve aceitar vocabulário com content", () => {
      expect(getMissionContentIssues("vocabulary", { content: "cat, dog" })).toEqual([]);
    });

    it("deve apontar áudio sem content_url", () => {
      expect(getMissionContentIssues("audio", {})).toEqual([
        { path: "content_url", message: "Missões do tipo áudio precisam de uma URL (content_url)." },
      ]);
    });

    it("deve aceitar áudio com content_url", () => {
      expect(getMissionContentIssues("audio", { content_url: "https://exemplo.com/a.mp3" })).toEqual([]);
    });

    it("deve ser o comportamento padrão quando as opções não forem passadas", () => {
      expect(getMissionContentIssues("audio", {})).toHaveLength(1);
    });
  });

  describe("com partial: true (PATCH)", () => {
    const partial = { partial: true };

    it("não deve exigir campos de conteúdo ausentes", () => {
      expect(getMissionContentIssues("quiz", { title: "Novo" }, partial)).toEqual([]);
      expect(getMissionContentIssues("vocabulary", { active: false }, partial)).toEqual([]);
      expect(getMissionContentIssues("audio", {}, partial)).toEqual([]);
    });

    it("deve apontar quiz enviado com menos de cinco perguntas", () => {
      expect(getMissionContentIssues("quiz", { questions: questoes(4) }, partial)[0].path).toBe("questions");
    });

    it("deve apontar quiz enviado com lista vazia", () => {
      expect(getMissionContentIssues("quiz", { questions: [] }, partial)[0].path).toBe("questions");
    });

    it("deve apontar vocabulário enviado com content em branco", () => {
      expect(getMissionContentIssues("vocabulary", { content: "   " }, partial)[0].path).toBe("content");
    });

    it("deve apontar áudio enviado com content_url vazio", () => {
      expect(getMissionContentIssues("audio", { content_url: "" }, partial)[0].path).toBe("content_url");
    });

    it("deve aceitar campos válidos enviados", () => {
      expect(getMissionContentIssues("quiz", { questions: questoes(5) }, partial)).toEqual([]);
      expect(getMissionContentIssues("vocabulary", { content: "texto" }, partial)).toEqual([]);
    });

    it("deve ignorar campos que não pertencem ao tipo da missão", () => {
      expect(getMissionContentIssues("vocabulary", { content_url: "" }, partial)).toEqual([]);
    });
  });
});
