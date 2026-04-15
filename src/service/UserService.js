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
import UsuarioRepository from "../repository/UserRepository.js";

class UserService {
  constructor() {
    this.repository = new UsuarioRepository();
  }

  async list(req) {
    const data = await this.repository.list(req);

    return data;
  }

  //metodos auxiliares
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
