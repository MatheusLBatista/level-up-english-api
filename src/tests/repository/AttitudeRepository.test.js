import AttitudeRepository from "../../repository/AttitudeRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("AttitudeRepository", () => {
  let modelo;
  let repository;

  const ATTITUDE_ID = "507f1f77bcf86cd799439011";

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

    repository = new AttitudeRepository({ attitudeModel: modelo });
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
    it("deve devolver a atitude encontrada", async() => {
      const atitude = { _id: ATTITUDE_ID, name: "Participação" };
      modelo.findById.mockReturnValue(query(atitude));

      const resultado = await repository.findById(ATTITUDE_ID);

      expect(modelo.findById).toHaveBeenCalledWith(ATTITUDE_ID);
      expect(resultado).toBe(atitude);
    });

    it("deve trazer só o nome de quem cadastrou", async() => {
      const encadeavel = query({ _id: ATTITUDE_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(ATTITUDE_ID);

      expect(encadeavel.populate).toHaveBeenCalledWith("createdBy", "name");
    });

    it("deve lançar 404 quando a atitude não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findById(ATTITUDE_ID));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Attitude.");
    });
  });

  describe("findByName", () => {
    it("deve casar o nome inteiro, sem diferenciar maiúsculas", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("Participação");

      expect(modelo.findOne).toHaveBeenCalledWith({
        name: { $regex: "^Participação$", $options: "i" },
      });
    });

    it("deve excluir a própria atitude da busca", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("Participação", ATTITUDE_ID);

      expect(modelo.findOne).toHaveBeenCalledWith({
        name: { $regex: "^Participação$", $options: "i" },
        _id: { $ne: ATTITUDE_ID },
      });
    });
  });

  describe("list", () => {
    const paginado = { docs: [], totalDocs: 0 };

    it("deve listar sem filtros quando não houver query", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({});

      const [filtros, opcoes] = modelo.paginate.mock.calls[0];
      expect(filtros).toEqual({});
      expect(opcoes).toEqual({
        page: 1,
        limit: 10,
        sort: { name: 1 },
        populate: [{ path: "createdBy", select: "name" }],
      });
    });

    it("deve montar os filtros pelo AttitudeFilterBuild", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { name: "atraso", type: "negative", active: "true" } });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({
        name: { $regex: "atraso", $options: "i" },
        type: "negative",
        active: true,
      });
    });

    it("deve limitar a página a 100 registros", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { limit: "500" } });

      expect(modelo.paginate.mock.calls[0][1].limit).toBe(100);
    });

    it("deve respeitar página e limite informados", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { page: "3", limit: "5" } });

      const [, opcoes] = modelo.paginate.mock.calls[0];
      expect(opcoes.page).toBe(3);
      expect(opcoes.limit).toBe(5);
    });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salva = { _id: ATTITUDE_ID, name: "Participação" };
      const save = jest.fn().mockResolvedValue(salva);
      modelo.mockImplementation(() => ({ save }));

      const resultado = await repository.create({ name: "Participação" });

      expect(modelo).toHaveBeenCalledWith({ name: "Participação" });
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salva);
    });
  });

  describe("update", () => {
    it("deve devolver a atitude já atualizada", async() => {
      const atualizada = { _id: ATTITUDE_ID, xp_value: 20 };
      modelo.findByIdAndUpdate.mockResolvedValue(atualizada);

      const resultado = await repository.update(ATTITUDE_ID, { xp_value: 20 });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(ATTITUDE_ID, { xp_value: 20 }, { new: true });
      expect(resultado).toBe(atualizada);
    });

    it("deve lançar 404 quando a atitude não existir", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue(null);

      const erro = await capturarErro(repository.update(ATTITUDE_ID, { xp_value: 20 }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
    });
  });

  describe("delete", () => {
    it("deve remover a atitude pelo id", async() => {
      modelo.findByIdAndDelete.mockResolvedValue({ _id: ATTITUDE_ID });

      const resultado = await repository.delete(ATTITUDE_ID);

      expect(modelo.findByIdAndDelete).toHaveBeenCalledWith(ATTITUDE_ID);
      expect(resultado).toEqual({ _id: ATTITUDE_ID });
    });
  });
});
