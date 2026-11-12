import DataErasureLogRepository from "../../repository/DataErasureLogRepository.js";

describe("DataErasureLogRepository", () => {
  let modelo;
  let repository;

  const ALUNO_ID = "507f1f77bcf86cd799439004";
  const ADMIN_ID = "507f1f77bcf86cd799439001";

  beforeEach(() => {
    jest.clearAllMocks();

    modelo = jest.fn();
    repository = new DataErasureLogRepository({ dataErasureLogModel: modelo });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const dados = { user: ALUNO_ID, reason: "holder_request", performed_by: ADMIN_ID };
      const save = jest.fn().mockResolvedValue({ _id: "x", ...dados });
      modelo.mockImplementation(() => ({ save }));

      const resultado = await repository.create(dados);

      expect(modelo).toHaveBeenCalledWith(dados);
      expect(save).toHaveBeenCalled();
      expect(resultado.reason).toBe("holder_request");
    });

    it("deve usar o model DataErasureLog por padrão", () => {
      expect(new DataErasureLogRepository().dataErasureLogModel.modelName).toBe("dataErasureLogs");
    });
  });

  describe("findErasedUserIds", () => {
    it("deve devolver os ids distintos de quem já teve os dados eliminados", async() => {
      modelo.distinct = jest.fn().mockResolvedValue([ALUNO_ID]);

      const ids = await repository.findErasedUserIds();

      expect(modelo.distinct).toHaveBeenCalledWith("user");
      expect(ids).toEqual([ALUNO_ID]);
    });
  });
});
