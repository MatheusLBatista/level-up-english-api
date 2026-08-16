import UserController from "../../controllers/UserController.js";
import UserService from "../../service/UserService.js";
import { CustomError } from "../../utils/helpers/index.js";

// O service é substituído por um dublê: aqui só interessa o que o controller
// faz sozinho — validar o corpo com Zod, repassar os dados certos e limpar a
// resposta. A regra de permissão é julgada em UserService.test.js.
jest.mock("../../service/UserService.js");

describe("UserController", () => {
  let req;
  let res;
  let controller;

  const USER_ID = "507f1f77bcf86cd799439011";

  /** Usuário como o service devolve: documento do Mongoose com toObject(). */
  const documento = (dados) => ({ ...dados, toObject: () => ({ ...dados }) });

  beforeEach(() => {
    jest.clearAllMocks();
    UserService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new UserController();
  });

  /** Confere o envelope padrão da resposta: { message, data, errors }. */
  const esperarResposta = (status, message, data) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ message, data, errors: [] });
  };

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("list", () => {
    it("deve devolver 200 com o resultado da listagem", async() => {
      const paginado = { docs: [{ name: "Aluno" }], totalDocs: 1 };
      controller.service.list.mockResolvedValue(paginado);

      await controller.list(req, res);

      // A requisição inteira vai ao service: é ele que decide entre listar e
      // buscar por id, e precisa do user_id para julgar a permissão.
      expect(controller.service.list).toHaveBeenCalledWith(req);
      esperarResposta(200, "Requisição bem-sucedida", paginado);
    });

    it("deve propagar o erro lançado pelo service", async() => {
      controller.service.list.mockRejectedValue(new Error("Erro inesperado"));

      await expect(controller.list(req, res)).rejects.toThrow("Erro inesperado");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const novoUsuario = { name: "Maria", email: "maria@escola.com", password: "senha123" };

    it("deve devolver 201 com o usuário criado", async() => {
      controller.service.create.mockResolvedValue(documento({ _id: USER_ID, name: "Maria" }));
      req.body = { ...novoUsuario };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(novoUsuario, req);
      esperarResposta(201, "Recurso criado com sucesso", { _id: USER_ID, name: "Maria" });
    });

    it("não deve devolver a senha na resposta", async() => {
      controller.service.create.mockResolvedValue(
        documento({ _id: USER_ID, name: "Maria", password: "hash-da-senha" }),
      );
      req.body = { ...novoUsuario };

      await controller.create(req, res);

      const [{ data }] = res.json.mock.calls[0];
      expect(data).not.toHaveProperty("password");
    });

    it("deve repassar o papel e a turma quando informados", async() => {
      controller.service.create.mockResolvedValue(documento({ _id: USER_ID }));
      req.body = { ...novoUsuario, role: "teacher", class: USER_ID };

      await controller.create(req, res);

      expect(controller.service.create).toHaveBeenCalledWith(
        { ...novoUsuario, role: "teacher", class: USER_ID },
        req,
      );
    });

    it("deve rejeitar quando a senha tiver menos de 6 caracteres", async() => {
      req.body = { ...novoUsuario, password: "123" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o e-mail for inválido", async() => {
      req.body = { ...novoUsuario, email: "sem-arroba" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o papel não for um dos previstos", async() => {
      req.body = { ...novoUsuario, role: "superadmin" };

      await expect(controller.create(req, res)).rejects.toThrow();
      expect(controller.service.create).not.toHaveBeenCalled();
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      controller.service.create.mockResolvedValue(documento({ _id: USER_ID }));
      req.body = { ...novoUsuario, xp: 99999, level: 50, active: false };

      await controller.create(req, res);

      // XP e nível são consequência da progressão, nunca entrada de cadastro.
      expect(controller.service.create).toHaveBeenCalledWith(novoUsuario, req);
    });
  });

  describe("createWithPassword", () => {
    it("deve devolver 201 sem a senha", async() => {
      controller.service.createWithPassword.mockResolvedValue(
        documento({ _id: USER_ID, name: "Maria", password: "hash-da-senha" }),
      );
      req.body = { name: "Maria", email: "maria@escola.com", password: "senha123" };

      await controller.createWithPassword(req, res);

      expect(controller.service.createWithPassword).toHaveBeenCalledWith(req.body);
      esperarResposta(201, "Recurso criado com sucesso", { _id: USER_ID, name: "Maria" });
    });
  });

  describe("update", () => {
    it("deve devolver 200 com o usuário atualizado", async() => {
      controller.service.update.mockResolvedValue(documento({ _id: USER_ID, name: "Novo nome" }));
      req.params.id = USER_ID;
      req.body = { name: "Novo nome" };

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(USER_ID, { name: "Novo nome" }, req);
      esperarResposta(200, "User updated successfully.", { _id: USER_ID, name: "Novo nome" });
    });

    it("não deve devolver e-mail nem senha na resposta", async() => {
      controller.service.update.mockResolvedValue(
        documento({ _id: USER_ID, name: "Novo nome", email: "maria@escola.com", password: "hash" }),
      );
      req.params.id = USER_ID;
      req.body = { name: "Novo nome" };

      await controller.update(req, res);

      const [{ data }] = res.json.mock.calls[0];
      expect(data).not.toHaveProperty("email");
      expect(data).not.toHaveProperty("password");
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      req.body = { name: "Novo nome" };

      const erro = await capturarErro(controller.update(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("User ID is required.");
      expect(controller.service.update).not.toHaveBeenCalled();
    });

    it("deve descartar campos que o schema de atualização não prevê", async() => {
      controller.service.update.mockResolvedValue(documento({ _id: USER_ID }));
      req.params.id = USER_ID;
      req.body = { name: "Novo nome", role: "admin", xp: 99999, password: "outra" };

      await controller.update(req, res);

      // Papel, XP e senha não passam nem pelo schema — a escalada de privilégio
      // morre antes de chegar ao service.
      expect(controller.service.update).toHaveBeenCalledWith(USER_ID, { name: "Novo nome" }, req);
    });

    it("deve aceitar um corpo vazio", async() => {
      controller.service.update.mockResolvedValue(documento({ _id: USER_ID }));
      req.params.id = USER_ID;

      await controller.update(req, res);

      expect(controller.service.update).toHaveBeenCalledWith(USER_ID, {}, req);
    });

    it("deve rejeitar quando active não for booleano", async() => {
      req.params.id = USER_ID;
      req.body = { active: "sim" };

      await expect(controller.update(req, res)).rejects.toThrow();
      expect(controller.service.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deve devolver 200 com o usuário removido", async() => {
      const removido = { _id: USER_ID };
      controller.service.delete.mockResolvedValue(removido);
      req.params.id = USER_ID;

      await controller.delete(req, res);

      expect(controller.service.delete).toHaveBeenCalledWith(USER_ID, req);
      esperarResposta(200, "User deleted successfully.", removido);
    });

    it("deve lançar 400 quando o id não vier na rota", async() => {
      const erro = await capturarErro(controller.delete(req, res));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("User ID is required.");
      expect(controller.service.delete).not.toHaveBeenCalled();
    });
  });

  describe("recalculateLevels", () => {
    it("deve devolver 200 com quantos usuários mudaram de nível", async() => {
      controller.service.recalculateLevels.mockResolvedValue({ updated: 7 });

      await controller.recalculateLevels(req, res);

      expect(controller.service.recalculateLevels).toHaveBeenCalledTimes(1);
      esperarResposta(200, "Levels recalculated successfully.", { updated: 7 });
    });
  });
});
