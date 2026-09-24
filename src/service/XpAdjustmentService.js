import XpAdjustmentRepository from "../repository/XpAdjustmentRepository.js";
import UserRepository from "../repository/UserRepository.js";
import ProgressionService from "./ProgressionService.js";
import Class from "../models/Class.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

class XpAdjustmentService {
  constructor() {
    this.repository = new XpAdjustmentRepository();
    this.userRepository = new UserRepository();
    this.progressionService = new ProgressionService();
  }

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
        customMessage: "Você só pode ajustar o XP de alunos das suas turmas.",
      });
    }
  }

  async create(parsedData, req) {
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

    // Diferente do attitude-logs, o XP é aplicado antes do log: o valor gravado
    // em xp_applied só é conhecido depois que o piso em 0 foi aplicado.
    const { xp_applied, progression } = await this.progressionService.adjustXp(
      parsedData.student,
      parsedData.amount,
    );

    const adjustment = await this.repository.create({
      student: parsedData.student,
      teacher: req.user_id,
      amount: parsedData.amount,
      xp_applied,
      reason: parsedData.reason,
    });

    return { ...adjustment.toObject(), progression };
  }
}

export default XpAdjustmentService;
