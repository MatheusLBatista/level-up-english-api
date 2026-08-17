import MissionFilterBuild from "../../../repository/filters/MissionFilterBuild.js";

describe("MissionFilterBuild", () => {
  let builder;

  const TURMA_ID = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    builder = new MissionFilterBuild();
  });

  describe("withTitle", () => {
    it("deve filtrar por trecho do título, sem diferenciar maiúsculas", () => {
      const filtros = builder.withTitle("explorador").build();

      expect(filtros).toEqual({ title: { $regex: "explorador", $options: "i" } });
    });

    it("deve ignorar título vazio", () => {
      expect(builder.withTitle("").build()).toEqual({});
    });

    it("deve ignorar título não informado", () => {
      expect(builder.withTitle(undefined).build()).toEqual({});
    });
  });

  describe("withType", () => {
    it("deve filtrar por tipo exato", () => {
      expect(builder.withType("quiz").build()).toEqual({ type: "quiz" });
    });

    it("deve ignorar tipo vazio", () => {
      expect(builder.withType("").build()).toEqual({});
    });
  });

  describe("withClassId", () => {
    it("deve filtrar pela turma informada", () => {
      expect(builder.withClassId(TURMA_ID).build()).toEqual({ class_id: TURMA_ID });
    });

    it("deve ignorar turma não informada", () => {
      expect(builder.withClassId(undefined).build()).toEqual({});
    });
  });

  describe("withActive", () => {
    it("deve aceitar as formas verdadeiras vindas da query string", () => {
      expect(new MissionFilterBuild().withActive(true).build()).toEqual({ active: true });
      expect(new MissionFilterBuild().withActive("true").build()).toEqual({ active: true });
      expect(new MissionFilterBuild().withActive(1).build()).toEqual({ active: true });
      expect(new MissionFilterBuild().withActive("1").build()).toEqual({ active: true });
    });

    it("deve tratar qualquer outro valor como falso", () => {
      expect(new MissionFilterBuild().withActive("false").build()).toEqual({ active: false });
      expect(new MissionFilterBuild().withActive(0).build()).toEqual({ active: false });
      expect(new MissionFilterBuild().withActive("qualquer").build()).toEqual({ active: false });
    });

    it("deve ignorar active não informado", () => {
      expect(builder.withActive(undefined).build()).toEqual({});
    });

    it("deve filtrar por active nulo, e não descartá-lo", () => {
      // null passa pelo `!== undefined` e vira false; só undefined é ignorado.
      expect(builder.withActive(null).build()).toEqual({ active: false });
    });
  });

  describe("build", () => {
    it("deve devolver objeto vazio quando nenhum filtro for aplicado", () => {
      expect(builder.build()).toEqual({});
    });

    it("deve combinar os filtros encadeados", () => {
      const filtros = builder
        .withTitle("quiz")
        .withType("quiz")
        .withClassId(TURMA_ID)
        .withActive("true")
        .build();

      expect(filtros).toEqual({
        title: { $regex: "quiz", $options: "i" },
        type: "quiz",
        class_id: TURMA_ID,
        active: true,
      });
    });

    it("deve devolver o próprio builder a cada passo do encadeamento", () => {
      expect(builder.withTitle("x")).toBe(builder);
      expect(builder.withType("audio")).toBe(builder);
      expect(builder.withClassId(TURMA_ID)).toBe(builder);
      expect(builder.withActive(true)).toBe(builder);
    });
  });
});
