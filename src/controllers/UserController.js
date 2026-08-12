import UserService from "../service/UserService.js";
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
} from "../utils/helpers/index.js";
import { CreateUserBodySchema, UpdateUserBodySchema } from "../schemas/UserSchema.js";

class UserController {
  constructor() {
    this.service = new UserService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async create(req, res) {
    const body = CreateUserBodySchema.parse(req.body);
    const data = await this.service.create(body, req);

    const cleanUser = data.toObject();
    delete cleanUser.password;

    return CommonResponse.created(res, cleanUser);
  }

  async createWithPassword(req, res) {
    const data = await this.service.createWithPassword(req.body);

    const cleanUser = data.toObject();
    delete cleanUser.password;

    return CommonResponse.created(res, cleanUser);
  }

  async update(req, res) {
    const id = req?.params?.id;
    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "User ID is required.",
      });
    }

    const body = UpdateUserBodySchema.parse(req.body);
    const data = await this.service.update(id, body, req);

    const cleanUser = data.toObject();
    delete cleanUser.email;
    delete cleanUser.password;

    return CommonResponse.success(res, cleanUser, 200, "User updated successfully.");
  }

  async recalculateLevels(req, res) {
    const data = await this.service.recalculateLevels();
    return CommonResponse.success(res, data, 200, "Levels recalculated successfully.");
  }

  async delete(req, res) {
    const id = req?.params?.id;
    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "User ID is required.",
      });
    }

    const data = await this.service.delete(id, req);
    return CommonResponse.success(res, data, 200, "User deleted successfully.");
  }
}

export default UserController;
