import ClassService from "../../service/ClassService.js";
import ClassRepository from "../../repository/ClassRepository.js";
import UserRepository from "../../repository/UserRepository.js";
import { CustomError } from "../../utils/helpers/index.js";

jest.mock("../../repository/ClassRepository.js");
jest.mock("../../repository/UserRepository.js");

describe("ClassService", () => {
  let service;
  let repository;
  let userRepository;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const TEACHER_ID = "507f1f77bcf86cd799439002";
  const OUTRO_TEACHER_ID = "507f1f77bcf86cd799439003";
  const STUDENT_ID = "507f1f77bcf86cd799439004";
  const TURMA_A = "507f1f77bcf86cd799439011";
  const TURMA_B = "507f1f77bcf86cd799439012";

  const admin = () => ({ _id: ADMIN_ID, role: "admin" });
  const teacher = () => ({ _id: TEACHER_ID, role: "teacher" });
  const aluno = (turma) => ({ _id: STUDENT_ID, role: "student", class: turma });

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      removeStudentsFromOtherClasses: jest.fn(),
    };

    userRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      setClass: jest.fn(),
      clearClass: jest.fn(),
    };

    ClassRepository.mockImplementation(() => repository);
    UserRepository.mockImplementation(() => userRepository);

    service = new ClassService();
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
    it("deve listar todas as turmas para o admin", async() => {
      const paginado = { docs: [], totalDocs: 0 };
      userRepository.findById.mockResolvedValue(admin());
      repository.list.mockResolvedValue(paginado);
      const req = { params: {}, query: {}, user_id: ADMIN_ID };

      const resultado = await service.list(req);

      expect(repository.list).toHaveBeenCalledWith(req);
      expect(resultado).toBe(paginado);
    });

    it("deve listar todas as turmas para a professora", async() => {
      userRepository.findById.mockResolvedValue(teacher());
      repository.list.mockResolvedValue({ docs: [] });
      const req = { params: {}, query: {}, user_id: TEACHER_ID };

      await service.list(req);

      // A professora enxerga o catálogo inteiro; a posse limita o que ela altera.
      expect(repository.list).toHaveBeenCalledWith(req);
    });

    it("deve limitar o aluno à turma dele", async() => {
      userRepository.findById.mockResolvedValue(aluno(TURMA_A));
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: {}, user_id: STUDENT_ID });

      expect(repository.list).toHaveBeenCalledWith({ query: { id: TURMA_A } });
    });

    it("não deve deixar o aluno forçar outra turma pela querystring", async() => {
      userRepository.findById.mockResolvedValue(aluno(TURMA_A));
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: { id: TURMA_B }, user_id: STUDENT_ID });

      // O id do aluno entra por último e sobrescreve o que veio na query.
      expect(repository.list).toHaveBeenCalledWith({ query: { id: TURMA_A } });
    });

    it("deve preservar os demais filtros do aluno", async() => {
      userRepository.findById.mockResolvedValue(aluno(TURMA_A));
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: { page: "2", limit: "5" }, user_id: STUDENT_ID });

      expect(repository.list).toHaveBeenCalledWith({
        query: { page: "2", limit: "5", id: TURMA_A },
      });
    });

    it("deve devolver lista vazia para o aluno sem turma", async() => {
      userRepository.findById.mockResolvedValue(aluno(undefined));

      const resultado = await service.list({ params: {}, query: {}, user_id: STUDENT_ID });

      expect(resultado).toEqual({ docs: [], totalDocs: 0, page: 1, totalPages: 0 });
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("deve devolver a turma pedida quando o aluno é dela", async() => {
      const turma = { _id: TURMA_A };
      userRepository.findById.mockResolvedValue(aluno(TURMA_A));
      repository.findById.mockResolvedValue(turma);

      const resultado = await service.list({ params: { id: TURMA_A }, user_id: STUDENT_ID });

      expect(resultado).toBe(turma);
    });

    it("deve lançar 403 quando o aluno pede uma turma que não é a dele", async() => {
      userRepository.findById.mockResolvedValue(aluno(TURMA_A));

      const erro = await capturarErro(
        service.list({ params: { id: TURMA_B }, user_id: STUDENT_ID }),
      );

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode ver a sua turma.");
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it("deve permitir que a professora veja uma turma que não é dela", async() => {
      const turma = { _id: TURMA_B };
      userRepository.findById.mockResolvedValue(teacher());
      repository.findById.mockResolvedValue(turma);

      await expect(
        service.list({ params: { id: TURMA_B }, user_id: TEACHER_ID }),
      ).resolves.toBe(turma);
    });
  });

  describe("create", () => {
    it("deve criar a turma quando o nome estiver livre", async() => {
      const criada = { _id: TURMA_A, name: "Turma A" };
      repository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(admin());
      repository.create.mockResolvedValue(criada);

      const resultado = await service.create({ name: "Turma A" }, { user_id: ADMIN_ID });

      expect(resultado).toBe(criada);
    });

    it("deve tornar a professora dona da turma que ela cria", async() => {
      repository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(teacher());
      repository.create.mockResolvedValue({});

      await service.create({ name: "Turma A" }, { user_id: TEACHER_ID });

      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", teacher: TEACHER_ID });
    });

    it("não deve deixar a professora atribuir a turma a outra pessoa", async() => {
      repository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(teacher());
      repository.create.mockResolvedValue({});

      await service.create(
        { name: "Turma A", teacher: OUTRO_TEACHER_ID },
        { user_id: TEACHER_ID },
      );

      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", teacher: TEACHER_ID });
    });

    it("deve respeitar a professora informada pelo admin", async() => {
      repository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(admin());
      userRepository.findByIds.mockResolvedValue([{ ...teacher(), active: true }]);
      repository.create.mockResolvedValue({});

      await service.create({ name: "Turma A", teacher: TEACHER_ID }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", teacher: TEACHER_ID });
    });

    it("deve lançar 400 quando já existir turma com o mesmo nome", async() => {
      repository.findByName.mockResolvedValue({ _id: TURMA_B, name: "Turma A" });

      const erro = await capturarErro(service.create({ name: "Turma A" }, { user_id: ADMIN_ID }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Já existe uma turma com este nome.");
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("professor informado pelo admin", () => {
    const professorAtivo = { _id: OUTRO_TEACHER_ID, role: "teacher", active: true };

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(admin());
      repository.findByName.mockResolvedValue(null);
      repository.findById.mockResolvedValue({ _id: TURMA_A, teacher: TEACHER_ID, students: [] });
      repository.create.mockResolvedValue({ _id: TURMA_A });
      repository.update.mockResolvedValue({ _id: TURMA_A });
    });

    it.each([
      ["não existir", []],
      ["não for professor", [{ ...professorAtivo, role: "student" }]],
      ["estiver inativo", [{ ...professorAtivo, active: false }]],
    ])("deve lançar 400 no create quando o professor %s", async(_, encontrados) => {
      userRepository.findByIds.mockResolvedValue(encontrados);

      const erro = await capturarErro(
        service.create({ name: "Turma A", teacher: OUTRO_TEACHER_ID }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.details).toEqual([{ path: "teacher", message: "Escolha um professor ativo." }]);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve lançar 400 no update quando o professor não for válido", async() => {
      userRepository.findByIds.mockResolvedValue([{ ...professorAtivo, active: false }]);

      const erro = await capturarErro(
        service.update(TURMA_A, { teacher: OUTRO_TEACHER_ID }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.details[0].path).toBe("teacher");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve deixar o admin tirar o professor da turma com null", async() => {
      await service.update(TURMA_A, { teacher: null }, { user_id: ADMIN_ID });

      expect(userRepository.findByIds).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { teacher: null });
    });

    it("deve ignorar teacher null enviado pela professora dona", async() => {
      userRepository.findById.mockResolvedValue(teacher());

      await service.update(TURMA_A, { teacher: null, name: "Turma A2" }, { user_id: TEACHER_ID });

      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { name: "Turma A2" });
    });

    it("deve lançar 400 sem ir ao banco quando o id for malformado", async() => {
      const erro = await capturarErro(
        service.create({ name: "Turma A", teacher: "id-invalido" }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(userRepository.findByIds).not.toHaveBeenCalled();
    });

    it("não deve validar professor quando quem cria é a própria professora", async() => {
      userRepository.findById.mockResolvedValue(teacher());

      await service.create({ name: "Turma A", teacher: OUTRO_TEACHER_ID }, { user_id: TEACHER_ID });

      expect(userRepository.findByIds).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", teacher: TEACHER_ID });
    });
  });

  describe("sincronização de students", () => {
    const ALUNO_1 = "507f1f77bcf86cd799439021";
    const ALUNO_2 = "507f1f77bcf86cd799439022";
    const ALUNO_3 = "507f1f77bcf86cd799439023";

    const alunoCom = (id) => ({ _id: id, role: "student" });

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(admin());
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({ _id: TURMA_A });
      repository.update.mockResolvedValue({ _id: TURMA_A });
    });

    it("deve apontar os alunos da turma criada para ela e tirá-los da anterior", async() => {
      userRepository.findByIds.mockResolvedValue([alunoCom(ALUNO_1), alunoCom(ALUNO_2)]);

      await service.create({ name: "Turma A", students: [ALUNO_1, ALUNO_2] }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", students: [ALUNO_1, ALUNO_2] });
      expect(repository.removeStudentsFromOtherClasses).toHaveBeenCalledWith([ALUNO_1, ALUNO_2], TURMA_A);
      expect(userRepository.setClass).toHaveBeenCalledWith([ALUNO_1, ALUNO_2], TURMA_A);
      expect(userRepository.clearClass).not.toHaveBeenCalled();
    });

    it("deve sincronizar só os adicionados e os removidos no update", async() => {
      // students vem populado do findById do repositório
      repository.findById.mockResolvedValue({
        _id: TURMA_A,
        teacher: TEACHER_ID,
        students: [{ _id: ALUNO_1 }, { _id: ALUNO_2 }],
      });
      userRepository.findByIds.mockResolvedValue([alunoCom(ALUNO_2), alunoCom(ALUNO_3)]);

      await service.update(TURMA_A, { students: [ALUNO_2, ALUNO_3] }, { user_id: ADMIN_ID });

      expect(repository.removeStudentsFromOtherClasses).toHaveBeenCalledWith([ALUNO_3], TURMA_A);
      expect(userRepository.setClass).toHaveBeenCalledWith([ALUNO_3], TURMA_A);
      expect(userRepository.clearClass).toHaveBeenCalledWith([ALUNO_1], TURMA_A);
    });

    it("deve aceitar a lista vazia, tirando todos os alunos", async() => {
      repository.findById.mockResolvedValue({ _id: TURMA_A, students: [ALUNO_1] });
      userRepository.findByIds.mockResolvedValue([]);

      await service.update(TURMA_A, { students: [] }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { students: [] });
      expect(userRepository.setClass).not.toHaveBeenCalled();
      expect(userRepository.clearClass).toHaveBeenCalledWith([ALUNO_1], TURMA_A);
    });

    it("deve gravar cada aluno uma vez só, mesmo repetido no corpo", async() => {
      userRepository.findByIds.mockResolvedValue([alunoCom(ALUNO_1)]);

      await service.create({ name: "Turma A", students: [ALUNO_1, ALUNO_1] }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith({ name: "Turma A", students: [ALUNO_1] });
    });

    it("não deve mexer nos usuários quando students não for enviado", async() => {
      repository.findById.mockResolvedValue({ _id: TURMA_A, students: [ALUNO_1] });

      await service.update(TURMA_A, { name: "Turma A2" }, { user_id: ADMIN_ID });

      expect(userRepository.findByIds).not.toHaveBeenCalled();
      expect(userRepository.setClass).not.toHaveBeenCalled();
      expect(userRepository.clearClass).not.toHaveBeenCalled();
    });

    it.each([
      ["não existir", [], [ALUNO_1]],
      ["não for aluno", [{ _id: ALUNO_1, role: "teacher" }], [ALUNO_1]],
      ["for malformado", [], ["id-invalido"]],
    ])("deve lançar 400 sem gravar quando algum id %s", async(_, encontrados, ids) => {
      userRepository.findByIds.mockResolvedValue(encontrados);

      const erro = await capturarErro(
        service.create({ name: "Turma A", students: ids }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.details).toEqual([
        { path: "students", message: "Todos os ids devem ser de alunos cadastrados." },
      ]);
      expect(repository.create).not.toHaveBeenCalled();
      expect(userRepository.setClass).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const turmaDe = (donoId) => ({ _id: TURMA_A, name: "Turma A", teacher: donoId });

    it("deve permitir que a professora dona altere a turma", async() => {
      const atualizada = { _id: TURMA_A, name: "Turma A Renomeada" };
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(atualizada);

      const resultado = await service.update(
        TURMA_A,
        { name: "Turma A Renomeada" },
        { user_id: TEACHER_ID },
      );

      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { name: "Turma A Renomeada" });
      expect(resultado).toBe(atualizada);
    });

    it("deve reconhecer a dona mesmo com a professora vindo populada", async() => {
      repository.findById.mockResolvedValue({ _id: TURMA_A, teacher: { _id: TEACHER_ID, name: "Professora" } });
      userRepository.findById.mockResolvedValue(teacher());
      repository.update.mockResolvedValue({});

      await service.update(TURMA_A, { active: false }, { user_id: TEACHER_ID });

      expect(repository.update).toHaveBeenCalled();
    });

    it("deve lançar 403 quando a professora tenta alterar turma de outra", async() => {
      repository.findById.mockResolvedValue(turmaDe(OUTRO_TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());

      const erro = await capturarErro(
        service.update(TURMA_A, { name: "Invadida" }, { user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Você só pode editar as suas turmas.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("não deve deixar a professora passar a turma para outra pessoa", async() => {
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());
      repository.update.mockResolvedValue({});

      await service.update(
        TURMA_A,
        { active: false, teacher: OUTRO_TEACHER_ID },
        { user_id: TEACHER_ID },
      );

      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { active: false });
    });

    it("deve permitir que o admin altere turma de qualquer professora", async() => {
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(admin());
      userRepository.findByIds.mockResolvedValue([{ _id: OUTRO_TEACHER_ID, role: "teacher", active: true }]);
      repository.update.mockResolvedValue({});

      await service.update(TURMA_A, { teacher: OUTRO_TEACHER_ID }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalledWith(TURMA_A, { teacher: OUTRO_TEACHER_ID });
    });

    it("deve conferir se a turma existe antes de julgar a posse", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(
        service.update(TURMA_A, { name: "Fantasma" }, { user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(404);
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o nome novo já for de outra turma", async() => {
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());
      repository.findByName.mockResolvedValue({ _id: TURMA_B, name: "Turma B" });

      const erro = await capturarErro(
        service.update(TURMA_A, { name: "Turma B" }, { user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Já existe uma turma com este nome.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve ignorar a própria turma ao conferir o nome", async() => {
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({});

      await service.update(TURMA_A, { name: "Turma A" }, { user_id: TEACHER_ID });

      // Sem o id excluído, a turma colidiria com ela mesma ao reenviar o nome.
      expect(repository.findByName).toHaveBeenCalledWith("Turma A", TURMA_A);
    });

    it("não deve conferir o nome quando ele não for alterado", async() => {
      repository.findById.mockResolvedValue(turmaDe(TEACHER_ID));
      userRepository.findById.mockResolvedValue(teacher());
      repository.update.mockResolvedValue({});

      await service.update(TURMA_A, { active: false }, { user_id: TEACHER_ID });

      expect(repository.findByName).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve remover a turma existente", async() => {
      repository.findById.mockResolvedValue({ _id: TURMA_A });
      repository.delete.mockResolvedValue({ _id: TURMA_A });

      const resultado = await service.delete(TURMA_A, { user_id: ADMIN_ID });

      expect(repository.delete).toHaveBeenCalledWith(TURMA_A);
      expect(resultado).toBeNull();
    });

    it("deve conferir se a turma existe antes de remover", async() => {
      repository.findById.mockRejectedValue(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(service.delete(TURMA_A, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(404);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
