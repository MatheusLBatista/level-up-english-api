import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import {
  CustomError,
  HttpStatusCodes,
  messages,
} from "../utils/helpers/index.js";

class ClassService {
  constructor() {
    this.repository = new ClassRepository();
    this.userRepository = new UserRepository();
  }

  async list(req) {
    const id = req?.params?.id;

    if (id) {
      return await this.repository.findById(id);
    }

    return await this.repository.list(req);
  }

  async create(parsedData, req) {
    await this.ensureNameAvailable(parsedData.name);

    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role === "teacher") {
      parsedData.teacher = req.user_id;
    }

    return await this.repository.create(parsedData);
  }

  async update(id, parsedData, req) {
    const existingClass = await this.ensureClassExists(id);

    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role === "teacher") {
      const ownerId = existingClass.teacher?._id ?? existingClass.teacher;

      if (String(ownerId) !== String(req.user_id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "Class",
          details: [],
          customMessage: "Teachers can only update their own classes.",
        });
      }

      delete parsedData.teacher;
    }

    if (parsedData.name) {
      await this.ensureNameAvailable(parsedData.name, id);
    }

    return await this.repository.update(id, parsedData);
  }

  async delete(id, req) {
    await this.ensureClassExists(id);

    await this.repository.delete(id);

    return null;
  }

  async ensureNameAvailable(name, id = null) {
    const existingClass = await this.repository.findByName(name, id);

    if (existingClass) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "name",
        details: [
          {
            path: "name",
            message: messages.validation.generic.resourceAlreadyExists("Class"),
          },
        ],
        customMessage:
          messages.validation.generic.resourceAlreadyExists("Class"),
      });
    }
  }

  async ensureClassExists(id) {
    return await this.repository.findById(id);
  }
}

export default ClassService;
