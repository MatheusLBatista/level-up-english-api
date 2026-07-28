import ClassService from "../service/ClassService.js";
import {
  CommonResponse,
  CustomError,
  HttpStatusCodes,
} from "../utils/helpers/index.js";
import {
  CreateClassBodySchema,
  UpdateClassBodySchema,
} from "../schemas/ClassSchema.js";

class ClassController {
  constructor() {
    this.service = new ClassService();
  }

  async list(req, res) {
    const data = await this.service.list(req);
    return CommonResponse.success(res, data);
  }

  async create(req, res) {
    const body = CreateClassBodySchema.parse(req.body);
    const data = await this.service.create(body, req);
    return CommonResponse.created(res, data);
  }

  async update(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "Class ID is required.",
      });
    }

    const body = UpdateClassBodySchema.parse(req.body);
    const data = await this.service.update(id, body, req);
    return CommonResponse.success(
      res,
      data,
      200,
      "Class updated successfully.",
    );
  }

  async delete(req, res) {
    const { id } = req.params;

    if (!id) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "id",
        details: [],
        customMessage: "Class ID is required.",
      });
    }

    await this.service.delete(id, req);
    return CommonResponse.success(
      res,
      null,
      200,
      "Class deleted successfully.",
    );
  }
}

export default ClassController;
