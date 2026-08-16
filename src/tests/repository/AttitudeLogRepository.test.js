import AttitudeLogRepository from "../../repository/AttitudeLogRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("AttitudeLogRepository", () => {
  let modelo;
  let repository;

  const LOG_ID = "507f1f77bcf86cd799439011";
  const STUDENT_ID = "507f1f77bcf86cd799439001";
  const TEACHER_ID = "507f1f77bcf86cd799439002";
  const ATTITUDE_ID = "507f1f77bcf86cd799439003";

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
    modelo.findByIdAndUpdate = jest.fn();
    modelo.findByIdAndDelete = jest.fn();
    modelo.paginate = jest.fn();

    repository = new AttitudeLogRepository({ attitudeLogModel: modelo });
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
    it("deve devolver o log encontrado", async() => {
      const log = { _id: LOG_ID, xp_applied: 10 };
      modelo.findById.mockReturnValue(query(log));

      const resultado = await repository.findById(LOG_ID);

      expect(modelo.findById).toHaveBeenCalledWith(LOG_ID);
      expect(resultado).toBe(log);
    });

    it("deve popular aluno, professora e atitude", async() => {
      const encadeavel = query({ _id: LOG_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(LOG_ID);

      expect(encadeavel.populate).toHaveBeenNthCalledWith(1, "student", "name email");
      expect(encadeavel.populate).toHaveBeenNthCalledWith(2, "teacher", "name email");
      expect(encadeavel.populate).toHaveBeenNthCalledWith(3, "attitude", "name type xp_value");
    });

    it("deve lançar 404 quando o log não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findById(LOG_ID));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em AttitudeLog.");
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
        // Do mais recente para o mais antigo: é o que a professora quer ver.
        sort: { applied_at: -1 },
        populate: [
          { path: "student", select: "name email" },
          { path: "teacher", select: "name email" },
          { path: "attitude", select: "name type xp_value" },
        ],
      });
    });

    it("deve montar os filtros pelo AttitudeLogFilterBuild", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({
        query: { student: STUDENT_ID, teacher: TEACHER_ID, attitude: ATTITUDE_ID },
      });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({
        student: STUDENT_ID,
        teacher: TEACHER_ID,
        attitude: ATTITUDE_ID,
      });
    });

    it("deve limitar a página a 100 registros", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { limit: "500" } });

      expect(modelo.paginate.mock.calls[0][1].limit).toBe(100);
    });

    it("deve respeitar página e limite informados", async() => {
      modelo.paginate.mockResolvedValue(paginado);

      await repository.list({ query: { page: "4", limit: "20" } });

      const [, opcoes] = modelo.paginate.mock.calls[0];
      expect(opcoes.page).toBe(4);
      expect(opcoes.limit).toBe(20);
    });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salvo = { _id: LOG_ID, xp_applied: 10 };
      const save = jest.fn().mockResolvedValue(salvo);
      modelo.mockImplementation(() => ({ save }));

      const dados = { student: STUDENT_ID, attitude: ATTITUDE_ID, teacher: TEACHER_ID, xp_applied: 10 };
      const resultado = await repository.create(dados);

      expect(modelo).toHaveBeenCalledWith(dados);
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salvo);
    });
  });

  describe("update", () => {
    it("deve devolver o log já atualizado", async() => {
      const atualizado = { _id: LOG_ID, xp_applied: -5 };
      modelo.findByIdAndUpdate.mockResolvedValue(atualizado);

      const resultado = await repository.update(LOG_ID, { xp_applied: -5 });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(LOG_ID, { xp_applied: -5 }, { new: true });
      expect(resultado).toBe(atualizado);
    });

    it("deve lançar 404 quando o log não existir", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue(null);

      const erro = await capturarErro(repository.update(LOG_ID, { xp_applied: -5 }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
    });
  });

  describe("delete", () => {
    it("deve remover o log pelo id", async() => {
      modelo.findByIdAndDelete.mockResolvedValue({ _id: LOG_ID });

      const resultado = await repository.delete(LOG_ID);

      expect(modelo.findByIdAndDelete).toHaveBeenCalledWith(LOG_ID);
      expect(resultado).toEqual({ _id: LOG_ID });
    });
  });
});
