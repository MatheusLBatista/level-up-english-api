import bcrypt from "bcrypt";

// O envio de e-mail é mockado para que nenhum teste dispare SMTP de verdade.
jest.mock("../../utils/SendMail.js", () => ({
  __esModule: true,
  default: {
    enviaEmail: jest.fn(),
    enviaEmailError: jest.fn(),
    enviaEmailErrorDbConect: jest.fn(),
  },
}));

import SendMail from "../../utils/SendMail.js";
import AuthService from "../../service/AuthService.js";
import { CustomError } from "../../utils/helpers/index.js";

/**
 * O repositório e o TokenUtil entram como dublês: o que está em julgamento aqui
 * é a regra de negócio da autenticação — o que decide 401, o que é gravado e
 * em que ordem. A ida ao banco é verificada nos testes de rota.
 */
describe("AuthService", () => {
  let service;
  let repository;

  const USER_ID = "507f1f77bcf86cd799439011";
  const SENHA_PADRAO = "senha123";
  const NOVA_SENHA = "novaSenha456";

  let senhaHash;

  beforeAll(async() => {
    // Custo baixo de propósito: o bcrypt.compare funciona com qualquer custo, e
    // o padrão (10) só deixaria a suíte lenta.
    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByRecoveryCode: jest.fn(),
      storeTokens: jest.fn(),
      removeTokens: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setRecoveryCode: jest.fn(),
      clearRecoveryCode: jest.fn(),
    };

    service = new AuthService({ userRepository: repository });

    service.tokenUtil = {
      generateAccessToken: jest.fn().mockResolvedValue("access-token"),
      generateRefreshToken: jest.fn().mockResolvedValue("refresh-token"),
      verifyRefreshToken: jest.fn(),
    };
  });

  /** Usuário como o repositório devolve: documento do Mongoose com toObject(). */
  const usuario = (overrides = {}) => {
    const dados = {
      _id: USER_ID,
      name: "Professora",
      email: "professora@escola.com",
      password: senhaHash,
      role: "teacher",
      active: true,
      ...overrides,
    };

    return { ...dados, toObject: () => ({ ...dados }) };
  };

  /** Captura o CustomError lançado, para poder julgar mensagem e status. */
  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }

    throw new Error("Esperava que a promessa fosse rejeitada, mas ela resolveu.");
  };

  describe("login", () => {
    it("deve devolver os tokens e o usuário sem a senha", async() => {
      repository.findByEmail.mockResolvedValue(usuario());

      const resultado = await service.login({ email: "professora@escola.com", password: SENHA_PADRAO });

      expect(resultado.accessToken).toBe("access-token");
      expect(resultado.refreshToken).toBe("refresh-token");
      expect(resultado.user.email).toBe("professora@escola.com");
      expect(resultado.user).not.toHaveProperty("password");
    });

    it("deve gravar o par de tokens no usuário autenticado", async() => {
      repository.findByEmail.mockResolvedValue(usuario());

      await service.login({ email: "professora@escola.com", password: SENHA_PADRAO });

      expect(repository.storeTokens).toHaveBeenCalledWith(USER_ID, "access-token", "refresh-token");
    });

    it("deve lançar 401 quando o e-mail não estiver cadastrado", async() => {
      repository.findByEmail.mockResolvedValue(null);

      const erro = await capturarErro(service.login({ email: "naoexiste@escola.com", password: SENHA_PADRAO }));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(401);
      expect(repository.storeTokens).not.toHaveBeenCalled();
    });

    it("deve usar a mesma mensagem para senha errada e e-mail inexistente", async() => {
      repository.findByEmail.mockResolvedValue(null);
      const semConta = await capturarErro(service.login({ email: "naoexiste@escola.com", password: SENHA_PADRAO }));

      repository.findByEmail.mockResolvedValue(usuario());
      const senhaErrada = await capturarErro(service.login({ email: "professora@escola.com", password: "errada" }));

      // Mensagens diferentes revelariam quais e-mails existem na base.
      expect(senhaErrada.customMessage).toBe(semConta.customMessage);
      expect(senhaErrada.customMessage).toBe("Credenciais inválidas. Verifique seu usuário e senha.");
    });

    it("deve lançar 401 de conta bloqueada quando a conta estiver desativada", async() => {
      repository.findByEmail.mockResolvedValue(usuario({ active: false }));

      const erro = await capturarErro(service.login({ email: "professora@escola.com", password: SENHA_PADRAO }));

      expect(erro.statusCode).toBe(401);
      expect(erro.customMessage).toBe("Conta bloqueada. Entre em contato com o suporte.");
    });

    it("deve conferir a senha antes de olhar se a conta está ativa", async() => {
      repository.findByEmail.mockResolvedValue(usuario({ active: false }));

      const erro = await capturarErro(service.login({ email: "professora@escola.com", password: "errada" }));

      // Quem erra a senha não descobre que a conta existe e está desativada.
      expect(erro.customMessage).toBe("Credenciais inválidas. Verifique seu usuário e senha.");
    });
  });

  describe("logout", () => {
    it("deve remover os tokens do usuário", async() => {
      await service.logout(USER_ID);

      expect(repository.removeTokens).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe("refresh", () => {
    const armazenado = "refresh-armazenado";

    beforeEach(() => {
      service.tokenUtil.verifyRefreshToken.mockResolvedValue({ id: USER_ID });
    });

    it("deve devolver um novo par de tokens e gravá-lo", async() => {
      repository.findById.mockResolvedValue(usuario({ refreshtoken: armazenado }));

      const resultado = await service.refresh(armazenado);

      expect(resultado).toEqual({ accessToken: "access-token", refreshToken: "refresh-token" });
      expect(repository.storeTokens).toHaveBeenCalledWith(USER_ID, "access-token", "refresh-token");
    });

    it("deve buscar o usuário incluindo os tokens", async() => {
      repository.findById.mockResolvedValue(usuario({ refreshtoken: armazenado }));

      await service.refresh(armazenado);

      expect(repository.findById).toHaveBeenCalledWith(USER_ID, true);
    });

    it("deve lançar 401 quando o token não for válido", async() => {
      service.tokenUtil.verifyRefreshToken.mockRejectedValue(new Error("jwt malformed"));

      const erro = await capturarErro(service.refresh("token-invalido"));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(401);
      expect(erro.customMessage).toBe("Token inválido. Faça login novamente.");
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it("deve lançar 401 quando o token não for o que está armazenado", async() => {
      repository.findById.mockResolvedValue(usuario({ refreshtoken: "outro-token" }));

      const erro = await capturarErro(service.refresh(armazenado));

      expect(erro.customMessage).toBe("Token inválido. Faça login novamente.");
      expect(repository.storeTokens).not.toHaveBeenCalled();
    });

    it("deve lançar 401 quando a sessão já tiver sido encerrada", async() => {
      repository.findById.mockResolvedValue(usuario({ refreshtoken: null }));

      const erro = await capturarErro(service.refresh(armazenado));

      expect(erro.customMessage).toBe("Token inválido. Faça login novamente.");
    });

    it("deve lançar 401 de conta bloqueada quando a conta estiver desativada", async() => {
      repository.findById.mockResolvedValue(usuario({ refreshtoken: armazenado, active: false }));

      const erro = await capturarErro(service.refresh(armazenado));

      expect(erro.customMessage).toBe("Conta bloqueada. Entre em contato com o suporte.");
      expect(repository.storeTokens).not.toHaveBeenCalled();
    });
  });

  describe("registerStudent", () => {
    const aluno = { name: "Maria Silva", email: "maria@escola.com" };

    const prepararCriacao = () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(usuario({ ...aluno, role: "student", password: undefined }));
    };

    it("deve criar o usuário com o papel de aluno", async() => {
      prepararCriacao();

      await service.registerStudent(aluno);

      // Sem senha: ela é definida pelo próprio aluno, pelo link do e-mail.
      expect(repository.create).toHaveBeenCalledWith({ ...aluno, role: "student" });
    });

    it("deve vincular a turma somente quando ela for informada", async() => {
      prepararCriacao();

      await service.registerStudent({ ...aluno, class: USER_ID });

      expect(repository.create).toHaveBeenCalledWith({ ...aluno, role: "student", class: USER_ID });
    });

    it("deve gravar um código de definição de senha válido por 24 horas", async() => {
      prepararCriacao();

      await service.registerStudent(aluno);

      const [id, code, validade] = repository.setRecoveryCode.mock.calls[0];
      const horas = (validade.getTime() - Date.now()) / (60 * 60 * 1000);

      expect(id).toBe(USER_ID);
      expect(code).toEqual(expect.any(String));
      expect(horas).toBeGreaterThan(23.9);
      expect(horas).toBeLessThanOrEqual(24);
    });

    it("deve enviar o e-mail de boas-vindas com o link que carrega o código", async() => {
      prepararCriacao();

      await service.registerStudent(aluno);

      const [, code] = repository.setRecoveryCode.mock.calls[0];
      const [email] = SendMail.enviaEmail.mock.calls[0];

      expect(email.to).toBe(aluno.email);
      expect(email.html).toContain(code);
    });

    it("deve devolver o aluno sem a senha", async() => {
      prepararCriacao();

      const resultado = await service.registerStudent(aluno);

      expect(resultado.email).toBe(aluno.email);
      expect(resultado).not.toHaveProperty("password");
    });

    it("deve lançar 400 quando o e-mail já estiver cadastrado", async() => {
      repository.findByEmail.mockResolvedValue(usuario());

      const erro = await capturarErro(service.registerStudent(aluno));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Este e-mail já está cadastrado.");
      expect(repository.create).not.toHaveBeenCalled();
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });
  });

  describe("forgotPassword", () => {
    it("deve gravar um código válido por 30 minutos e enviar o e-mail", async() => {
      repository.findByEmail.mockResolvedValue(usuario());

      await service.forgotPassword("professora@escola.com");

      const [id, code, validade] = repository.setRecoveryCode.mock.calls[0];
      const minutos = (validade.getTime() - Date.now()) / (60 * 1000);

      expect(id).toBe(USER_ID);
      expect(code).toEqual(expect.any(String));
      expect(minutos).toBeGreaterThan(29);
      expect(minutos).toBeLessThanOrEqual(30);
      expect(SendMail.enviaEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "professora@escola.com" }),
      );
    });

    it("deve sair em silêncio quando o e-mail não estiver cadastrado", async() => {
      repository.findByEmail.mockResolvedValue(null);

      // Sem erro e sem efeito: é o que impede descobrir quais e-mails existem.
      await expect(service.forgotPassword("naoexiste@escola.com")).resolves.toBeUndefined();
      expect(repository.setRecoveryCode).not.toHaveBeenCalled();
      expect(SendMail.enviaEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    const futuro = () => new Date(Date.now() + 10 * 60 * 1000);

    it("deve gravar a nova senha com hash e limpar o código", async() => {
      repository.findByRecoveryCode.mockResolvedValue(usuario({ exp_password_recovery_code: futuro() }));

      await service.resetPassword("codigo-valido", NOVA_SENHA);

      const [id, dados] = repository.update.mock.calls[0];
      expect(id).toBe(USER_ID);
      expect(dados.password).not.toBe(NOVA_SENHA);
      expect(await bcrypt.compare(NOVA_SENHA, dados.password)).toBe(true);
      expect(repository.clearRecoveryCode).toHaveBeenCalledWith(USER_ID);
    });

    it("deve lançar 400 quando o código não existir", async() => {
      repository.findByRecoveryCode.mockResolvedValue(null);

      const erro = await capturarErro(service.resetPassword("codigo-inexistente", NOVA_SENHA));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.customMessage).toBe("Código de recuperação inválido ou expirado.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o código estiver expirado", async() => {
      repository.findByRecoveryCode.mockResolvedValue(
        usuario({ exp_password_recovery_code: new Date(Date.now() - 1000) }),
      );

      const erro = await capturarErro(service.resetPassword("codigo-expirado", NOVA_SENHA));

      expect(erro.customMessage).toBe("Código de recuperação inválido ou expirado.");
      expect(repository.update).not.toHaveBeenCalled();
    });

    it("deve lançar 400 quando o código não tiver data de validade", async() => {
      repository.findByRecoveryCode.mockResolvedValue(usuario({ exp_password_recovery_code: null }));

      const erro = await capturarErro(service.resetPassword("codigo-sem-validade", NOVA_SENHA));

      expect(erro.customMessage).toBe("Código de recuperação inválido ou expirado.");
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("deve gravar a nova senha com hash quando a atual estiver correta", async() => {
      repository.findByIdWithPassword.mockResolvedValue(usuario());

      await service.changePassword(USER_ID, SENHA_PADRAO, NOVA_SENHA);

      const [id, dados] = repository.update.mock.calls[0];
      expect(id).toBe(USER_ID);
      expect(dados.password).not.toBe(NOVA_SENHA);
      expect(await bcrypt.compare(NOVA_SENHA, dados.password)).toBe(true);
    });

    it("deve lançar 401 quando a senha atual estiver incorreta", async() => {
      repository.findByIdWithPassword.mockResolvedValue(usuario());

      const erro = await capturarErro(service.changePassword(USER_ID, "senhaErrada", NOVA_SENHA));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(401);
      expect(erro.customMessage).toBe("Senha atual incorreta.");
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("revoke", () => {
    it("deve remover os tokens do usuário alvo", async() => {
      await service.revoke(USER_ID);

      expect(repository.removeTokens).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe("loadTokens", () => {
    it("deve devolver o usuário com os tokens, para o AuthMiddleware conferir a sessão", async() => {
      const encontrado = usuario({ refreshtoken: "refresh-armazenado" });
      repository.findById.mockResolvedValue(encontrado);

      const resultado = await service.loadTokens(USER_ID);

      expect(repository.findById).toHaveBeenCalledWith(USER_ID, true);
      expect(resultado.data).toBe(encontrado);
    });
  });
});
