jest.mock("../../repository/XpAdjustmentRepository.js");
jest.mock("../../repository/UserRepository.js");
jest.mock("../../service/ProgressionService.js");
jest.mock("../../models/Class.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

import XpAdjustmentService from "../../service/XpAdjustmentService.js";
import XpAdjustmentRepository from "../../repository/XpAdjustmentRepository.js";
import UserRepository from "../../repository/UserRepository.js";
import ProgressionService from "../../service/ProgressionService.js";
import Class from "../../models/Class.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("XpAdjustmentService", () => {
  let service;
  let repository;
  let userRepository;
  let progressionService;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_A_ID = "507f1f77bcf86cd799439002";
  const PROF_B_ID = "507f1f77bcf86cd799439003";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const SEM_TURMA_ID = "507f1f77bcf86cd799439005";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const AJUSTE_ID = "507f1f77bcf86cd799439041";

  const PROGRESSION = { student: ALUNO_A_ID, previous_level: 1, leveled_up: false, leveled_down: false };

  let usuarios;

  const registrar = (usuario) => {
    usuarios.set(String(usuario._id), usuario);
    return usuario;
  };

  const ajusteSalvo = (dados) => ({
    _id: AJUSTE_ID,
    ...dados,
    toObject() {
      const { toObject, ...resto } = this;
      return resto;
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    usuarios = new Map();
    registrar({ _id: ADMIN_ID, role: "admin" });
    registrar({ _id: PROF_A_ID, role: "teacher" });
    registrar({ _id: PROF_B_ID, role: "teacher" });
    registrar({ _id: ALUNO_A_ID, role: "student", class: TURMA_A_ID });
    registrar({ _id: SEM_TURMA_ID, role: "student" });

    repository = { create: jest.fn(async(dados) => ajusteSalvo(dados)) };

    userRepository = {
      findById: jest.fn(async(id) => {
        const encontrado = usuarios.get(String(id));
        if (!encontrado) throw new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
        return encontrado;
      }),
    };

    progressionService = {
      adjustXp: jest.fn().mockResolvedValue({ xp_applied: 50, progression: PROGRESSION }),
    };

    XpAdjustmentRepository.mockImplementation(() => repository);
    UserRepository.mockImplementation(() => userRepository);
    ProgressionService.mockImplementation(() => progressionService);

    Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: PROF_A_ID });

    service = new XpAdjustmentService();
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  const como = (userId) => ({ user_id: userId });

  describe("create", () => {
    it("deve aplicar o XP pedido e registrar quem fez o ajuste", async() => {
      await service.create({ student: ALUNO_A_ID, amount: 50, reason: "Feira" }, como(PROF_A_ID));

      expect(progressionService.adjustXp).toHaveBeenCalledWith(ALUNO_A_ID, 50);
      expect(repository.create).toHaveBeenCalledWith({
        student: ALUNO_A_ID,
        teacher: PROF_A_ID,
        amount: 50,
        xp_applied: 50,
        reason: "Feira",
      });
    });

    it("deve gravar no log o XP aplicado de fato, e não o pedido", async() => {
      progressionService.adjustXp.mockResolvedValue({ xp_applied: -30, progression: PROGRESSION });

      const resultado = await service.create({ student: ALUNO_A_ID, amount: -50 }, como(PROF_A_ID));

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -50, xp_applied: -30 }),
      );
      expect(resultado.amount).toBe(-50);
      expect(resultado.xp_applied).toBe(-30);
    });

    it("deve devolver o ajuste junto com a progressão", async() => {
      const resultado = await service.create({ student: ALUNO_A_ID, amount: 50 }, como(PROF_A_ID));

      expect(resultado).toMatchObject({ _id: AJUSTE_ID, student: ALUNO_A_ID, progression: PROGRESSION });
      expect(resultado.toObject).toBeUndefined();
    });

    it("deve aplicar o XP antes de gravar o log", async() => {
      await service.create({ student: ALUNO_A_ID, amount: 50 }, como(PROF_A_ID));

      const ordemXp = progressionService.adjustXp.mock.invocationCallOrder[0];
      const ordemLog = repository.create.mock.invocationCallOrder[0];
      expect(ordemXp).toBeLessThan(ordemLog);
    });

    it("deve lançar 400 quando o alvo não for um aluno", async() => {
      const erro = await capturarErro(
        service.create({ student: PROF_B_ID, amount: 50 }, como(ADMIN_ID)),
      );

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("O usuário informado não é um aluno.");
      expect(progressionService.adjustXp).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando o aluno for de uma turma de outro professor", async() => {
      const erro = await capturarErro(
        service.create({ student: ALUNO_A_ID, amount: 50 }, como(PROF_B_ID)),
      );

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ajustar o XP de alunos das suas turmas.");
      expect(progressionService.adjustXp).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando o aluno não estiver em turma nenhuma", async() => {
      const erro = await capturarErro(
        service.create({ student: SEM_TURMA_ID, amount: 50 }, como(PROF_A_ID)),
      );

      expect(erro.statusCode).toBe(403);
      expect(Class.findById).not.toHaveBeenCalled();
      expect(progressionService.adjustXp).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a turma do aluno não existir mais", async() => {
      Class.findById.mockResolvedValue(null);

      const erro = await capturarErro(
        service.create({ student: ALUNO_A_ID, amount: 50 }, como(PROF_A_ID)),
      );

      expect(erro.statusCode).toBe(403);
    });

    it("deve aceitar a turma com o professor populado", async() => {
      Class.findById.mockResolvedValue({ _id: TURMA_A_ID, teacher: { _id: PROF_A_ID } });

      await service.create({ student: ALUNO_A_ID, amount: 50 }, como(PROF_A_ID));

      expect(progressionService.adjustXp).toHaveBeenCalled();
    });

    it("deve permitir que o admin ajuste qualquer aluno sem checar a turma", async() => {
      await service.create({ student: SEM_TURMA_ID, amount: 50 }, como(ADMIN_ID));

      expect(Class.findById).not.toHaveBeenCalled();
      expect(progressionService.adjustXp).toHaveBeenCalledWith(SEM_TURMA_ID, 50);
    });

    it("deve propagar o 404 quando o aluno não existir", async() => {
      const erro = await capturarErro(
        service.create({ student: "507f1f77bcf86cd799439099", amount: 50 }, como(PROF_A_ID)),
      );

      expect(erro.statusCode).toBe(404);
      expect(progressionService.adjustXp).not.toHaveBeenCalled();
    });
  });
});
