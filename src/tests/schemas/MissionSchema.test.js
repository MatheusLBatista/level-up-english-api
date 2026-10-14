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
      expect(getMissionContentIssues("vocabulary", { content: "   ", questions: questoes(1) })).toEqual([
        { path: "content", message: "Missões do tipo vocabulário precisam de conteúdo (content)." },
      ]);
    });

    it("deve apontar vocabulário sem content", () => {
      expect(getMissionContentIssues("vocabulary", {})[0].path).toBe("content");
    });

    it("deve aceitar vocabulário com content", () => {
      expect(getMissionContentIssues("vocabulary", { content: "cat, dog", questions: questoes(1) })).toEqual([]);
    });

    it("deve apontar áudio sem content_url", () => {
      expect(getMissionContentIssues("audio", { questions: questoes(1) })).toEqual([
        { path: "content_url", message: "Missões do tipo áudio precisam de uma URL (content_url)." },
      ]);
    });

    it("deve aceitar áudio com content_url", () => {
      expect(
        getMissionContentIssues("audio", { content_url: "https://exemplo.com/a.mp3", questions: questoes(3) }),
      ).toEqual([]);
    });

    it("deve apontar vocabulário e áudio sem perguntas de checagem", () => {
      expect(getMissionContentIssues("vocabulary", { content: "texto" })).toEqual([
        { path: "questions", message: "Missões de vocabulário precisam de 1 a 3 perguntas de checagem." },
      ]);
      expect(getMissionContentIssues("audio", { content_url: "https://exemplo.com/a.mp3" })).toEqual([
        { path: "questions", message: "Missões de áudio precisam de 1 a 3 perguntas de checagem." },
      ]);
    });

    it("deve apontar vocabulário e áudio com mais de três perguntas de checagem", () => {
      expect(getMissionContentIssues("vocabulary", { content: "texto", questions: questoes(4) })[0].path)
        .toBe("questions");
      expect(getMissionContentIssues("audio", { content_url: "https://exemplo.com/a.mp3", questions: questoes(4) })[0].path)
        .toBe("questions");
    });

    it("deve ser o comportamento padrão quando as opções não forem passadas", () => {
      expect(getMissionContentIssues("audio", { questions: questoes(1) })).toHaveLength(1);
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

    it("deve validar de 1 a 3 perguntas quando vierem no corpo de vocabulário ou áudio", () => {
      expect(getMissionContentIssues("vocabulary", { questions: [] }, partial)[0].path).toBe("questions");
      expect(getMissionContentIssues("audio", { questions: questoes(4) }, partial)[0].path).toBe("questions");
      expect(getMissionContentIssues("audio", { questions: questoes(2) }, partial)).toEqual([]);
    });
  });

  describe("com partial: true em missão antiga, sem perguntas salvas", () => {
    const antiga = { partial: true, hasSavedQuestions: false };

    it("deve exigir perguntas quando qualquer campo de conteúdo for editado", () => {
      ["title", "description", "content", "content_url", "xp_reward"].forEach((campo) => {
        const valor = campo === "xp_reward" ? 10 : campo === "content_url" ? "https://exemplo.com/a.mp3" : "novo";

        expect(getMissionContentIssues("vocabulary", { [campo]: valor }, antiga)).toContainEqual({
          path: "questions",
          message: "Missões de vocabulário precisam de 1 a 3 perguntas de checagem.",
        });
      });
    });

    it("deve aceitar a edição quando as perguntas vierem junto", () => {
      expect(getMissionContentIssues("audio", { title: "Novo", questions: questoes(2) }, antiga)).toEqual([]);
    });

    it("deve permitir só ativar ou desativar sem perguntas", () => {
      expect(getMissionContentIssues("vocabulary", { active: false }, antiga)).toEqual([]);
    });

    it("não deve contar a troca de turma como edição de conteúdo", () => {
      expect(getMissionContentIssues("audio", { class_id: "507f1f77bcf86cd799439011" }, antiga)).toEqual([]);
    });

    it("não deve mudar a regra do quiz", () => {
      expect(getMissionContentIssues("quiz", { title: "Novo" }, antiga)).toEqual([]);
    });
  });
});
