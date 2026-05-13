import User from "../models/User.js";
import { CustomError, messages } from "../utils/helpers/index.js";

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
    let query = this.userModel.findById(id);

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
    return await this.userModel.find({ _id: { $in: ids } });
  }

  async buscarPorNome(nome, idIgnorado = null) {
    const filtro = {
      name: { $regex: nome, $options: "i" },
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

    const documento = await this.userModel.findOne(filtro).select("+password");
    return documento;
  }

  async list(req) {
    const { id } = req.params || {};

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

    const { name, email, role, active, page = 1 } = req.query || {};
    const limite = Math.min(parseInt(req.query?.limite, 10) || 10, 100);

    const filtros = {};
    if (name) filtros.name = { $regex: name, $options: "i" };
    if (email) filtros.email = { $regex: email, $options: "i" };
    if (role) filtros.role = role;
    if (active !== undefined) {
      filtros.active = active === "true" || active === "1" || active === true;
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limite, 10),
      sort: { name: 1 },
    };

    const resultado = await this.userModel.paginate(filtros, options);

    resultado.docs = resultado.docs.map((doc) => {
      const usuarioObj =
        typeof doc.toObject === "function" ? doc.toObject() : doc;
      return usuarioObj;
    });

    return resultado;
  }

  async criar(dadosUsuario) {
    const usuario = new this.userModel(dadosUsuario);
    return await usuario.save();
  }

  async atualizar(id, parsedData) {
    const usuario = await this.userModel.findByIdAndUpdate(id, parsedData, {
      new: true,
    });

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

  async deletar(id) {
    const usuario = await this.userModel.findByIdAndDelete(id);
    return usuario;
  }

  async buscarPorCodigoRecuperacao(codigo) {
    console.log("Estou no buscarPorCodigoRecuperacao em UserRepository");
    const filtro = { password_recovery_code: codigo };
    const documento = await this.userModel
      .findOne(filtro)
      .select("+password +password_recovery_code +exp_password_recovery_code");
    return documento;
  }
}

export default UserRepository;
