import MissionFilterBuild from "../../../repository/filters/MissionFilterBuild.js";

describe("MissionFilterBuild", () => {
  let builder;

  const CLASS_ID = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    builder = new MissionFilterBuild();
  });

  describe("withTitle", () => {
    it("deve filtrar por trecho do título, sem diferenciar maiúsculas", () => {
      expect(builder.withTitle("explor").build()).toEqual({
        title: { $regex: "explor", $options: "i" },
      });
    });

    it("deve ignorar título vazio ou não informado", () => {
      expect(builder.withTitle("").build()).toEqual({});
      expect(new MissionFilterBuild().withTitle(undefined).build()).toEqual({});
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
      expect(builder.withClassId(CLASS_ID).build()).toEqual({ class_id: CLASS_ID });
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
    });

    it("deve ignorar active não informado", () => {
      expect(builder.withActive(undefined).build()).toEqual({});
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
        .withClassId(CLASS_ID)
        .withActive("true")
        .build();

      expect(filtros).toEqual({
        title: { $regex: "quiz", $options: "i" },
        type: "quiz",
        class_id: CLASS_ID,
        active: true,
      });
    });

    it("deve devolver o próprio builder a cada passo do encadeamento", () => {
      expect(builder.withTitle("x")).toBe(builder);
      expect(builder.withType("quiz")).toBe(builder);
      expect(builder.withClassId(CLASS_ID)).toBe(builder);
      expect(builder.withActive(true)).toBe(builder);
    });
  });
});
