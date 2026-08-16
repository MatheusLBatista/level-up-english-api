import AttitudeLogFilterBuild from "../../../repository/filters/AttitudeLogFilterBuild.js";

describe("AttitudeLogFilterBuild", () => {
  let builder;

  const STUDENT_ID = "507f1f77bcf86cd799439001";
  const TEACHER_ID = "507f1f77bcf86cd799439002";
  const ATTITUDE_ID = "507f1f77bcf86cd799439003";

  beforeEach(() => {
    builder = new AttitudeLogFilterBuild();
  });

  describe("withStudent", () => {
    it("deve filtrar pelo aluno informado", () => {
      expect(builder.withStudent(STUDENT_ID).build()).toEqual({ student: STUDENT_ID });
    });

    it("deve ignorar aluno não informado", () => {
      expect(builder.withStudent(undefined).build()).toEqual({});
      expect(new AttitudeLogFilterBuild().withStudent("").build()).toEqual({});
    });
  });

  describe("withTeacher", () => {
    it("deve filtrar pela professora informada", () => {
      expect(builder.withTeacher(TEACHER_ID).build()).toEqual({ teacher: TEACHER_ID });
    });

    it("deve ignorar professora não informada", () => {
      expect(builder.withTeacher(null).build()).toEqual({});
    });
  });

  describe("withAttitude", () => {
    it("deve filtrar pela atitude informada", () => {
      expect(builder.withAttitude(ATTITUDE_ID).build()).toEqual({ attitude: ATTITUDE_ID });
    });

    it("deve ignorar atitude não informada", () => {
      expect(builder.withAttitude(undefined).build()).toEqual({});
    });
  });

  describe("build", () => {
    it("deve devolver objeto vazio quando nenhum filtro for aplicado", () => {
      expect(builder.build()).toEqual({});
    });

    it("deve combinar os filtros encadeados", () => {
      const filtros = builder
        .withStudent(STUDENT_ID)
        .withTeacher(TEACHER_ID)
        .withAttitude(ATTITUDE_ID)
        .build();

      expect(filtros).toEqual({
        student: STUDENT_ID,
        teacher: TEACHER_ID,
        attitude: ATTITUDE_ID,
      });
    });

    it("deve devolver o próprio builder a cada passo do encadeamento", () => {
      expect(builder.withStudent(STUDENT_ID)).toBe(builder);
      expect(builder.withTeacher(TEACHER_ID)).toBe(builder);
      expect(builder.withAttitude(ATTITUDE_ID)).toBe(builder);
    });
  });
});
