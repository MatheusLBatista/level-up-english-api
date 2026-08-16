import AttitudeService from "../../service/AttitudeService.js";
import AttitudeRepository from "../../repository/AttitudeRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../repository/AttitudeRepository.js");

describe("AttitudeService", () => {
  let service;
  let repository;

  const ATTITUDE_ID = "507f1f77bcf86cd799439011";
  const OUTRA_ATTITUDE_ID = "507f1f77bcf86cd799439012";
  const TEACHER_ID = "507f1f77bcf86cd799439002";

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    AttitudeRepository.mockImplementation(() => repository);
    service = new AttitudeService();
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("list", () => {
    it("deve delegar a listagem ao repositório quando não houver id", async() => {
      const paginado = { docs: [], totalDocs: 0 };
      repository.list.mockResolvedValue(paginado);
      const req = { params: {}, query: { type: "positive" } };

      const resultado = await service.list(req);

      expect(repository.list).toHaveBeenCalledWith(req);
      expect(resultado).toBe(paginado);
    });

    it("deve buscar por id quando ele vier na rota", async() => {
      const atitude = { _id: ATTITUDE_ID };
      repository.findById.mockResolvedValue(atitude);

      const resultado = await service.list({ params: { id: ATTITUDE_ID } });

      expect(repository.findById).toHaveBeenCalledWith(ATTITUDE_ID);
      expect(repository.list).not.toHaveBeenCalled();
      expect(resultado).toBe(atitude);
    });
  });

  describe("create", () => {
    const nova = { name: "Participação", xp_value: 10, type: "positive" };

    it("deve registrar quem cadastrou a atitude", async() => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...nova }, { user_id: TEACHER_ID });

      expect(repository.create).toHaveBeenCalledWith({ ...nova, createdBy: TEACHER_ID });
    });

    it("deve devolver a atitude criada", async() => {
      const criada = { _id: ATTITUDE_ID, ...nova };
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(criada);

      await expect(service.create({ ...nova }, { user_id: TEACHER_ID })).resolves.toBe(criada);
    });

    it("deve lançar 400 quando já existir atitude com o mesmo nome", async() => {
      repository.findByName.mockResolvedValue({ _id: OUTRA_ATTITUDE_ID });

      const erro = await capturarErro(service.create({ ...nova }, { user_id: TEACHER_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Attitude já existe.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve conferir o nome sem excluir id nenhum na criação", async() => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...nova }, { user_id: TEACHER_ID });

      expect(repository.findByName).toHaveBeenCalledWith("Participação", null);
    });
  });

  describe("update", () => {
    it("deve atualizar a atitude existente", async() => {
      const atualizada = { _id: ATTITUDE_ID, xp_value: 20 };
      repository.findById.mockResolvedValue({ _id: ATTITUDE_ID });
      repository.update.mockResolvedValue(atualizada);

      const resultado = await service.update(ATTITUDE_ID, { xp_value: 20 });

      expect(repository.update).toHaveBeenCalledWith(ATTITUDE_ID, { xp_value: 20 });
      expect(resultado).toBe(atualizada);
    });

    it("deve conferir se a atitude existe antes de atualizar", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(service.update(ATTITUDE_ID, { xp_value: 20 }));

      expect(erro.statusCode).toBe(404);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o nome novo já for de outra atitude", async() => {
      repository.findById.mockResolvedValue({ _id: ATTITUDE_ID });
      repository.findByName.mockResolvedValue({ _id: OUTRA_ATTITUDE_ID });

      const erro = await capturarErro(service.update(ATTITUDE_ID, { name: "Atraso" }));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Attitude já existe.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve ignorar a própria atitude ao conferir o nome", async() => {
      repository.findById.mockResolvedValue({ _id: ATTITUDE_ID });
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({});

      await service.update(ATTITUDE_ID, { name: "Participação" });

      expect(repository.findByName).toHaveBeenCalledWith("Participação", ATTITUDE_ID);
    });

    it("não deve conferir o nome quando ele não for alterado", async() => {
      repository.findById.mockResolvedValue({ _id: ATTITUDE_ID });
      repository.update.mockResolvedValue({});

      await service.update(ATTITUDE_ID, { xp_value: 20 });

      expect(repository.findByName).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve remover a atitude existente", async() => {
      repository.findById.mockResolvedValue({ _id: ATTITUDE_ID });
      repository.delete.mockResolvedValue({ _id: ATTITUDE_ID });

      const resultado = await service.delete(ATTITUDE_ID);

      expect(repository.delete).toHaveBeenCalledWith(ATTITUDE_ID);
      expect(resultado).toEqual({ _id: ATTITUDE_ID });
    });

    it("deve conferir se a atitude existe antes de remover", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(service.delete(ATTITUDE_ID));

      expect(erro.statusCode).toBe(404);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
