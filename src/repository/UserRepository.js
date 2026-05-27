import User from "../models/User.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class UserRepository {
  constructor({ userModel = User } = {}) {
    this.userModel = userModel;
  }

  async storeTokens(id, accesstoken, refreshtoken) {
    const document = await this.userModel.findById(id);
    if (!document) {
      throw new CustomError({
        statusCode: 401,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: messages.error.resourceNotFound("User"),
      });
    }
    document.accesstoken = accesstoken;
    document.refreshtoken = refreshtoken;
    return document.save();
  }

  async removeTokens(id) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { refreshtoken: null, accesstoken: null }, { new: true })
      .exec();

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: messages.error.resourceNotFound("User"),
      });
    }

    return user;
  }

  async findById(id, includeTokens = false) {
    let query = this.userModel.findById(id);

    if (includeTokens) {
      query = query.select("+refreshtoken +accesstoken");
    }

    const user = await query;

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: messages.error.resourceNotFound("User"),
      });
    }

    return user;
  }

  async findByIds(ids) {
    return await this.userModel.find({ _id: { $in: ids } });
  }

  async findByName(name, excludeId = null) {
    const filter = { name: { $regex: name, $options: "i" } };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return await this.userModel.findOne(filter);
  }

  async findByIdWithPassword(id) {
    const user = await this.userModel.findById(id).select("+password");

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: messages.error.resourceNotFound("User"),
      });
    }

    return user;
  }

  async findByEmail(email, excludeId = null) {
    const filter = { email };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return await this.userModel.findOne(filter).select("+password");
  }

  async list(req) {
    const { name, email, role, active, page = 1 } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit, 10) || 10, 100);

    const filters = {};
    if (name) filters.name = { $regex: name, $options: "i" };
    if (email) filters.email = { $regex: email, $options: "i" };
    if (role) filters.role = role;
    if (active !== undefined) {
      filters.active = active === "true" || active === "1" || active === true;
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { name: 1 },
    };

    const result = await this.userModel.paginate(filters, options);

    result.docs = result.docs.map((doc) =>
      typeof doc.toObject === "function" ? doc.toObject() : doc,
    );

    return result;
  }

  async create(userData) {
    const user = new this.userModel(userData);
    return await user.save();
  }

  async update(id, data) {
    const user = await this.userModel.findByIdAndUpdate(id, data, { new: true });

    if (!user) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: messages.error.resourceNotFound("User"),
      });
    }

    return user;
  }

  async delete(id) {
    return await this.userModel.findByIdAndDelete(id);
  }

  async findByRecoveryCode(code) {
    return await this.userModel
      .findOne({ password_recovery_code: code })
      .select("+password +password_recovery_code +exp_password_recovery_code");
  }
}

export default UserRepository;
