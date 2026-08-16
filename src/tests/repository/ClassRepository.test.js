import ClassRepository from "../../repository/ClassRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("ClassRepository", () => {
  let modelo;
  let repository;

  const CLASS_ID = "507f1f77bcf86cd799439011";
  const TEACHER_ID = "507f1f77bcf86cd799439002";

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

    repository = new ClassRepository({ classModel: modelo });
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
    it("deve devolver a turma encontrada", async() => {
      const turma = { _id: CLASS_ID, name: "Turma A" };
      modelo.findById.mockReturnValue(query(turma));

      const resultado = await repository.findById(CLASS_ID);

      expect(modelo.findById).toHaveBeenCalledWith(CLASS_ID);
      expect(resultado).toBe(turma);
    });

    it("deve trazer professora, alunos e missões pelo populate", async() => {
      const encadeavel = query({ _id: CLASS_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(CLASS_ID);

      expect(encadeavel.populate).toHaveBeenNthCalledWith(1, "teacher", "name email role");
      // Sem e-mail: a lista de alunos da turma não é lista de contatos.
      expect(encadeavel.populate).toHaveBeenNthCalledWith(2, "students", "name role");
      expect(encadeavel.populate).toHaveBeenNthCalledWith(3, "missions", "title type active");
    });

    it("deve lançar 404 quando a turma não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findById(CLASS_ID));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Class.");
    });
  });

  describe("findByName", () => {
    it("deve casar o nome inteiro, sem diferenciar maiúsculas", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("Turma A");

      // Âncoras de início e fim: "Turma A" não pode colidir com "Turma AB".
      expect(modelo.findOne).toHaveBeenCalledWith({
        name: { $regex: "^Turma A$", $options: "i" },
      });
    });

    it("deve excluir a própria turma da busca", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("Turma A", CLASS_ID);

      // É o que permite a turma manter o próprio nome ao ser atualizada.
      expect(modelo.findOne).toHaveBeenCalledWith({
        name: { $regex: "^Turma A$", $options: "i" },
        _id: { $ne: CLASS_ID },
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
        populate: [{ path: "teacher", select: "name email role" }],
      });
    });

    it("deve filtrar nome por trecho, e professora e id por valor exato", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { name: "turma", teacher: TEACHER_ID, id: CLASS_ID } });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({
        name: { $regex: "turma", $options: "i" },
        teacher: TEACHER_ID,
        _id: CLASS_ID,
      });
    });

    it("deve aceitar active como texto vindo da query string", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { active: "true" } });
      await repository.list({ query: { active: "1" } });
      await repository.list({ query: { active: "false" } });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({ active: true });
      expect(modelo.paginate.mock.calls[1][0]).toEqual({ active: true });
      expect(modelo.paginate.mock.calls[2][0]).toEqual({ active: false });
    });

    it("deve limitar a página a 100 registros", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { limit: "500" } });

      expect(modelo.paginate.mock.calls[0][1].limit).toBe(100);
    });

    it("deve respeitar página e limite informados", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { page: "2", limit: "5" } });

      const [, opcoes] = modelo.paginate.mock.calls[0];
      expect(opcoes.page).toBe(2);
      expect(opcoes.limit).toBe(5);
    });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salva = { _id: CLASS_ID, name: "Turma A" };
      const save = jest.fn().mockResolvedValue(salva);
      modelo.mockImplementation(() => ({ save }));

      const resultado = await repository.create({ name: "Turma A" });

      expect(modelo).toHaveBeenCalledWith({ name: "Turma A" });
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salva);
    });
  });

  describe("update", () => {
    it("deve devolver a turma já atualizada", async() => {
      const atualizada = { _id: CLASS_ID, name: "Turma B" };
      modelo.findByIdAndUpdate.mockResolvedValue(atualizada);

      const resultado = await repository.update(CLASS_ID, { name: "Turma B" });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(CLASS_ID, { name: "Turma B" }, { new: true });
      expect(resultado).toBe(atualizada);
    });

    it("deve lançar 404 quando a turma não existir", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue(null);

      const erro = await capturarErro(repository.update(CLASS_ID, { name: "Turma B" }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
    });
  });

  describe("delete", () => {
    it("deve remover a turma pelo id", async() => {
      modelo.findByIdAndDelete.mockResolvedValue({ _id: CLASS_ID });

      const resultado = await repository.delete(CLASS_ID);

      expect(modelo.findByIdAndDelete).toHaveBeenCalledWith(CLASS_ID);
      expect(resultado).toEqual({ _id: CLASS_ID });
    });
  });
});
