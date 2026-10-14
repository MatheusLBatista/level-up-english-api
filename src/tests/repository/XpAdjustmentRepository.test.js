import XpAdjustmentRepository from "../../repository/XpAdjustmentRepository.js";

describe("XpAdjustmentRepository", () => {
  let modelo;
  let repository;

  const AJUSTE_ID = "507f1f77bcf86cd799439041";
  const STUDENT_ID = "507f1f77bcf86cd799439001";
  const TEACHER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();

    modelo = jest.fn();
    repository = new XpAdjustmentRepository({ xpAdjustmentModel: modelo });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salvo = { _id: AJUSTE_ID, amount: -50, xp_applied: -30 };
      const save = jest.fn().mockResolvedValue(salvo);
      modelo.mockImplementation(() => ({ save }));

      const dados = { student: STUDENT_ID, teacher: TEACHER_ID, amount: -50, xp_applied: -30 };
      const resultado = await repository.create(dados);

      expect(modelo).toHaveBeenCalledWith(dados);
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salvo);
    });

    it("deve usar o model XpAdjustment por padrão", () => {
      const padrao = new XpAdjustmentRepository();

      expect(padrao.xpAdjustmentModel.modelName).toBe("xpAdjustments");
    });
  });

  describe("findByStudent", () => {
    it("deve buscar os ajustes do aluno com o nome de quem ajustou", async() => {
      const ajustes = [{ _id: AJUSTE_ID }];
      const populate = jest.fn().mockResolvedValue(ajustes);
      modelo.find = jest.fn().mockReturnValue({ populate });

      const resultado = await repository.findByStudent(STUDENT_ID);

      expect(modelo.find).toHaveBeenCalledWith({ student: STUDENT_ID });
      expect(populate).toHaveBeenCalledWith("teacher", "name");
      expect(resultado).toBe(ajustes);
    });
  });
});
