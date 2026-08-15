import AuthController from "../../controllers/AuthController.js";
import AuthService from "../../service/AuthService.js";

// O service é substituído por um dublê: aqui só interessa o que o controller
// faz sozinho — validar o corpo com Zod, repassar os dados certos e montar a
// resposta. A regra de negócio é julgada em AuthService.test.js.
jest.mock("../../service/AuthService.js");

describe("AuthController", () => {
  let req;
  let res;
  let controller;

  const USER_ID = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();
    AuthService.mockClear();

    req = { params: {}, body: {}, query: {}, user_id: USER_ID };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    controller = new AuthController();
  });

  /** Confere o envelope padrão da resposta: { message, data, errors }. */
  const esperarResposta = (status, message, data) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ message, data, errors: [] });
  };

  describe("login", () => {
    const credenciais = { email: "professora@escola.com", password: "senha123" };

    it("deve devolver 200 com os dados da sessão", async() => {
      const sessao = { accessToken: "access", refreshToken: "refresh", user: { email: credenciais.email } };
      req.body = { ...credenciais };
      controller.service.login.mockResolvedValue(sessao);

      await controller.login(req, res);

      expect(controller.service.login).toHaveBeenCalledTimes(1);
      expect(controller.service.login).toHaveBeenCalledWith(credenciais);
      esperarResposta(200, "Login realizado com sucesso.", sessao);
    });

    it("deve descartar campos que não fazem parte do schema", async() => {
      req.body = { ...credenciais, role: "admin", active: true };
      controller.service.login.mockResolvedValue({});

      await controller.login(req, res);

      expect(controller.service.login).toHaveBeenCalledWith(credenciais);
    });

    it("deve rejeitar e não chamar o service quando o e-mail for inválido", async() => {
      req.body = { ...credenciais, email: "sem-arroba" };

      await expect(controller.login(req, res)).rejects.toThrow();
      expect(controller.service.login).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a senha tiver menos de 6 caracteres", async() => {
      req.body = { ...credenciais, password: "123" };

      await expect(controller.login(req, res)).rejects.toThrow();
      expect(controller.service.login).not.toHaveBeenCalled();
    });

    it("deve propagar o erro lançado pelo service", async() => {
      req.body = { ...credenciais };
      controller.service.login.mockRejectedValue(new Error("Credenciais inválidas"));

      await expect(controller.login(req, res)).rejects.toThrow("Credenciais inválidas");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("registerStudent", () => {
    const aluno = { name: "Maria Silva", email: "maria@escola.com" };

    it("deve devolver 201 com o aluno cadastrado", async() => {
      const criado = { _id: USER_ID, ...aluno, role: "student" };
      req.body = { ...aluno };
      controller.service.registerStudent.mockResolvedValue(criado);

      await controller.registerStudent(req, res);

      expect(controller.service.registerStudent).toHaveBeenCalledWith(aluno);
      esperarResposta(
        201,
        "Aluno cadastrado com sucesso. E-mail de boas-vindas enviado no email cadastrado.",
        criado,
      );
    });

    it("deve repassar a turma quando ela for informada", async() => {
      req.body = { ...aluno, class: USER_ID };
      controller.service.registerStudent.mockResolvedValue({});

      await controller.registerStudent(req, res);

      expect(controller.service.registerStudent).toHaveBeenCalledWith({ ...aluno, class: USER_ID });
    });

    it("deve rejeitar quando o nome tiver menos de 2 caracteres", async() => {
      req.body = { ...aluno, name: "M" };

      await expect(controller.registerStudent(req, res)).rejects.toThrow();
      expect(controller.service.registerStudent).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o e-mail for inválido", async() => {
      req.body = { ...aluno, email: "sem-arroba" };

      await expect(controller.registerStudent(req, res)).rejects.toThrow();
      expect(controller.service.registerStudent).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("deve devolver 200 com o novo par de tokens", async() => {
      const tokens = { accessToken: "novo-access", refreshToken: "novo-refresh" };
      req.body = { refreshToken: "refresh-antigo" };
      controller.service.refresh.mockResolvedValue(tokens);

      await controller.refresh(req, res);

      // O service recebe a string, não o corpo inteiro.
      expect(controller.service.refresh).toHaveBeenCalledWith("refresh-antigo");
      esperarResposta(200, "Token renovado com sucesso.", tokens);
    });

    it("deve rejeitar quando o refresh token não for enviado", async() => {
      req.body = {};

      await expect(controller.refresh(req, res)).rejects.toThrow();
      expect(controller.service.refresh).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("deve encerrar a sessão do usuário autenticado", async() => {
      controller.service.logout.mockResolvedValue(undefined);

      await controller.logout(req, res);

      // O id vem do token, nunca do corpo da requisição.
      expect(controller.service.logout).toHaveBeenCalledWith(USER_ID);
      esperarResposta(200, "Logout realizado com sucesso.", null);
    });
  });

  describe("forgotPassword", () => {
    it("deve devolver 200 sem expor dados do usuário", async() => {
      req.body = { email: "aluno@escola.com" };
      controller.service.forgotPassword.mockResolvedValue(undefined);

      await controller.forgotPassword(req, res);

      expect(controller.service.forgotPassword).toHaveBeenCalledWith("aluno@escola.com");
      esperarResposta(200, "As instruções foram enviadas por e-mail.", null);
    });

    it("deve rejeitar quando o e-mail for inválido", async() => {
      req.body = { email: "sem-arroba" };

      await expect(controller.forgotPassword(req, res)).rejects.toThrow();
      expect(controller.service.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("deve devolver 200 ao redefinir a senha", async() => {
      req.body = { code: "codigo-valido", newPassword: "novaSenha456" };
      controller.service.resetPassword.mockResolvedValue(undefined);

      await controller.resetPassword(req, res);

      expect(controller.service.resetPassword).toHaveBeenCalledWith("codigo-valido", "novaSenha456");
      esperarResposta(200, "Senha redefinida com sucesso.", null);
    });

    it("deve rejeitar quando a nova senha for curta demais", async() => {
      req.body = { code: "codigo-valido", newPassword: "123" };

      await expect(controller.resetPassword(req, res)).rejects.toThrow();
      expect(controller.service.resetPassword).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando o código estiver vazio", async() => {
      req.body = { code: "", newPassword: "novaSenha456" };

      await expect(controller.resetPassword(req, res)).rejects.toThrow();
      expect(controller.service.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    const senhas = { currentPassword: "senha123", newPassword: "novaSenha456" };

    it("deve trocar a senha do usuário autenticado", async() => {
      req.body = { ...senhas };
      controller.service.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(req, res);

      expect(controller.service.changePassword).toHaveBeenCalledWith(
        USER_ID,
        senhas.currentPassword,
        senhas.newPassword,
      );
      esperarResposta(200, "Senha alterada com sucesso.", null);
    });

    it("deve rejeitar quando a nova senha for curta demais", async() => {
      req.body = { ...senhas, newPassword: "123" };

      await expect(controller.changePassword(req, res)).rejects.toThrow();
      expect(controller.service.changePassword).not.toHaveBeenCalled();
    });

    it("deve rejeitar quando a senha atual não for enviada", async() => {
      req.body = { newPassword: "novaSenha456" };

      await expect(controller.changePassword(req, res)).rejects.toThrow();
      expect(controller.service.changePassword).not.toHaveBeenCalled();
    });
  });

  describe("revoke", () => {
    it("deve revogar a sessão do usuário informado na rota", async() => {
      req.params = { userId: USER_ID };
      controller.service.revoke.mockResolvedValue(undefined);

      await controller.revoke(req, res);

      expect(controller.service.revoke).toHaveBeenCalledWith(USER_ID);
      esperarResposta(200, "Sessão do usuário revogada com sucesso.", null);
    });

    it("deve rejeitar quando o id do usuário não vier na rota", async() => {
      req.params = {};

      await expect(controller.revoke(req, res)).rejects.toThrow();
      expect(controller.service.revoke).not.toHaveBeenCalled();
    });
  });
});
