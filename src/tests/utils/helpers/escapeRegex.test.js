import escapeRegex from "../../../utils/helpers/escapeRegex.js";

describe("escapeRegex", () => {
  it("deve escapar parênteses", () => {
    expect(escapeRegex("Turma A (manhã")).toBe("Turma A \\(manhã");
    expect(escapeRegex("(x)")).toBe("\\(x\\)");
  });

  it("deve escapar o ponto", () => {
    expect(escapeRegex("3º ano.")).toBe("3º ano\\.");
  });

  it("deve escapar a barra invertida", () => {
    expect(escapeRegex("a\\b")).toBe("a\\\\b");
  });

  it("deve escapar todos os metacaracteres de regex", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("deve manter texto comum inalterado", () => {
    expect(escapeRegex("Participação em aula")).toBe("Participação em aula");
  });

  it("deve produzir uma regex que casa só com o texto literal", () => {
    const regex = new RegExp(`^${escapeRegex("3º ano.")}$`, "i");

    expect(regex.test("3º ano.")).toBe(true);
    expect(regex.test("3º ano1")).toBe(false);
  });

  it("deve converter valores que não são texto", () => {
    expect(escapeRegex(1.5)).toBe("1\\.5");
  });
});
