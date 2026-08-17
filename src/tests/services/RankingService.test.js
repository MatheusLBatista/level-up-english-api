jest.mock("../../repository/RankingRepository.js");
jest.mock("../../repository/UserRepository.js");

import RankingService from "../../service/RankingService.js";
import RankingRepository from "../../repository/RankingRepository.js";
import UserRepository from "../../repository/UserRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("RankingService", () => {
  let service;
  let repository;
  let userRepository;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const PROF_ID = "507f1f77bcf86cd799439002";
  const ALUNO_A_ID = "507f1f77bcf86cd799439004";
  const SEM_TURMA_ID = "507f1f77bcf86cd799439005";
  const TURMA_A_ID = "507f1f77bcf86cd799439011";
  const TURMA_B_ID = "507f1f77bcf86cd799439012";

  let usuarios;

  const registrar = (usuario) => {
    usuarios.set(String(usuario._id), usuario);
    return usuario;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    usuarios = new Map();
    registrar({ _id: ADMIN_ID, role: "admin" });
    registrar({ _id: PROF_ID, role: "teacher" });
    registrar({ _id: ALUNO_A_ID, role: "student", class: TURMA_A_ID });
    registrar({ _id: SEM_TURMA_ID, role: "student" });

    repository = {
      findGlobal: jest.fn().mockResolvedValue({ type: "global", entries: [] }),
      findByClass: jest.fn().mockResolvedValue({ type: "class", entries: [] }),
      listRankedUsers: jest.fn().mockResolvedValue([]),
      findActiveClasses: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(async(dados) => dados),
    };

    userRepository = {
      findById: jest.fn(async(id) => {
        const encontrado = usuarios.get(String(id));
        if (!encontrado) throw new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
        return encontrado;
      }),
    };

    RankingRepository.mockImplementation(() => repository);
    UserRepository.mockImplementation(() => userRepository);

    service = new RankingService();
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("getGlobal", () => {
    it("deve devolver o ranking global do repositório", async() => {
      const ranking = { type: "global", entries: [{ user: ALUNO_A_ID, xp: 100 }] };
      repository.findGlobal.mockResolvedValue(ranking);

      await expect(service.getGlobal()).resolves.toBe(ranking);
    });

    it("deve propagar o 404 quando o ranking ainda não foi montado", async() => {
      repository.findGlobal.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound" }),
      );

      const erro = await capturarErro(service.getGlobal());

      expect(erro.statusCode).toBe(404);
    });
  });

  describe("getByClass", () => {
    it("deve devolver o ranking da própria turma do aluno", async() => {
      const ranking = { type: "class", class: TURMA_A_ID };
      repository.findByClass.mockResolvedValue(ranking);

      const resultado = await service.getByClass(TURMA_A_ID, { user_id: ALUNO_A_ID });

      expect(repository.findByClass).toHaveBeenCalledWith(TURMA_A_ID);
      expect(resultado).toBe(ranking);
    });

    it("deve lançar 403 quando o aluno pedir o ranking de outra turma", async() => {
      const erro = await capturarErro(service.getByClass(TURMA_B_ID, { user_id: ALUNO_A_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver o ranking da sua própria turma.");
      expect(repository.findByClass).not.toHaveBeenCalled();
    });

    it("deve permitir que a professora veja o ranking de qualquer turma", async() => {
      await service.getByClass(TURMA_B_ID, { user_id: PROF_ID });

      expect(repository.findByClass).toHaveBeenCalledWith(TURMA_B_ID);
    });

    it("deve permitir que o admin veja o ranking de qualquer turma", async() => {
      await service.getByClass(TURMA_B_ID, { user_id: ADMIN_ID });

      expect(repository.findByClass).toHaveBeenCalledWith(TURMA_B_ID);
    });
  });

  describe("getMyClass", () => {
    it("deve devolver o ranking da turma do aluno logado", async() => {
      await service.getMyClass({ user_id: ALUNO_A_ID });

      expect(repository.findByClass).toHaveBeenCalledWith(TURMA_A_ID);
    });

    it("deve lançar 404 quando o aluno não tem turma", async() => {
      const erro = await capturarErro(service.getMyClass({ user_id: SEM_TURMA_ID }));

      expect(erro.statusCode).toBe(404);
      expect(erro.customMessage).toBe("Você não está matriculado em nenhuma turma.");
      expect(repository.findByClass).not.toHaveBeenCalled();
    });

    it("deve lançar 404 também para a professora sem turma vinculada", async() => {
      const erro = await capturarErro(service.getMyClass({ user_id: PROF_ID }));

      expect(erro.statusCode).toBe(404);
    });
  });

  describe("buildEntries", () => {
    it("deve montar a entrada com aluno, XP e nível", () => {
      const entries = service.buildEntries([{ _id: ALUNO_A_ID, xp: 100, level: 2 }]);

      expect(entries).toEqual([{ user: ALUNO_A_ID, xp: 100, level: 2 }]);
    });

    it("deve recalcular o nível a partir do XP, ignorando o nível gravado", () => {
      // O aluno tem 400 XP (nível 3), mas o campo level ficou defasado em 1.
      const entries = service.buildEntries([{ _id: ALUNO_A_ID, xp: 400, level: 1 }]);

      expect(entries[0].level).toBe(3);
    });

    it("deve tratar aluno sem XP como zero e nível 1", () => {
      const entries = service.buildEntries([
        { _id: ALUNO_A_ID, xp: null },
        { _id: SEM_TURMA_ID },
      ]);

      expect(entries).toEqual([
        { user: ALUNO_A_ID, xp: 0, level: 1 },
        { user: SEM_TURMA_ID, xp: 0, level: 1 },
      ]);
    });

    it("deve ordenar do maior para o menor XP", () => {
      const entries = service.buildEntries([
        { _id: "a", xp: 50 },
        { _id: "b", xp: 400 },
        { _id: "c", xp: 100 },
      ]);

      expect(entries.map((entrada) => entrada.xp)).toEqual([400, 100, 50]);
    });

    it("deve cortar o ranking no top 30", () => {
      const alunos = Array.from({ length: 35 }, (_, index) => ({
        _id: `aluno-${index}`,
        xp: index,
      }));

      const entries = service.buildEntries(alunos);

      expect(entries).toHaveLength(30);
      // O corte tira os de menor XP: sobra de 34 até 5.
      expect(entries[0].xp).toBe(34);
      expect(entries[29].xp).toBe(5);
    });

    it("deve devolver lista vazia quando não houver alunos", () => {
      expect(service.buildEntries([])).toEqual([]);
    });
  });

  describe("refreshGlobal", () => {
    it("deve montar o ranking global com todos os alunos", async() => {
      repository.listRankedUsers.mockResolvedValue([{ _id: ALUNO_A_ID, xp: 100 }]);

      await service.refreshGlobal();

      expect(repository.listRankedUsers).toHaveBeenCalledWith();
      expect(repository.upsert).toHaveBeenCalledWith({
        type: "global",
        entries: [{ user: ALUNO_A_ID, xp: 100, level: 2 }],
      });
    });

    it("deve devolver o ranking gravado", async() => {
      const gravado = { type: "global", entries: [] };
      repository.upsert.mockResolvedValue(gravado);

      await expect(service.refreshGlobal()).resolves.toBe(gravado);
    });
  });

  describe("refreshClass", () => {
    it("deve montar o ranking apenas com os alunos da turma", async() => {
      repository.listRankedUsers.mockResolvedValue([{ _id: ALUNO_A_ID, xp: 400 }]);

      await service.refreshClass(TURMA_A_ID);

      expect(repository.listRankedUsers).toHaveBeenCalledWith(TURMA_A_ID);
      expect(repository.upsert).toHaveBeenCalledWith({
        type: "class",
        classId: TURMA_A_ID,
        entries: [{ user: ALUNO_A_ID, xp: 400, level: 3 }],
      });
    });
  });

  describe("refreshFromUsers", () => {
    it("deve recalcular o global e o de cada turma ativa", async() => {
      repository.findActiveClasses.mockResolvedValue([{ _id: TURMA_A_ID }, { _id: TURMA_B_ID }]);

      await service.refreshFromUsers();

      expect(repository.listRankedUsers).toHaveBeenNthCalledWith(1);
      expect(repository.listRankedUsers).toHaveBeenNthCalledWith(2, TURMA_A_ID);
      expect(repository.listRankedUsers).toHaveBeenNthCalledWith(3, TURMA_B_ID);
      expect(repository.upsert).toHaveBeenCalledTimes(3);
    });

    it("deve devolver o global junto com a lista de rankings de turma", async() => {
      repository.findActiveClasses.mockResolvedValue([{ _id: TURMA_A_ID }]);

      const resultado = await service.refreshFromUsers();

      expect(resultado.global).toMatchObject({ type: "global" });
      expect(resultado.classes).toHaveLength(1);
      expect(resultado.classes[0]).toMatchObject({ type: "class", classId: TURMA_A_ID });
    });

    it("deve recalcular só o global quando não houver turma ativa", async() => {
      const resultado = await service.refreshFromUsers();

      expect(repository.upsert).toHaveBeenCalledTimes(1);
      expect(resultado.classes).toEqual([]);
    });
  });
});
