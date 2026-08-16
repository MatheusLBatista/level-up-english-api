import UserRepository from "../../repository/UserRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("UserRepository", () => {
  let modelo;
  let repository;

  const USER_ID = "507f1f77bcf86cd799439011";
  const MISSION_ID = "507f1f77bcf86cd799439022";

  const query = (resultado) => {
    const encadeavel = {
      select: jest.fn(() => encadeavel),
      exec: jest.fn().mockResolvedValue(resultado),
      then: (resolve, reject) => Promise.resolve(resultado).then(resolve, reject),
    };

    return encadeavel;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // O model é construtor e objeto ao mesmo tempo: `new this.userModel(...)` em
    // criar, e `this.userModel.findById(...)` no resto.
    modelo = jest.fn();
    modelo.findById = jest.fn();
    modelo.findOne = jest.fn();
    modelo.find = jest.fn();
    modelo.findByIdAndUpdate = jest.fn();
    modelo.findOneAndUpdate = jest.fn();
    modelo.findByIdAndDelete = jest.fn();
    modelo.updateMany = jest.fn();
    modelo.paginate = jest.fn();

    repository = new UserRepository({ userModel: modelo });
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
    it("deve devolver o usuário encontrado", async() => {
      const usuario = { _id: USER_ID, name: "Aluno" };
      modelo.findById.mockReturnValue(query(usuario));

      const resultado = await repository.findById(USER_ID);

      expect(modelo.findById).toHaveBeenCalledWith(USER_ID);
      expect(resultado).toBe(usuario);
    });

    it("deve incluir os tokens quando pedido", async() => {
      const encadeavel = query({ _id: USER_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(USER_ID, true);

      expect(encadeavel.select).toHaveBeenCalledWith("+refreshtoken +accesstoken");
    });

    it("não deve pedir os tokens por padrão", async() => {
      const encadeavel = query({ _id: USER_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findById(USER_ID);

      expect(encadeavel.select).not.toHaveBeenCalled();
    });

    it("deve lançar 404 quando o usuário não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findById(USER_ID));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em User.");
    });
  });

  describe("findByIdWithPassword", () => {
    it("deve pedir a senha explicitamente", async() => {
      const encadeavel = query({ _id: USER_ID });
      modelo.findById.mockReturnValue(encadeavel);

      await repository.findByIdWithPassword(USER_ID);

      // A senha tem select: false no model; sem isso ela não vem.
      expect(encadeavel.select).toHaveBeenCalledWith("+password");
    });

    it("deve lançar 404 quando o usuário não existir", async() => {
      modelo.findById.mockReturnValue(query(null));

      const erro = await capturarErro(repository.findByIdWithPassword(USER_ID));

      expect(erro.statusCode).toBe(404);
    });
  });

  describe("findByEmail", () => {
    it("deve buscar pelo e-mail trazendo a senha", async() => {
      const encadeavel = query({ email: "aluno@escola.com" });
      modelo.findOne.mockReturnValue(encadeavel);

      const resultado = await repository.findByEmail("aluno@escola.com");

      expect(modelo.findOne).toHaveBeenCalledWith({ email: "aluno@escola.com" });
      expect(encadeavel.select).toHaveBeenCalledWith("+password");
      expect(resultado).toEqual({ email: "aluno@escola.com" });
    });

    it("deve ignorar o próprio usuário quando um id for excluído", async() => {
      modelo.findOne.mockReturnValue(query(null));

      await repository.findByEmail("aluno@escola.com", USER_ID);

      // É o que permite o usuário manter o próprio e-mail ao se atualizar.
      expect(modelo.findOne).toHaveBeenCalledWith({
        email: "aluno@escola.com",
        _id: { $ne: USER_ID },
      });
    });

    it("deve devolver null quando o e-mail não estiver cadastrado", async() => {
      modelo.findOne.mockReturnValue(query(null));

      await expect(repository.findByEmail("naoexiste@escola.com")).resolves.toBeNull();
    });
  });

  describe("findByName", () => {
    it("deve buscar por nome sem diferenciar maiúsculas", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("maria");

      expect(modelo.findOne).toHaveBeenCalledWith({ name: { $regex: "maria", $options: "i" } });
    });

    it("deve excluir o id informado da busca", async() => {
      modelo.findOne.mockResolvedValue(null);

      await repository.findByName("maria", USER_ID);

      expect(modelo.findOne).toHaveBeenCalledWith({
        name: { $regex: "maria", $options: "i" },
        _id: { $ne: USER_ID },
      });
    });
  });

  describe("findByIds", () => {
    it("deve buscar todos os usuários da lista", async() => {
      modelo.find.mockResolvedValue([]);

      await repository.findByIds([USER_ID, MISSION_ID]);

      expect(modelo.find).toHaveBeenCalledWith({ _id: { $in: [USER_ID, MISSION_ID] } });
    });
  });

  describe("list", () => {
    const paginado = (docs = []) => ({ docs, totalDocs: docs.length, page: 1 });

    it("deve listar sem filtros quando não houver query", async() => {
      modelo.paginate.mockResolvedValue(paginado());

      await repository.list({});

      expect(modelo.paginate).toHaveBeenCalledWith({}, { page: 1, limit: 10, sort: { name: 1 } });
    });

    it("deve filtrar nome e e-mail por trecho, e papel por valor exato", async() => {
      modelo.paginate.mockResolvedValue(paginado());

      await repository.list({ query: { name: "mar", email: "escola", role: "student" } });

      const [filtros] = modelo.paginate.mock.calls[0];
      expect(filtros).toEqual({
        name: { $regex: "mar", $options: "i" },
        email: { $regex: "escola", $options: "i" },
        role: "student",
      });
    });

    it("deve aceitar active como texto vindo da query string", async() => {
      modelo.paginate.mockResolvedValue(paginado());

      await repository.list({ query: { active: "true" } });
      await repository.list({ query: { active: "1" } });
      await repository.list({ query: { active: "false" } });

      expect(modelo.paginate.mock.calls[0][0]).toEqual({ active: true });
      expect(modelo.paginate.mock.calls[1][0]).toEqual({ active: true });
      expect(modelo.paginate.mock.calls[2][0]).toEqual({ active: false });
    });

    it("deve limitar a página a 100 registros", async() => {
      modelo.paginate.mockResolvedValue(paginado());

      await repository.list({ query: { limit: "500" } });

      // Teto do RNF-002: ninguém puxa a base inteira em uma requisição.
      expect(modelo.paginate.mock.calls[0][1].limit).toBe(100);
    });

    it("deve respeitar página e limite informados", async() => {
      modelo.paginate.mockResolvedValue(paginado());

      await repository.list({ query: { page: "3", limit: "25" } });

      expect(modelo.paginate.mock.calls[0][1]).toEqual({ page: 3, limit: 25, sort: { name: 1 } });
    });

    it("deve converter os documentos em objetos simples", async() => {
      const doc = { name: "Aluno", toObject: () => ({ name: "Aluno" }) };
      modelo.paginate.mockResolvedValue(paginado([doc]));

      const resultado = await repository.list({});

      expect(resultado.docs[0]).toEqual({ name: "Aluno" });
      expect(resultado.docs[0]).not.toHaveProperty("toObject");
    });

    it("deve aceitar documentos que já são objetos simples", async() => {
      modelo.paginate.mockResolvedValue(paginado([{ name: "Aluno" }]));

      const resultado = await repository.list({});

      expect(resultado.docs[0]).toEqual({ name: "Aluno" });
    });
  });

  describe("create", () => {
    it("deve instanciar o model com os dados e salvar", async() => {
      const salvo = { _id: USER_ID, name: "Novo" };
      const save = jest.fn().mockResolvedValue(salvo);
      modelo.mockImplementation(() => ({ save }));

      const resultado = await repository.create({ name: "Novo" });

      expect(modelo).toHaveBeenCalledWith({ name: "Novo" });
      expect(save).toHaveBeenCalled();
      expect(resultado).toBe(salvo);
    });
  });

  describe("update", () => {
    it("deve devolver o documento já atualizado", async() => {
      const atualizado = { _id: USER_ID, name: "Novo nome" };
      modelo.findByIdAndUpdate.mockResolvedValue(atualizado);

      const resultado = await repository.update(USER_ID, { name: "Novo nome" });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(USER_ID, { name: "Novo nome" }, { new: true });
      expect(resultado).toBe(atualizado);
    });

    it("deve lançar 404 quando o usuário não existir", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue(null);

      const erro = await capturarErro(repository.update(USER_ID, { name: "Novo nome" }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(404);
    });
  });

  describe("delete", () => {
    it("deve remover o usuário pelo id", async() => {
      modelo.findByIdAndDelete.mockResolvedValue({ _id: USER_ID });

      const resultado = await repository.delete(USER_ID);

      expect(modelo.findByIdAndDelete).toHaveBeenCalledWith(USER_ID);
      expect(resultado).toEqual({ _id: USER_ID });
    });
  });

  describe("storeTokens", () => {
    it("deve gravar os dois tokens no documento", async() => {
      const save = jest.fn().mockResolvedValue(true);
      const documento = { _id: USER_ID, save };
      modelo.findById.mockResolvedValue(documento);

      await repository.storeTokens(USER_ID, "access", "refresh");

      expect(documento.accesstoken).toBe("access");
      expect(documento.refreshtoken).toBe("refresh");
      expect(save).toHaveBeenCalled();
    });

    it("deve lançar 401 quando o usuário não existir", async() => {
      modelo.findById.mockResolvedValue(null);

      const erro = await capturarErro(repository.storeTokens(USER_ID, "access", "refresh"));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(401);
    });
  });

  describe("removeTokens", () => {
    it("deve zerar os tokens do usuário", async() => {
      modelo.findByIdAndUpdate.mockReturnValue(query({ _id: USER_ID }));

      await repository.removeTokens(USER_ID);

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(
        USER_ID,
        { refreshtoken: null, accesstoken: null },
        { new: true },
      );
    });

    it("deve lançar 404 quando o usuário não existir", async() => {
      modelo.findByIdAndUpdate.mockReturnValue(query(null));

      const erro = await capturarErro(repository.removeTokens(USER_ID));

      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Recurso não encontrado em User.");
    });
  });

  describe("findMissionProgress", () => {
    const comProgresso = (entradas) => query({ _id: USER_ID, mission_progress: entradas });

    it("deve devolver a entrada da missão pedida", async() => {
      const entrada = { mission_id: MISSION_ID, done: true, score: 80 };
      modelo.findById.mockReturnValue(comProgresso([{ mission_id: "outra" }, entrada]));

      const resultado = await repository.findMissionProgress(USER_ID, MISSION_ID);

      expect(resultado).toBe(entrada);
    });

    it("deve devolver null quando o aluno ainda não tentou a missão", async() => {
      modelo.findById.mockReturnValue(comProgresso([{ mission_id: "outra" }]));

      await expect(repository.findMissionProgress(USER_ID, MISSION_ID)).resolves.toBeNull();
    });

    it("deve devolver null quando o aluno não tem progresso nenhum", async() => {
      modelo.findById.mockReturnValue(query({ _id: USER_ID }));

      await expect(repository.findMissionProgress(USER_ID, MISSION_ID)).resolves.toBeNull();
    });
  });

  describe("upsertMissionProgress", () => {
    it("deve atualizar a entrada existente pelo arrayFilter", async() => {
      const atualizado = { _id: USER_ID };
      modelo.findOneAndUpdate.mockResolvedValue(atualizado);

      const resultado = await repository.upsertMissionProgress(USER_ID, MISSION_ID, { done: true, score: 90 });

      expect(modelo.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: USER_ID, "mission_progress.mission_id": MISSION_ID },
        { $set: { "mission_progress.$[entry].done": true, "mission_progress.$[entry].score": 90 } },
        { new: true, arrayFilters: [{ "entry.mission_id": MISSION_ID }] },
      );
      expect(modelo.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(resultado).toBe(atualizado);
    });

    it("deve inserir a entrada quando ainda não houver progresso na missão", async() => {
      modelo.findOneAndUpdate.mockResolvedValue(null);
      modelo.findByIdAndUpdate.mockResolvedValue({ _id: USER_ID });

      await repository.upsertMissionProgress(USER_ID, MISSION_ID, { done: true, score: 90 });

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(
        USER_ID,
        { $push: { mission_progress: { mission_id: MISSION_ID, done: true, score: 90 } } },
        { new: true },
      );
    });
  });

  describe("setLevelForXpRange", () => {
    it("deve atualizar somente quem está na faixa e ainda não tem o nível", async() => {
      modelo.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const total = await repository.setLevelForXpRange(3, 400, 900);

      expect(modelo.updateMany).toHaveBeenCalledWith(
        { level: { $ne: 3 }, xp: { $gte: 400, $lt: 900 } },
        { level: 3 },
      );
      expect(total).toBe(3);
    });

    it("deve deixar a faixa aberta nas pontas", async() => {
      modelo.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await repository.setLevelForXpRange(1, null, 100);
      await repository.setLevelForXpRange(50, 240100, null);

      expect(modelo.updateMany.mock.calls[0][0]).toEqual({ level: { $ne: 1 }, xp: { $lt: 100 } });
      expect(modelo.updateMany.mock.calls[1][0]).toEqual({ level: { $ne: 50 }, xp: { $gte: 240100 } });
    });

    it("deve devolver 0 quando o driver não informar a contagem", async() => {
      modelo.updateMany.mockResolvedValue({});

      await expect(repository.setLevelForXpRange(2, 100, 400)).resolves.toBe(0);
    });
  });

  describe("código de recuperação de senha", () => {
    it("deve gravar código e validade", async() => {
      const validade = new Date();
      modelo.findByIdAndUpdate.mockResolvedValue({});

      await repository.setRecoveryCode(USER_ID, "codigo", validade);

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(
        USER_ID,
        { password_recovery_code: "codigo", exp_password_recovery_code: validade },
        { new: true },
      );
    });

    it("deve limpar código e validade", async() => {
      modelo.findByIdAndUpdate.mockResolvedValue({});

      await repository.clearRecoveryCode(USER_ID);

      expect(modelo.findByIdAndUpdate).toHaveBeenCalledWith(
        USER_ID,
        { password_recovery_code: null, exp_password_recovery_code: null },
        { new: true },
      );
    });

    it("deve buscar pelo código trazendo os campos ocultos", async() => {
      const encadeavel = query({ _id: USER_ID });
      modelo.findOne.mockReturnValue(encadeavel);

      await repository.findByRecoveryCode("codigo");

      expect(modelo.findOne).toHaveBeenCalledWith({ password_recovery_code: "codigo" });
      expect(encadeavel.select).toHaveBeenCalledWith(
        "+password +password_recovery_code +exp_password_recovery_code",
      );
    });
  });
});
