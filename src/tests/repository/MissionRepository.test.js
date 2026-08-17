import MissionRepository from "../../repository/MissionRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("MissionRepository", () => {
  let modelo;
  let repository;

  const MISSION_ID = "507f1f77bcf86cd799439021";
  const TURMA_ID = "507f1f77bcf86cd799439011";

  const query = (resultado) => {
    const encadeavel = {
      populate: jest.fn(() => encadeavel),
      then: (resolve, reject) => Promise.resolve(resultado).then(resolve, reject),
    };

    return encadeavel;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    modelo = jest.fn();
    modelo.findById = jest.fn();
    modelo.findOne = jest.fn();
    modelo.findByIdAndUpdate = jest.fn();
    modelo.findByIdAndDelete = jest.fn();
    modelo.paginate = jest.fn();

    repository = new MissionRepository({ missionModel: modelo });
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("findById", () => {
    it("deve devolver a missão encontrada", async() => {
      const missao = { _id: MISSION_ID, title: "Explorador de Palavras" };
      modelo.findById.mockReturnValue(query(missao));

      const resultado = await repository.findById(MISSION_ID);

      expect(modelo.findById).toHaveBeenCalledWith(MISSION_ID);
      expect(resultado).toBe(missao);
    });

    it("deve trazer só o nome da turma e de quem criou", async() => {
      const encadeavel = query({ _id: MISSION_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(MISSION_ID);

      expect(encadeavel.populate).toHaveBeenNthCalledWith(1, "class_id", "name");
      expect(encadeavel.populate).toHaveBeenNthCalledWith(2, "createdBy", "name");
    });

    it("deve lançar 404 quando a missão não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findById(MISSION_ID));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Mission.");
    });
  });

  describe("findByTitle", () => {
    it("deve casar o título inteiro, sem diferenciar maiúsculas", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByTitle("Explorador de Palavras");

      expect(modelo.findOne).toHaveBeenCalledWith({
        title: { $regex: "^Explorador de Palavras$", $options: "i" },
      });
    });

    it("deve excluir a própria missão da busca", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByTitle("Explorador de Palavras", MISSION_ID);

      expect(modelo.findOne).toHaveBeenCalledWith({
        title: { $regex: "^Explorador de Palavras$", $options: "i" },
        _id: { $ne: MISSION_ID },
      });
    });
  });

  describe("list", () => {
    const paginado = { docs: [], totalDocs: 0 };

    beforeEach(() => {
      modelo.paginate.mockResolvedValue(paginado);
    });

    it("deve listar sem filtros quando não houver query", async() => {
      await repository.list({});

      const [filtros, opcoes] = modelo.paginate.mock.calls[0];
      expect(filtros).toEqual({});
      expect(opcoes).toEqual({
        page: 1,
        limit: 10,
        sort: { createdAt: -1 },
        populate: [
          { path: "class_id", select: "name" },
          { path: "createdBy", select: "name" },
        ],
      });
    });

    it("deve montar os filtros pelo MissionFilterBuild", async() => {
      await repository.list({
        query: { title: "explorador", type: "quiz", class_id: TURMA_ID, active: "true" },
      });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({
        title: { $regex: "explorador", $options: "i" },
        type: "quiz",
        class_id: TURMA_ID,
        active: true,
      });
    });

    it("deve limitar a página a 100 registros", async() => {
      await repository.list({ query: { limit: "500" } });

      expect(modelo.paginate.mock.calls[0][1].limit).toBe(100);
    });

    it("deve respeitar página e limite informados", async() => {
      await repository.list({ query: { page: "3", limit: "5" } });

      const [, opcoes] = modelo.paginate.mock.calls[0];
      expect(opcoes.page).toBe(3);
      expect(opcoes.limit).toBe(5);
    });

    it("deve devolver o resultado paginado do model", async() => {
      await expect(repository.list({})).resolves.toBe(paginado);
    });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salva = { _id: MISSION_ID, title: "Explorador de Palavras" };
      const save = jest.fn().mockResolvedValue(salva);
      modelo.mockImplementation(() => ({ save }));

      const resultado = await repository.create({ title: "Explorador de Palavras" });

      expect(modelo).toHaveBeenCalledWith({ title: "Explorador de Palavras" });
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salva);
    });
  });

  describe("update", () => {
    it("deve devolver a missão já atualizada", async() => {
      const atualizada = { _id: MISSION_ID, xp_reward: 150 };
      modelo.findByIdAndUpdate.mockResolvedValue(atualizada);

      const resultado = await repository.update(MISSION_ID, { xp_reward: 150 });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(
        MISSION_ID,
        { xp_reward: 150 },
        { new: true },
      );
      expect(resultado).toBe(atualizada);
    });

    it("deve lançar 404 quando a missão não existir", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue(null);

      const erro = await capturarErro(repository.update(MISSION_ID, { xp_reward: 150 }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Mission.");
    });
  });

  describe("delete", () => {
    it("deve remover a missão pelo id", async() => {
      modelo.findByIdAndDelete.mockResolvedValue({ _id: MISSION_ID });

      const resultado = await repository.delete(MISSION_ID);

      expect(modelo.findByIdAndDelete).toHaveBeenCalledWith(MISSION_ID);
      expect(resultado).toEqual({ _id: MISSION_ID });
    });
  });
});
