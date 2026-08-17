import RankingRepository from "../../repository/RankingRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("RankingRepository", () => {
  let rankingModel;
  let userModel;
  let classModel;
  let repository;

  const TURMA_ID = "507f1f77bcf86cd799439011";
  const ALUNO_ID = "507f1f77bcf86cd799439004";

  /**
   * Simula a query encadeável do mongoose: cada passo devolve a própria query,
   * e o await no fim resolve com o resultado combinado.
   */
  const query = (resultado) => {
    const encadeavel = {
      populate: jest.fn(() => encadeavel),
      select: jest.fn(() => encadeavel),
      sort: jest.fn(() => encadeavel),
      then: (resolve, reject) => Promise.resolve(resultado).then(resolve, reject),
    };

    return encadeavel;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    rankingModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    userModel = { find: jest.fn() };
    classModel = { find: jest.fn() };

    repository = new RankingRepository({ rankingModel, userModel, classModel });
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("findGlobal", () => {
    it("deve buscar o ranking do tipo global", async() => {
      const ranking = { type: "global", entries: [] };
      rankingModel.findOne.mockReturnValue(query(ranking));

      const resultado = await repository.findGlobal();

      expect(rankingModel.findOne).toHaveBeenCalledWith({ type: "global" });
      expect(resultado).toBe(ranking);
    });

    it("deve trazer os dados do aluno em cada entrada", async() => {
      const encadeavel = query({ type: "global" });
      rankingModel.findOne.mockReturnValue(encadeavel);

      await repository.findGlobal();

      expect(encadeavel.populate).toHaveBeenCalledWith("entries.user", "name email level xp");
    });

    it("deve lançar 404 quando o ranking global ainda não existir", async() => {
      rankingModel.findOne.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findGlobal());

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Ranking.");
    });
  });

  describe("findByClass", () => {
    it("deve buscar o ranking da turma informada", async() => {
      const ranking = { type: "class", class: TURMA_ID };
      rankingModel.findOne.mockReturnValue(query(ranking));

      const resultado = await repository.findByClass(TURMA_ID);

      expect(rankingModel.findOne).toHaveBeenCalledWith({ type: "class", class: TURMA_ID });
      expect(resultado).toBe(ranking);
    });

    it("deve trazer os alunos e o nome da turma", async() => {
      const encadeavel = query({ type: "class" });
      rankingModel.findOne.mockReturnValue(encadeavel);

      await repository.findByClass(TURMA_ID);

      expect(encadeavel.populate).toHaveBeenNthCalledWith(1, "entries.user", "name email level xp");
      expect(encadeavel.populate).toHaveBeenNthCalledWith(2, "class", "name");
    });

    it("deve lançar 404 quando a turma não tiver ranking", async() => {
      rankingModel.findOne.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findByClass(TURMA_ID));

      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em Ranking.");
    });
  });

  describe("listRankedUsers", () => {
    it("deve considerar apenas alunos ativos quando não houver turma", async() => {
      userModel.find.mockReturnValue(query([]));

      await repository.listRankedUsers();

      expect(userModel.find).toHaveBeenCalledWith({ active: true, role: "student" });
    });

    it("deve restringir à turma informada", async() => {
      userModel.find.mockReturnValue(query([]));

      await repository.listRankedUsers(TURMA_ID);

      expect(userModel.find).toHaveBeenCalledWith({
        active: true,
        role: "student",
        class: TURMA_ID,
      });
    });

    it("deve trazer só os campos usados no ranking, ordenados por XP", async() => {
      const encadeavel = query([]);
      userModel.find.mockReturnValue(encadeavel);

      await repository.listRankedUsers();

      expect(encadeavel.select).toHaveBeenCalledWith("_id xp level");
      expect(encadeavel.sort).toHaveBeenCalledWith({ xp: -1, level: -1 });
    });

    it("deve devolver os alunos encontrados", async() => {
      const alunos = [{ _id: ALUNO_ID, xp: 100, level: 2 }];
      userModel.find.mockReturnValue(query(alunos));

      await expect(repository.listRankedUsers()).resolves.toBe(alunos);
    });
  });

  describe("findActiveClasses", () => {
    it("deve trazer apenas os ids das turmas ativas", async() => {
      const encadeavel = query([{ _id: TURMA_ID }]);
      classModel.find.mockReturnValue(encadeavel);

      const resultado = await repository.findActiveClasses();

      expect(classModel.find).toHaveBeenCalledWith({ active: true });
      expect(encadeavel.select).toHaveBeenCalledWith("_id");
      expect(resultado).toEqual([{ _id: TURMA_ID }]);
    });
  });

  describe("upsert", () => {
    const entries = [{ user: ALUNO_ID, xp: 100, level: 2 }];

    beforeEach(() => {
      rankingModel.findOneAndUpdate.mockResolvedValue({ type: "global", entries });
    });

    it("deve procurar o ranking global só pelo tipo", async() => {
      await repository.upsert({ type: "global", entries });

      expect(rankingModel.findOneAndUpdate.mock.calls[0][0]).toEqual({ type: "global" });
    });

    it("deve procurar o ranking de turma pelo tipo e pela turma", async() => {
      await repository.upsert({ type: "class", classId: TURMA_ID, entries });

      expect(rankingModel.findOneAndUpdate.mock.calls[0][0]).toEqual({
        type: "class",
        class: TURMA_ID,
      });
    });

    it("deve gravar as entradas junto com a data da atualização", async() => {
      await repository.upsert({ type: "global", entries });

      expect(rankingModel.findOneAndUpdate.mock.calls[0][1]).toEqual({
        type: "global",
        class: null,
        entries,
        updatedAt: expect.any(Date),
      });
    });

    it("deve criar o ranking quando ele ainda não existir", async() => {
      await repository.upsert({ type: "global", entries });

      expect(rankingModel.findOneAndUpdate.mock.calls[0][2]).toEqual({
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      });
    });

    it("deve devolver o ranking já atualizado", async() => {
      const atualizado = { type: "global", entries };
      rankingModel.findOneAndUpdate.mockResolvedValue(atualizado);

      await expect(repository.upsert({ type: "global", entries })).resolves.toBe(atualizado);
    });
  });
});
