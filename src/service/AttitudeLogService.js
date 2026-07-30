import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";
import AttitudeRepository from "../repository/AttitudeRepository.js";
import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";
import { calculateLevel, getProgress } from "../utils/LevelHelper.js";

class AttitudeLogService {
  constructor() {
    this.repository = new AttitudeLogRepository();
    this.attitudeRepository = new AttitudeRepository();
    this.userRepository = new UserRepository();
  }

  async applyXp(studentId, xpDelta) {
    const student = await this.userRepository.update(studentId, {
      $inc: { xp: xpDelta },
    });

    const previous_level = student.level;
    const level = calculateLevel(student.xp);

    const updated = level === previous_level
      ? student
      : await this.userRepository.update(studentId, { level });

    return {
      student: String(updated._id),
      previous_level,
      leveled_up: level > previous_level,
      leveled_down: level < previous_level,
      ...getProgress(updated.xp),
    };
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

    const progression = await this.applyXp(parsedData.student, xp_applied);

    return { ...log.toObject(), progression };
  }

  async delete(id) {
    const existingLog = await this.repository.findById(id);

    await this.repository.delete(id);

    await this.applyXp(
      String(existingLog.student._id ?? existingLog.student),
      -existingLog.xp_applied,
    );
  }

  async update(id, parsedData) {
    const existingLog = await this.repository.findById(id);

    if (!parsedData.attitude) {
      return await this.repository.update(id, parsedData);
    }

    const newAttitude = await this.attitudeRepository.findById(parsedData.attitude);

    if (!newAttitude.active) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "attitude",
        details: [],
        customMessage: "Esta atitude está inativa.",
      });
    }

    const newXp = newAttitude.type === "negative"
      ? -Math.abs(newAttitude.xp_value)
      : Math.abs(newAttitude.xp_value);

    const xpDiff = newXp - existingLog.xp_applied;

    const log = await this.repository.update(id, {
      attitude: parsedData.attitude,
      xp_applied: newXp,
    });

    const progression = await this.applyXp(
      String(existingLog.student._id ?? existingLog.student),
      xpDiff,
    );

    return { ...log.toObject(), progression };
  }
}

export default AttitudeLogService;
