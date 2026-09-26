import UserFilterBuild from "../../../repository/filters/UserFilterBuild.js";

describe("UserFilterBuild", () => {
  let builder;

  const CLASS_ID = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    builder = new UserFilterBuild();
  });

  describe("withName", () => {
    it("deve filtrar por trecho do nome, sem diferenciar maiúsculas", () => {
      expect(builder.withName("mar").build()).toEqual({
        name: { $regex: "mar", $options: "i" },
      });
    });

    it("deve ignorar nome vazio ou não informado", () => {
      expect(builder.withName("").build()).toEqual({});
      expect(new UserFilterBuild().withName(undefined).build()).toEqual({});
    });
  });

  describe("withEmail", () => {
    it("deve filtrar por trecho do e-mail, sem diferenciar maiúsculas", () => {
      expect(builder.withEmail("escola").build()).toEqual({
        email: { $regex: "escola", $options: "i" },
      });
    });

    it("deve ignorar e-mail não informado", () => {
      expect(builder.withEmail(undefined).build()).toEqual({});
    });
  });

  describe("withRole", () => {
    it("deve filtrar por papel exato", () => {
      expect(builder.withRole("student").build()).toEqual({ role: "student" });
    });

    it("deve ignorar papel vazio", () => {
      expect(builder.withRole("").build()).toEqual({});
    });
  });

  describe("withClass", () => {
    it("deve filtrar pela turma informada", () => {
      expect(builder.withClass(CLASS_ID).build()).toEqual({ class: CLASS_ID });
    });

    it("deve ignorar turma não informada", () => {
      expect(builder.withClass(undefined).build()).toEqual({});
    });
  });

  describe("withActive", () => {
    it("deve aceitar as formas verdadeiras vindas da query string", () => {
      expect(new UserFilterBuild().withActive(true).build()).toEqual({ active: true });
      expect(new UserFilterBuild().withActive("true").build()).toEqual({ active: true });
      expect(new UserFilterBuild().withActive(1).build()).toEqual({ active: true });
      expect(new UserFilterBuild().withActive("1").build()).toEqual({ active: true });
    });

    it("deve tratar qualquer outro valor como falso", () => {
      expect(new UserFilterBuild().withActive("false").build()).toEqual({ active: false });
      expect(new UserFilterBuild().withActive("0").build()).toEqual({ active: false });
    });

    it("deve ignorar active não informado", () => {
      expect(builder.withActive(undefined).build()).toEqual({});
    });
  });

  it("deve encadear os filtros num único objeto", () => {
    const filtros = builder
      .withRole("student")
      .withClass(CLASS_ID)
      .withActive("true")
      .build();

    expect(filtros).toEqual({ role: "student", class: CLASS_ID, active: true });
  });
});
