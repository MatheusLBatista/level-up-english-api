import bcrypt from "bcrypt";
import UserService from "../../service/UserService.js";
import UserRepository from "../../repository/UserRepository.js";
import { CustomError } from "../../utils/helpers/index.js";
import { MIN_LEVEL, MAX_LEVEL, xpForLevel } from "../../utils/LevelHelper.js";

jest.mock("../../repository/UserRepository.js");

describe("UserService", () => {
  let service;
  let repository;

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

    UserRepository.mockImplementation(() => repository);
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
        { role: "teacher", xp: 500, class: OUTRO_ID, active: false },
        { user_id: ADMIN_ID },
      );

      expect(repository.update).toHaveBeenCalledWith(STUDENT_ID, {
        role: "teacher",
        xp: 500,
        class: OUTRO_ID,
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
