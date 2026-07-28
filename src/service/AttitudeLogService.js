import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";
import AttitudeRepository from "../repository/AttitudeRepository.js";
import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

class AttitudeLogService {
  constructor() {
    this.repository = new AttitudeLogRepository();
    this.attitudeRepository = new AttitudeRepository();
    this.userRepository = new UserRepository();
  }

  async list(req) {
    const id = req?.params?.id;
    if (id) return await this.repository.findById(id);

    return await this.repository.list(req);
  }

  async create(parsedData, req) {
    const attitude = await this.attitudeRepository.findById(parsedData.attitude);

    if (!attitude.active) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "attitude",
        details: [],
        customMessage: "Esta atitude está inativa.",
      });
    }

    const student = await this.userRepository.findById(parsedData.student);

    if (student.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "student",
        details: [],
        customMessage: "O usuário informado não é um aluno.",
      });
    }

    const xp_applied = attitude.type === "negative"
      ? -Math.abs(attitude.xp_value)
      : Math.abs(attitude.xp_value);

    const log = await this.repository.create({
      student: parsedData.student,
      attitude: parsedData.attitude,
      teacher: req.user_id,
      xp_applied,
    });

    await this.userRepository.update(parsedData.student, {
      $inc: { xp: xp_applied },
    });

    return log;
  }
}

export default AttitudeLogService;
