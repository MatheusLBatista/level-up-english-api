import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
  errorHandler,
  messages,
  StatusService,
  asyncWrapper,
} from "../utils/helpers/index.js";
import AuthHelper from "../utils/AuthHelper.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import UserRepository from "../repository/UserRepository.js";

class UserService {
  constructor() {
    this.repository = new UserRepository();
  }

  async list(req) {
    const id = req?.params?.id;

    if (id) {
      const data = await this.repository.buscarPorID(id);
      return data;
    }

    const data = await this.repository.list(req);
    return data;
  }

  async criar(parsedData, req) {
    console.log("Estou em criar no UserService");

    const usuarioLogado = await this.repository.buscarPorID(req.user_id);
    const role = usuarioLogado.role;

    if (role === "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Usuário",
        details: [],
        customMessage: "Estudantes não podem criar usuários.",
      });
    }

    // Valida email único
    await this.validateEmail(parsedData.email);

    // Gerar senha hash
    if (parsedData.password) {
      const { senha: senhaHash } = await AuthHelper.hashPassword(parsedData.password);
      parsedData.password = senhaHash;
    }

    const data = await this.repository.criar(parsedData);
    return data;
  }

  async criarComSenha(parsedData) {
    console.log("Estou em criarComSenha no UserService");

    // Garante que não passe role privilegiada
    delete parsedData.role;

    await this.validateEmail(parsedData.email);

    if (parsedData.password) {
      const { senha: senhaHash } = await AuthHelper.hashPassword(parsedData.password);
      parsedData.password = senhaHash;
    }

    parsedData.role = "student";

    const data = await this.repository.criar(parsedData);
    return data;
  }

  async atualizar(id, parsedData, req) {
    console.log("Estou no atualizar em UserService");

    delete parsedData.email;
    delete parsedData.password;

    await this.ensureUserExists(id);

    const usuario = await this.repository.buscarPorID(req.user_id);
    const isAdmin = usuario?.role === "admin";

    const atualizarOutroUser = String(usuario._id) !== String(id);

    if (!isAdmin && atualizarOutroUser) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Usuário",
        details: [],
        customMessage: "Você não tem permissões para atualizar outro usuário.",
      });
    }

    if (!isAdmin) {
      delete parsedData.role;
      delete parsedData.xp;
      delete parsedData.level;
    }

    const data = await this.repository.atualizar(id, parsedData);
    return data;
  }

  async deletar(id, req) {
    console.log("Estou no deletar em UserService");

    const usuario = await this.repository.buscarPorID(req.user_id);
    const usuarioID = usuario._id;

    await this.ensureUserExists(id);

    if (usuario.role === "student") {
      if (usuarioID.toString() !== id.toString()) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "Usuário",
          details: [],
          customMessage: "Estudantes só podem deletar seus próprios dados.",
        });
      }
    }

    const data = await this.repository.deletar(id);
    return data;
  }

  // Métodos auxiliares
  async validateEmail(email, id = null) {
    const usuarioExistente = await this.repository.buscarPorEmail(email, id);
    if (usuarioExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "email",
        details: [{ path: "email", message: "Email já está em uso." }],
        customMessage: "Email já cadastrado.",
      });
    }
  }

  async ensureUserExists(id) {
    const usuarioExistente = await this.repository.buscarPorID(id);

    if (!usuarioExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "Usuário",
        details: [],
        customMessage: "Usuário não encontrado.",
      });
    }

    return usuarioExistente;
  }
}

export default UserService;
