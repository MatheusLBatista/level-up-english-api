import AttitudeFilterBuild from "../../../repository/filters/AttitudeFilterBuild.js";

describe("AttitudeFilterBuild", () => {
  let builder;

  beforeEach(() => {
    builder = new AttitudeFilterBuild();
  });

  describe("withName", () => {
    it("deve filtrar por trecho do nome, sem diferenciar maiúsculas", () => {
      const filtros = builder.withName("particip").build();

      expect(filtros).toEqual({ name: { $regex: "particip", $options: "i" } });
    });

    it("deve ignorar nome vazio", () => {
      expect(builder.withName("").build()).toEqual({});
    });

    it("deve ignorar nome não informado", () => {
      expect(builder.withName(undefined).build()).toEqual({});
    });
  });

  describe("withType", () => {
    it("deve filtrar por tipo exato", () => {
      expect(builder.withType("negative").build()).toEqual({ type: "negative" });
    });

    it("deve ignorar tipo vazio", () => {
      expect(builder.withType("").build()).toEqual({});
    });
  });

  describe("withActive", () => {
    it("deve aceitar as formas verdadeiras vindas da query string", () => {
      expect(new AttitudeFilterBuild().withActive(true).build()).toEqual({ active: true });
      expect(new AttitudeFilterBuild().withActive("true").build()).toEqual({ active: true });
      expect(new AttitudeFilterBuild().withActive(1).build()).toEqual({ active: true });
      expect(new AttitudeFilterBuild().withActive("1").build()).toEqual({ active: true });
    });

    it("deve tratar qualquer outro valor como falso", () => {
      expect(new AttitudeFilterBuild().withActive("false").build()).toEqual({ active: false });
      expect(new AttitudeFilterBuild().withActive(0).build()).toEqual({ active: false });
      expect(new AttitudeFilterBuild().withActive("qualquer").build()).toEqual({ active: false });
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
      const filtros = builder.withName("atraso").withType("negative").withActive("true").build();

      expect(filtros).toEqual({
        name: { $regex: "atraso", $options: "i" },
        type: "negative",
        active: true,
      });
    });

    it("deve devolver o próprio builder a cada passo do encadeamento", () => {
      expect(builder.withName("x")).toBe(builder);
      expect(builder.withType("positive")).toBe(builder);
      expect(builder.withActive(true)).toBe(builder);
    });
  });
});
