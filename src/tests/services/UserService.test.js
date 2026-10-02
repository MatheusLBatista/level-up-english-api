import bcrypt from "bcrypt";
import UserService from "../../service/UserService.js";
import UserRepository from "../../repository/UserRepository.js";
import ClassRepository from "../../repository/ClassRepository.js";
import { CustomError } from "../../utils/helpers/index.js";
import { MIN_LEVEL, MAX_LEVEL, xpForLevel } from "../../utils/LevelHelper.js";

jest.mock("../../repository/UserRepository.js");
jest.mock("../../repository/ClassRepository.js");

describe("UserService", () => {
  let service;
  let repository;
  let classRepository;

  const ADMIN_ID = "507f1f77bcf86cd799439001";
  const TEACHER_ID = "507f1f77bcf86cd799439002";
  const STUDENT_ID = "507f1f77bcf86cd799439003";
  const OUTRO_ID = "507f1f77bcf86cd799439004";

  const usuario = (id, role, overrides = {}) => ({ _id: id, role, active: true, ...overrides });

  const admin = () => usuario(ADMIN_ID, "admin");
  const teacher = () => usuario(TEACHER_ID, "teacher");
  const student = () => usuario(STUDENT_ID, "student");

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      setLevelForXpRange: jest.fn().mockResolvedValue(0),
    };

    classRepository = {
      findById: jest.fn(),
      findPlainById: jest.fn(),
      addStudent: jest.fn(),
      removeStudent: jest.fn(),
    };

    UserRepository.mockImplementation(() => repository);
    ClassRepository.mockImplementation(() => classRepository);
    service = new UserService();
  });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  /** Encadeia as respostas do findById na ordem em que o service as pede. */
  const responderFindById = (...usuarios) => {
    usuarios.forEach((u) => repository.findById.mockResolvedValueOnce(u));
  };

  describe("list", () => {
    it("deve delegar a listagem ao repositório quando não houver id", async() => {
      const paginado = { docs: [], totalDocs: 0 };
      repository.list.mockResolvedValue(paginado);
      const req = { params: {}, query: { role: "student" } };

      const resultado = await service.list(req);

      expect(repository.list).toHaveBeenCalledWith(req);
      expect(resultado).toBe(paginado);
    });

    it("deve devolver o próprio perfil quando o aluno consulta o dele", async() => {
      const perfil = student();
      responderFindById(student(), perfil);

      const resultado = await service.list({ params: { id: STUDENT_ID }, user_id: STUDENT_ID });

      expect(resultado).toBe(perfil);
    });

    it("deve lançar 403 quando o aluno consulta o perfil de outro", async() => {
      responderFindById(student());

      const erro = await capturarErro(
        service.list({ params: { id: OUTRO_ID }, user_id: STUDENT_ID }),
      );

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Students can only view their own profile.");
    });

    it("deve permitir que a professora consulte o perfil de outro usuário", async() => {
      const perfil = student();
      responderFindById(teacher(), perfil);

      await expect(
        service.list({ params: { id: STUDENT_ID }, user_id: TEACHER_ID }),
      ).resolves.toBe(perfil);
    });

    it("deve permitir que o admin consulte o perfil de outro usuário", async() => {
      const perfil = teacher();
      responderFindById(admin(), perfil);

      await expect(
        service.list({ params: { id: TEACHER_ID }, user_id: ADMIN_ID }),
      ).resolves.toBe(perfil);
    });
  });

  describe("list com filtro de turma", () => {
    const CLASS_ID = "507f1f77bcf86cd799439033";
    const req = (userId) => ({ params: {}, query: { class: CLASS_ID }, user_id: userId });

    it("deve listar quando a turma é da professora", async() => {
      const paginado = { docs: [], totalDocs: 0 };
      classRepository.findById.mockResolvedValue({ _id: CLASS_ID, teacher: { _id: TEACHER_ID } });
      responderFindById(teacher());
      repository.list.mockResolvedValue(paginado);

      const resultado = await service.list(req(TEACHER_ID));

      expect(classRepository.findById).toHaveBeenCalledWith(CLASS_ID);
      expect(resultado).toBe(paginado);
    });

    it("deve lançar 403 quando a turma é de outro professor", async() => {
      classRepository.findById.mockResolvedValue({ _id: CLASS_ID, teacher: { _id: OUTRO_ID } });
      responderFindById(teacher());

      const erro = await capturarErro(service.list(req(TEACHER_ID)));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(403);
      expect(erro.errorType).toBe("permissionError");
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("deve propagar o 404 quando a turma não existe", async() => {
      const naoEncontrada = new CustomError({ statusCode: 404, errorType: "resourceNotFound" });
      classRepository.findById.mockRejectedValue(naoEncontrada);

      await expect(service.list(req(TEACHER_ID))).rejects.toBe(naoEncontrada);
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin filtre turma de qualquer professor", async() => {
      classRepository.findById.mockResolvedValue({ _id: CLASS_ID, teacher: { _id: OUTRO_ID } });
      responderFindById(admin());
      repository.list.mockResolvedValue({ docs: [] });

      await expect(service.list(req(ADMIN_ID))).resolves.toEqual({ docs: [] });
    });

    it("deve deixar o admin filtrar class=none sem buscar turma", async() => {
      responderFindById(admin());
      repository.list.mockResolvedValue({ docs: [] });
      const reqSemTurma = { params: {}, query: { class: "none" }, user_id: ADMIN_ID };

      await service.list(reqSemTurma);

      expect(classRepository.findById).not.toHaveBeenCalled();
      expect(repository.list).toHaveBeenCalledWith(reqSemTurma);
    });

    it("deve lançar 403 quando a professora filtra class=none", async() => {
      responderFindById(teacher());

      const erro = await capturarErro(
        service.list({ params: {}, query: { class: "none" }, user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Só o admin pode listar alunos sem turma.");
      expect(classRepository.findById).not.toHaveBeenCalled();
      expect(repository.list).not.toHaveBeenCalled();
    });

    it("não deve consultar a turma quando o filtro não for informado", async() => {
      repository.list.mockResolvedValue({ docs: [] });

      await service.list({ params: {}, query: {}, user_id: TEACHER_ID });

      expect(classRepository.findById).not.toHaveBeenCalled();
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const novoAluno = { name: "Maria", email: "maria@escola.com", password: "senha123" };

    it("deve criar o usuário com a senha em hash", async() => {
      responderFindById(teacher());
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...novoAluno }, { user_id: TEACHER_ID });

      const [dados] = repository.create.mock.calls[0];
      expect(dados.password).not.toBe(novoAluno.password);
      expect(await bcrypt.compare(novoAluno.password, dados.password)).toBe(true);
    });

    it("deve permitir que a professora crie aluno", async() => {
      responderFindById(teacher());
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...novoAluno, role: "student" }, { user_id: TEACHER_ID });

      expect(repository.create).toHaveBeenCalled();
    });

    it("deve permitir que a professora crie sem informar papel", async() => {
      responderFindById(teacher());
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...novoAluno }, { user_id: TEACHER_ID });

      expect(repository.create).toHaveBeenCalled();
    });

    it("deve lançar 403 quando a professora tenta criar um usuário privilegiado", async() => {
      responderFindById(teacher());

      const erro = await capturarErro(
        service.create({ ...novoAluno, role: "admin" }, { user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Only admins can create users with a role other than student.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin crie usuário de qualquer papel", async() => {
      responderFindById(admin());
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.create({ ...novoAluno, role: "teacher" }, { user_id: ADMIN_ID });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ role: "teacher" }));
    });

    it("deve lançar 400 quando o e-mail já estiver cadastrado", async() => {
      responderFindById(admin());
      repository.findByEmail.mockResolvedValue(student());

      const erro = await capturarErro(service.create({ ...novoAluno }, { user_id: ADMIN_ID }));

      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Email already registered.");
      expect(repository.create).not.toHaveBeenCalled();
    });

    describe("com turma", () => {
      const CLASS_ID = "507f1f77bcf86cd799439021";

      beforeEach(() => {
        responderFindById(admin());
        repository.findByEmail.mockResolvedValue(null);
        repository.create.mockResolvedValue({ _id: STUDENT_ID });
      });

      it("deve adicionar o aluno criado em Class.students", async() => {
        classRepository.findPlainById.mockResolvedValue({ _id: CLASS_ID, active: true });

        await service.create({ ...novoAluno, class: CLASS_ID }, { user_id: ADMIN_ID });

        expect(classRepository.addStudent).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
      });

      it("não deve mexer em turma quando nenhuma for informada", async() => {
        await service.create({ ...novoAluno }, { user_id: ADMIN_ID });

        expect(classRepository.findPlainById).not.toHaveBeenCalled();
        expect(classRepository.addStudent).not.toHaveBeenCalled();
      });

      it.each([
        ["inexistente", null, "Turma não encontrada."],
        ["inativa", { _id: CLASS_ID, active: false }, "Turma não encontrada ou inativa."],
      ])("deve lançar 400 sem criar o usuário quando a turma for %s", async(_, turma, mensagem) => {
        classRepository.findPlainById.mockResolvedValue(turma);

        const erro = await capturarErro(
          service.create({ ...novoAluno, class: CLASS_ID }, { user_id: ADMIN_ID }),
        );

        expect(erro.statusCode).toBe(400);
        expect(erro.details).toEqual([{ path: "class", message: mensagem }]);
        expect(repository.create).not.toHaveBeenCalled();
        expect(classRepository.addStudent).not.toHaveBeenCalled();
      });

      it("deve lançar 400 quando o usuário criado não for aluno", async() => {
        const erro = await capturarErro(
          service.create({ ...novoAluno, role: "teacher", class: CLASS_ID }, { user_id: ADMIN_ID }),
        );

        expect(erro.statusCode).toBe(400);
        expect(erro.details[0].path).toBe("class");
        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("createWithPassword", () => {
    const dados = { name: "Maria", email: "maria@escola.com", password: "senha123" };

    it("deve forçar o papel de aluno mesmo se outro for enviado", async() => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.createWithPassword({ ...dados, role: "admin" });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ role: "student" }));
    });

    it("deve gravar a senha em hash", async() => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue({});

      await service.createWithPassword({ ...dados });

      const [criado] = repository.create.mock.calls[0];
      expect(await bcrypt.compare(dados.password, criado.password)).toBe(true);
    });

    it("deve lançar 400 quando o e-mail já estiver cadastrado", async() => {
      repository.findByEmail.mockResolvedValue(student());

      const erro = await capturarErro(service.createWithPassword({ ...dados }));

      expect(erro.statusCode).toBe(400);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("deve permitir que o usuário altere o próprio nome", async() => {
      const atualizado = { name: "Novo nome" };
      responderFindById(student(), student());
      repository.update.mockResolvedValue(atualizado);

      const resultado = await service.update(STUDENT_ID, { name: "Novo nome" }, { user_id: STUDENT_ID });

      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, { name: "Novo nome" });
      expect(resultado).toBe(atualizado);
    });

    it("deve descartar e-mail e senha de qualquer atualização", async() => {
      responderFindById(admin(), admin());
      repository.update.mockResolvedValue({});

      await service.update(
        ADMIN_ID,
        { name: "Novo nome", email: "outro@escola.com", password: "novaSenha" },
        { user_id: ADMIN_ID },
      );

      // Trocar e-mail e senha tem endpoint próprio; por aqui não passa.
      expect(repository.update).toHaveBeenCalledWith(ADMIN_ID, { name: "Novo nome" });
    });

    it("deve lançar 403 quando o aluno tenta alterar outro usuário", async() => {
      responderFindById(usuario(OUTRO_ID, "student"), student());

      const erro = await capturarErro(
        service.update(OUTRO_ID, { name: "Invadido" }, { user_id: STUDENT_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("You do not have permission to update another user.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 403 quando a professora tenta alterar outro usuário", async() => {
      responderFindById(student(), teacher());

      const erro = await capturarErro(
        service.update(STUDENT_ID, { name: "Alterado" }, { user_id: TEACHER_ID }),
      );

      expect(erro.statusCode).toBe(403);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve descartar os campos privilegiados quando quem altera não é admin", async() => {
      responderFindById(student(), student());
      repository.update.mockResolvedValue({});

      await service.update(
        STUDENT_ID,
        { name: "Novo nome", role: "admin", xp: 99999, level: 50, class: OUTRO_ID, active: false },
        { user_id: STUDENT_ID },
      );

      // É o que impede o aluno de se promover ou de inflar o próprio XP.
      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, { name: "Novo nome" });
    });

    it("deve manter os campos privilegiados quando quem altera é admin", async() => {
      responderFindById(student(), admin());
      repository.update.mockResolvedValue({});

      await service.update(
        STUDENT_ID,
        { role: "teacher", xp: 500, active: false },
        { user_id: ADMIN_ID },
      );

      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, {
        role: "teacher",
        xp: 500,
        active: false,
      });
    });

    it("deve conferir se o alvo existe antes de julgar a permissão", async() => {
      repository.findById.mockRejectedValueOnce(
        new CustomError({ statusCode: 404, errorType: "resourceNotFound", customMessage: "não existe" }),
      );

      const erro = await capturarErro(
        service.update(OUTRO_ID, { name: "Novo nome" }, { user_id: STUDENT_ID }),
      );

      expect(erro.statusCode).toBe(404);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("update da turma", () => {
    const TURMA_ANTIGA = "507f1f77bcf86cd799439021";
    const TURMA_NOVA = "507f1f77bcf86cd799439022";

    const alunoNaTurma = (turma) => usuario(STUDENT_ID, "student", { class: turma });

    beforeEach(() => {
      repository.update.mockResolvedValue({});
      classRepository.findPlainById.mockResolvedValue({ _id: TURMA_NOVA, active: true });
    });

    it("deve mover o id do aluno da turma antiga para a nova", async() => {
      responderFindById(alunoNaTurma(TURMA_ANTIGA), admin());

      await service.update(STUDENT_ID, { class: TURMA_NOVA }, { user_id: ADMIN_ID });

      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, { class: TURMA_NOVA });
      expect(classRepository.removeStudent).toHaveBeenCalledWith(TURMA_ANTIGA, STUDENT_ID);
      expect(classRepository.addStudent).toHaveBeenCalledWith(TURMA_NOVA, STUDENT_ID);
    });

    it("deve só adicionar quando o aluno ainda não tinha turma", async() => {
      responderFindById(alunoNaTurma(undefined), admin());

      await service.update(STUDENT_ID, { class: TURMA_NOVA }, { user_id: ADMIN_ID });

      expect(classRepository.removeStudent).not.toHaveBeenCalled();
      expect(classRepository.addStudent).toHaveBeenCalledWith(TURMA_NOVA, STUDENT_ID);
    });

    it("deve tirar o aluno da turma quando class for null", async() => {
      responderFindById(alunoNaTurma(TURMA_ANTIGA), admin());

      await service.update(STUDENT_ID, { class: null }, { user_id: ADMIN_ID });

      expect(classRepository.findPlainById).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, { class: null });
      expect(classRepository.removeStudent).toHaveBeenCalledWith(TURMA_ANTIGA, STUDENT_ID);
      expect(classRepository.addStudent).not.toHaveBeenCalled();
    });

    it("não deve mexer nos arrays quando a turma não mudou", async() => {
      responderFindById(alunoNaTurma(TURMA_NOVA), admin());

      await service.update(STUDENT_ID, { class: TURMA_NOVA }, { user_id: ADMIN_ID });

      expect(classRepository.removeStudent).not.toHaveBeenCalled();
      expect(classRepository.addStudent).not.toHaveBeenCalled();
    });

    it("não deve mexer nos arrays quando class não for enviado", async() => {
      responderFindById(alunoNaTurma(TURMA_ANTIGA), admin());

      await service.update(STUDENT_ID, { name: "Novo nome" }, { user_id: ADMIN_ID });

      expect(classRepository.removeStudent).not.toHaveBeenCalled();
      expect(classRepository.addStudent).not.toHaveBeenCalled();
    });

    it("deve ignorar class enviado por quem não é admin", async() => {
      responderFindById(alunoNaTurma(TURMA_ANTIGA), alunoNaTurma(TURMA_ANTIGA));

      await service.update(STUDENT_ID, { class: TURMA_NOVA }, { user_id: STUDENT_ID });

      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, {});
      expect(classRepository.removeStudent).not.toHaveBeenCalled();
      expect(classRepository.addStudent).not.toHaveBeenCalled();
    });

    it("deve lançar 400 sem atualizar quando a turma não existir", async() => {
      responderFindById(alunoNaTurma(TURMA_ANTIGA), admin());
      classRepository.findPlainById.mockResolvedValue(null);

      const erro = await capturarErro(
        service.update(STUDENT_ID, { class: TURMA_NOVA }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.details).toEqual([{ path: "class", message: "Turma não encontrada." }]);
      expect(repository.update).not.toHaveBeenCalled();
      expect(classRepository.removeStudent).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o alvo não for aluno", async() => {
      responderFindById(teacher(), admin());

      const erro = await capturarErro(
        service.update(TEACHER_ID, { class: TURMA_NOVA }, { user_id: ADMIN_ID }),
      );

      expect(erro.statusCode).toBe(400);
      expect(erro.details).toEqual([
        { path: "class", message: "Apenas alunos podem ser vinculados a uma turma." },
      ]);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve permitir que o aluno apague a própria conta", async() => {
      responderFindById(student(), student());
      repository.delete.mockResolvedValue({ _id: STUDENT_ID });

      await service.delete(STUDENT_ID, { user_id: STUDENT_ID });

      expect(repository.delete).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("deve lançar 403 quando o aluno tenta apagar outra conta", async() => {
      responderFindById(student(), usuario(OUTRO_ID, "student"));

      const erro = await capturarErro(service.delete(OUTRO_ID, { user_id: STUDENT_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Students can only delete their own account.");
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("deve permitir que a professora apague a conta de um aluno", async() => {
      responderFindById(teacher(), student());
      repository.delete.mockResolvedValue({ _id: STUDENT_ID });

      await service.delete(STUDENT_ID, { user_id: TEACHER_ID });

      expect(repository.delete).toHaveBeenCalledWith(STUDENT_ID);
    });

    it("deve lançar 403 quando a professora tenta apagar uma conta não-aluno", async() => {
      responderFindById(teacher(), usuario(OUTRO_ID, "admin"));

      const erro = await capturarErro(service.delete(OUTRO_ID, { user_id: TEACHER_ID }));

      expect(erro.statusCode).toBe(403);
      expect(erro.customMessage).toBe("Teachers can only delete student accounts.");
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("deve permitir que a professora apague a própria conta", async() => {
      responderFindById(teacher(), teacher());
      repository.delete.mockResolvedValue({ _id: TEACHER_ID });

      await service.delete(TEACHER_ID, { user_id: TEACHER_ID });

      expect(repository.delete).toHaveBeenCalledWith(TEACHER_ID);
    });

    it("deve permitir que o admin apague qualquer conta", async() => {
      responderFindById(admin(), teacher());
      repository.delete.mockResolvedValue({ _id: TEACHER_ID });

      await service.delete(TEACHER_ID, { user_id: ADMIN_ID });

      expect(repository.delete).toHaveBeenCalledWith(TEACHER_ID);
    });

    it("deve tirar o id do aluno apagado de Class.students", async() => {
      const CLASS_ID = "507f1f77bcf86cd799439021";
      responderFindById(admin(), usuario(STUDENT_ID, "student", { class: CLASS_ID }));

      await service.delete(STUDENT_ID, { user_id: ADMIN_ID });

      expect(classRepository.removeStudent).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
    });

    it("não deve mexer em turma quando o usuário apagado não tinha uma", async() => {
      responderFindById(admin(), student());

      await service.delete(STUDENT_ID, { user_id: ADMIN_ID });

      expect(classRepository.removeStudent).not.toHaveBeenCalled();
    });
  });

  describe("recalculateLevels", () => {
    it("deve cobrir todos os níveis, do mínimo ao máximo", async() => {
      await service.recalculateLevels();

      expect(repository.setLevelForXpRange).toHaveBeenCalledTimes(MAX_LEVEL - MIN_LEVEL + 1);
    });

    it("deve deixar a faixa aberta no primeiro e no último nível", async() => {
      await service.recalculateLevels();

      const chamadas = repository.setLevelForXpRange.mock.calls;
      const primeira = chamadas[0];
      const ultima = chamadas[chamadas.length - 1];

      // Nível 1 não tem piso e nível 50 não tem teto.
      expect(primeira).toEqual([MIN_LEVEL, null, xpForLevel(MIN_LEVEL + 1)]);
      expect(ultima).toEqual([MAX_LEVEL, xpForLevel(MAX_LEVEL), null]);
    });

    it("deve usar a faixa da curva quadrática nos níveis intermediários", async() => {
      await service.recalculateLevels();

      // Nível 3 vai de 400 a 900 XP.
      expect(repository.setLevelForXpRange).toHaveBeenCalledWith(3, 400, 900);
    });

    it("deve somar quantos usuários mudaram de nível", async() => {
      repository.setLevelForXpRange.mockResolvedValue(0);
      repository.setLevelForXpRange.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

      const resultado = await service.recalculateLevels();

      expect(resultado).toEqual({ updated: 5 });
    });
  });
});
