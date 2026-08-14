import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";
import AttitudeRepository from "../repository/AttitudeRepository.js";
import UserRepository from "../repository/UserRepository.js";
import ProgressionService from "./ProgressionService.js";
import Class from "../models/Class.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

class AttitudeLogService {
  constructor() {
    this.repository = new AttitudeLogRepository();
    this.attitudeRepository = new AttitudeRepository();
    this.userRepository = new UserRepository();
    this.progressionService = new ProgressionService();
  }

  async applyXp(studentId, xpDelta) {
    return await this.progressionService.applyXp(studentId, xpDelta);
  }

  /**
   * Admin mexe em qualquer log; professor, apenas nos que ele mesmo aplicou.
   */
  async ensureCanManage(log, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role !== "teacher") return;

    // teacher vem populado do repositório, então a comparação é pelo _id
    const authorId = log.teacher?._id ?? log.teacher;

    if (String(authorId) !== String(req.user_id)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "AttitudeLog",
        details: [],
        customMessage: "Teachers can only change logs they applied.",
      });
    }
  }

  /**
   * Professor só pontua aluno das turmas dele; admin alcança qualquer aluno.
   * Mesma regra que o MissionService aplica na turma alvo da missão.
   */
  async ensureOwnsStudent(student, loggedUser) {
    if (loggedUser.role !== "teacher") return;

    const studentClass = student.class ? await Class.findById(student.class) : null;
    const ownerId = studentClass?.teacher?._id ?? studentClass?.teacher;

    if (!ownerId || String(ownerId) !== String(loggedUser._id)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "student",
        details: [],
        customMessage: "Você só pode aplicar atitudes a alunos das suas turmas.",
      });
    }
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

    const loggedUser = await this.userRepository.findById(req.user_id);

    await this.ensureOwnsStudent(student, loggedUser);

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

  async delete(id, req) {
    const existingLog = await this.repository.findById(id);

    await this.ensureCanManage(existingLog, req);

    await this.repository.delete(id);

    await this.applyXp(
      String(existingLog.student._id ?? existingLog.student),
      -existingLog.xp_applied,
    );
  }

  async update(id, parsedData, req) {
    const existingLog = await this.repository.findById(id);

    await this.ensureCanManage(existingLog, req);

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
