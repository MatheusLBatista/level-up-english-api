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

  async listar(req) {
    console.log("Estou no UsuarioService");

    const usuarioLogado = await this.repository.buscarPorID(req.user_id);
    const nivel = usuarioLogado?.nivel_acesso;
    const usuarioID = usuarioLogado._id;

    const id = req?.params?.id ?? String(usuarioID);

    if (nivel.municipe || nivel.operador) {
      if (String(usuarioID) !== String(id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          customMessage:
            "Munícipes e operadores só podem acessar seus próprios dados.",
        });
      }

      const data = await this.repository.buscarPorID(id);
      return data;
    }

    if (nivel.secretario) {
      if (id) {
        const usuarioPesquisado = await this.repository.buscarPorID(id);

        const secretariasUsuarioLogado = (usuarioLogado?.secretarias).map((s) =>
          s.toString(),
        );
        const secretariasUsuarioPesquisado =
          (usuarioPesquisado?.secretarias).map((s) => s.toString());

        const temAcesso = secretariasUsuarioPesquisado.some((sec) =>
          secretariasUsuarioLogado.includes(sec),
        );

        if (!temAcesso) {
          throw new CustomError({
            statusCode: HttpStatusCodes.FORBIDDEN.code,
            errorType: "permissionError",
            customMessage:
              "Secretários só podem acessar usuários da mesma secretaria.",
          });
        }
        return usuarioPesquisado;
      } else {
        const secretariasDoLogado = (usuarioLogado?.secretarias).map(
          (s) => s._id?.toString?.() || s.toString(),
        );
        req.query.secretaria = secretariasDoLogado;
      }
    }

    const data = await this.repository.listar(req);
    console.log(
      "Estou retornando os dados em UsuarioService para o controller",
    );
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
