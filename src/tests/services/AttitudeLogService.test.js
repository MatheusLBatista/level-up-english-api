jest.mock("../../repository/AttitudeLogRepository.js");
jest.mock("../../repository/AttitudeRepository.js");
jest.mock("../../repository/UserRepository.js");
jest.mock("../../service/ProgressionService.js");
jest.mock("../../models/Class.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

import AttitudeLogService from "../../service/AttitudeLogService.js";
import AttitudeLogRepository from "../../repository/AttitudeLogRepository.js";
import AttitudeRepository from "../../repository/AttitudeRepository.js";
import UserRepository from "../../repository/UserRepository.js";
import ProgressionService from "../../service/ProgressionService.js";
import Class from "../../models/Class.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("AttitudeLogService", () => {
  let service;
  let repository;
  let attitudeRepository;
  let userRepository;
  let progressionService;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_A_ID = "507f1f77bcf86cd799439002";
  const PROF_B_ID = "507f1f77bcf86cd799439003";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const SEM_TURMA_ID = "507f1f77bcf86cd799439005";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const ATTITUDE_ID = "507f1f77bcf86cd799439021";
  const OUTRA_ATTITUDE_ID = "507f1f77bcf86cd799439022";
  const LOG_ID = "507f1f77bcf86cd799439031";

  const PROGRESSION = { student: ALUNO_A_ID, previous_level: 1, leveled_up: false };

  let usuarios;

  const registrar = (usuario) => {
    usuarios.set(String(usuario._id), usuario);
    return usuario;
  };

  const atitude = (overrides = {}) => ({
    _id: ATTITUDE_ID,
    name: "Participação",
    type: "positive",
    xp_value: 10,
    active: true,
    ...overrides,
  });

  const log = (overrides = {}) => ({
    _id: LOG_ID,
    student: ALUNO_A_ID,
    attitude: ATTITUDE_ID,
    teacher: PROF_A_ID,
    xp_applied: 10,
    toObject() {
      const { toObject, ...resto } = this;
      return resto;
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    usuarios = new Map();
    registrar({ _id: ADMIN_ID, role: "admin" });
    registrar({ _id: PROF_A_ID, role: "teacher" });
    registrar({ _id: PROF_B_ID, role: "teacher" });
    registrar({ _id: ALUNO_A_ID, role: "student", class: TURMA_A_ID });
    registrar({ _id: SEM_TURMA_ID, role: "student" });

    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    attitudeRepository = { findById: jest.fn().mockResolvedValue(atitude()) };

    userRepository = {
      findById: jest.fn(async(id) => {
        const encontrado = usuarios.get(String(id));
        if (!encontrado) throw new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
        return encontrado;
      }),
    };

    progressionService = { applyXp: jest.fn().mockResolvedValue(PROGRESSION) };

    AttitudeLogRepository.mockImplementation(() => repository);
    AttitudeRepository.mockImplementation(() => attitudeRepository);
    UserRepository.mockImplementation(() => userRepository);
    ProgressionService.mockImplementation(() => progressionService);

    Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_A_ID });

    service = new AttitudeLogService();
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
      const req = { params: {}, query: { student: ALUNO_A_ID } };

      await expect(service.list(req)).resolves.toBe(paginado);
      expect(repository.list).toHaveBeenCalledWith(req);
    });

    it("deve buscar por id quando ele vier na rota", async() => {
      const encontrado = log();
      repository.findById.mockResolvedValue(encontrado);

      await expect(service.list({ params: { id: LOG_ID } })).resolves.toBe(encontrado);
      expect(repository.list).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const corpo = { student: ALUNO_A_ID, attitude: ATTITUDE_ID };

    beforeEach(() => {
      repository.create.mockResolvedValue(log());
    });

    it("deve registrar quem aplicou a atitude", async() => {
      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalledWith({
        student: ALUNO_A_ID,
        attitude: ATTITUDE_ID,
        teacher: PROF_A_ID,
        xp_applied: 10,
      });
    });

    it("deve creditar o XP da atitude positiva", async() => {
      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 10);
    });

    it("deve descontar o XP da atitude negativa", async() => {
      attitudeRepository.findById.mockResolvedValue(atitude({ type: "negative", xp_value: 5 }));
      repository.create.mockResolvedValue(log({ xp_applied: -5 }));

      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      // O sinal vem do tipo, não do valor cadastrado.
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ xp_applied: -5 }));
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, -5);
    });

    it("deve normalizar o sinal quando o xp cadastrado contradiz o tipo", async() => {
      attitudeRepository.findById.mockResolvedValue(atitude({ type: "positive", xp_value: -10 }));

      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ xp_applied: 10 }));
    });

    it("deve devolver o log junto com a progressão do aluno", async() => {
      const resultado = await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(resultado).toMatchObject({ _id: LOG_ID, xp_applied: 10, progression: PROGRESSION });
    });

    it("deve lançar 400 quando a atitude estiver inativa", async() => {
      attitudeRepository.findById.mockResolvedValue(atitude({ active: false }));

      const erro = await capturarErro(service.create({ ...corpo }, { user_id: PROF_A_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta atitude está inativa.");
      expect(repository.create).not.toHaveBeenCalled();
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o alvo não for um aluno", async() => {
      const erro = await capturarErro(
        service.create({ ...corpo, student: PROF_B_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("O usuário informado não é um aluno.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando o aluno não for de uma turma da professora", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      const erro = await capturarErro(service.create({ ...corpo }, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode aplicar atitudes a alunos das suas turmas.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando o aluno não estiver em turma nenhuma", async() => {
      const erro = await capturarErro(
        service.create({ ...corpo, student: SEM_TURMA_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(Class.findById).not.toHaveBeenCalled();
    });

    it("deve reconhecer a dona da turma mesmo vindo populada", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: { _id: PROF_A_ID } });

      await service.create({ ...corpo }, { user_id: PROF_A_ID });

      expect(repository.create).toHaveBeenCalled();
    });

    it("deve permitir que o admin aplique atitude a qualquer aluno", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_B_ID });

      await service.create({ ...corpo }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ teacher: ADMIN_ID }));
    });
  });

  describe("delete", () => {
    it("deve estornar o XP aplicado ao remover o log", async() => {
      repository.findById.mockResolvedValue(log({ xp_applied: 10 }));

      await service.delete(LOG_ID, { user_id: PROF_A_ID });

      expect(repository.delete).toHaveBeenCalledWith(LOG_ID);
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, -10);
    });

    it("deve devolver o XP descontado quando a atitude era negativa", async() => {
      repository.findById.mockResolvedValue(log({ xp_applied: -5 }));

      await service.delete(LOG_ID, { user_id: PROF_A_ID });

      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 5);
    });

    it("deve estornar usando o aluno populado", async() => {
      repository.findById.mockResolvedValue(log({ student: { _id: ALUNO_A_ID, name: "Aluno A" } }));

      await service.delete(LOG_ID, { user_id: PROF_A_ID });

      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, -10);
    });

    it("deve lançar 403 quando a professora não foi quem aplicou", async() => {
      repository.findById.mockResolvedValue(log({ teacher: PROF_B_ID }));

      const erro = await capturarErro(service.delete(LOG_ID, { user_id: PROF_A_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Teachers can only change logs they applied.");
      expect(repository.delete).not.toHaveBeenCalled();
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve reconhecer a autora mesmo vindo populada", async() => {
      repository.findById.mockResolvedValue(log({ teacher: { _id: PROF_A_ID, name: "Professora A" } }));

      await service.delete(LOG_ID, { user_id: PROF_A_ID });

      expect(repository.delete).toHaveBeenCalled();
    });

    it("deve permitir que o admin remova log de qualquer professora", async() => {
      repository.findById.mockResolvedValue(log({ teacher: PROF_B_ID }));

      await service.delete(LOG_ID, { user_id: ADMIN_ID });

      expect(repository.delete).toHaveBeenCalledWith(LOG_ID);
    });

    it("deve propagar o 404 do repositório", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(service.delete(LOG_ID, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    beforeEach(() => {
      repository.findById.mockResolvedValue(log({ xp_applied: 10 }));
      repository.update.mockResolvedValue(log({ xp_applied: 25, attitude: OUTRA_ATTITUDE_ID }));
    });

    it("deve aplicar apenas a diferença de XP ao trocar a atitude", async() => {
      attitudeRepository.findById.mockResolvedValue(
        atitude({ _id: OUTRA_ATTITUDE_ID, xp_value: 25 }),
      );

      await service.update(LOG_ID, { attitude: OUTRA_ATTITUDE_ID }, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalledWith(LOG_ID, {
        attitude: OUTRA_ATTITUDE_ID,
        xp_applied: 25,
      });
      // O aluno já tinha 10; só faltam 15 para chegar aos 25.
      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, 15);
    });

    it("deve inverter o saldo ao trocar de atitude positiva para negativa", async() => {
      attitudeRepository.findById.mockResolvedValue(
        atitude({ _id: OUTRA_ATTITUDE_ID, type: "negative", xp_value: 5 }),
      );

      await service.update(LOG_ID, { attitude: OUTRA_ATTITUDE_ID }, { user_id: PROF_A_ID });

      expect(progressionService.applyXp).toHaveBeenCalledWith(ALUNO_A_ID, -15);
    });

    it("deve devolver o log junto com a progressão do aluno", async() => {
      attitudeRepository.findById.mockResolvedValue(atitude({ _id: OUTRA_ATTITUDE_ID, xp_value: 25 }));

      const resultado = await service.update(
        LOG_ID,
        { attitude: OUTRA_ATTITUDE_ID },
        { user_id: PROF_A_ID },
      );

      expect(resultado).toMatchObject({ xp_applied: 25, progression: PROGRESSION });
    });

    it("não deve mexer no XP quando a atitude não for trocada", async() => {
      repository.update.mockResolvedValue(log());

      await service.update(LOG_ID, {}, { user_id: PROF_A_ID });

      expect(repository.update).toHaveBeenCalledWith(LOG_ID, {});
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando a atitude nova estiver inativa", async() => {
      attitudeRepository.findById.mockResolvedValue(atitude({ active: false }));

      const erro = await capturarErro(
        service.update(LOG_ID, { attitude: OUTRA_ATTITUDE_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Esta atitude está inativa.");
      expect(repository.update).not.toHaveBeenCalled();
      expect(progressionService.applyXp).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a professora não foi quem aplicou", async() => {
      repository.findById.mockResolvedValue(log({ teacher: PROF_B_ID }));

      const erro = await capturarErro(
        service.update(LOG_ID, { attitude: OUTRA_ATTITUDE_ID }, { user_id: PROF_A_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin altere log de qualquer professora", async() => {
      repository.findById.mockResolvedValue(log({ teacher: PROF_B_ID, xp_applied: 10 }));
      attitudeRepository.findById.mockResolvedValue(atitude({ _id: OUTRA_ATTITUDE_ID, xp_value: 25 }));

      await service.update(LOG_ID, { attitude: OUTRA_ATTITUDE_ID }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalled();
    });
  });
});
