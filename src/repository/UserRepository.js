import User from "../models/User.js";
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
  errorHandler,
  messages,
  StatusService,
  asyncWrapper,
} from "../utils/helpers/index.js";
import UserFilterBuilder from "./filters/UserFilterBuilder.js";

class UserRepository {
  constructor({ userModel = User } = {}) {
    this.userModel = userModel;
  }

  async armazenarTokens(id, accesstoken, refreshtoken) {
    const document = await this.userModel.findById(id);
    if (!document) {
      throw new CustomError({
        statusCode: 401,
        errorType: "resourceNotFound",
        field: "Usuário",
        details: [],
        customMessage: messages.error.resourceNotFound("Usuário"),
      });
    }
    document.accesstoken = accesstoken;
    document.refreshtoken = refreshtoken;
    const data = document.save();
    return data;
  }

  async removerTokens(id) {
    const parsedData = {
      refreshtoken: null,
      accesstoken: null,
    };

    const usuario = await this.userModel
      .findByIdAndUpdate(id, parsedData, { new: true })
      .exec();

    if (!usuario) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Usuário",
        details: [],
        customMessage: messages.error.resourceNotFound("Usuário"),
      });
    }

    return usuario;
  }

  async buscarPorID(id, includeTokens = false) {
    let query = this.userModel
      .findById(id)
      .populate("secretarias")
      .populate("grupo");

    if (includeTokens) {
      query = query.select("+refreshtoken +accesstoken");
    }

    const user = await query;

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Usuário",
        details: [],
        customMessage: messages.error.resourceNotFound("Usuário"),
      });
    }

    return user;
  }

  async buscarPorIDs(ids) {
    return await this.userModel
      .find({ _id: { $in: ids } })
      .populate("secretarias")
      .populate("grupo");
  }

  async buscarPorNome(nome, idIgnorado = null) {
    const filtro = {
      nome: { $regex: nome, $options: "i" },
    };

    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }

    const documentos = await this.userModel.findOne(filtro);
    return documentos;
  }

  async buscarPorEmail(email, idIgnorado = null) {
    const filtro = { email };

    if (idIgnorado) {
      filtro._id = { $ne: idIgnorado };
    }

    // const documento = await this.userModel.findOne(filtro, '+senha')
    const documento = await this.userModel.findOne(filtro).select("+senha");

    return documento;
  }

  async list(req) {
    const { id } = req.params;

    if (id) {
      const data = await this.userModel.findById(id);

      if (!data) {
        throw new CustomError({
          statusCode: 404,
          errorType: "resourceNotFound",
          field: "Usuário",
          details: [],
          customMessage: messages.error.resourceNotFound("Usuário"),
        });
      }

      return data;
    }

    const { name, email, active, role } = req.query;

    const filtros = new UserFilterBuilder()
      .withName(name || "")
      .withEmail(email || "")
      .withActive(active)
      .withRole(role || "")
      .build();

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { name: 1 },
    };

    const data = await this.userModel.find(filtros, options);

    return data;
  }

  async buscarPorPorCodigoRecuperacao(codigo) {
    console.log("Estou no buscarPorPorCodigoRecuperacao em UserRepository");
    const filtro = { codigo_recupera_senha: codigo };
    const documento = await this.userModel.findOne(filtro, [
      "+senha",
      "+codigo_recupera_senha",
      "+exp_codigo_recupera_senha",
    ]);
    return documento;
  }
}

export default UserRepository;
