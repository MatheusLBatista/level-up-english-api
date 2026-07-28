import AttitudeRepository from "../repository/AttitudeRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";

class AttitudeService {
  constructor() {
    this.repository = new AttitudeRepository();
  }

  async list(req) {
    const id = req?.params?.id;
    if (id) return await this.repository.findById(id);

    return await this.repository.list(req);
  }

  async create(parsedData, req) {
    await this.ensureNameAvailable(parsedData.name);

    return await this.repository.create({
      ...parsedData,
      createdBy: req.user_id,
    });
  }

  async update(id, parsedData) {
    await this.ensureAttitudeExists(id);

    if (parsedData.name) {
      await this.ensureNameAvailable(parsedData.name, id);
    }

    return await this.repository.update(id, parsedData);
  }

  async ensureAttitudeExists(id) {
    return await this.repository.findById(id);
  }

  async ensureNameAvailable(name, excludeId = null) {
    const existing = await this.repository.findByName(name, excludeId);
    if (existing) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "name",
        details: [{ path: "name", message: messages.validation.generic.resourceAlreadyExists("Attitude") }],
        customMessage: messages.validation.generic.resourceAlreadyExists("Attitude"),
      });
    }
  }
}

export default AttitudeService;
