import {
  CustomError,
  HttpStatusCodes,
} from "../utils/helpers/index.js";
import AuthHelper from "../utils/AuthHelper.js";
import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import { ensureTeacherCanEnroll, ensureTeacherOwnsClass } from "../utils/ClassOwnershipHelper.js";
import { MIN_LEVEL, MAX_LEVEL, xpForLevel } from "../utils/LevelHelper.js";

class UserService {
  constructor() {
    this.repository = new UserRepository();
    this.classRepository = new ClassRepository();
  }

  /**
   * Professor só lista alunos das turmas dele; admin filtra qualquer turma.
   */
  async ensureCanFilterClass(classId, userId) {
    if (classId === "none") {
      const loggedUser = await this.repository.findById(userId);

      if (loggedUser.role !== "admin") {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "class",
          details: [],
          customMessage: "Só o admin pode listar alunos sem turma.",
        });
      }

      return;
    }

    const classDoc = await this.classRepository.findById(classId);
    const loggedUser = await this.repository.findById(userId);

    if (loggedUser.role !== "teacher") return;

    ensureTeacherOwnsClass(classDoc, loggedUser, "Você só pode listar alunos das suas turmas.");
  }

  async list(req) {
    const id = req?.params?.id;

    if (id) {
      const loggedUser = await this.repository.findById(req.user_id);

      if (loggedUser.role === "student" && String(loggedUser._id) !== String(id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "User",
          details: [],
          customMessage: "Students can only view their own profile.",
        });
      }

      return await this.repository.findById(id);
    }

    const classId = req?.query?.class;

    if (classId) {
      await this.ensureCanFilterClass(classId, req.user_id);
    }

    return await this.repository.list(req);
  }

  async create(parsedData, req) {
    const loggedUser = await this.repository.findById(req.user_id);

    if (loggedUser.role !== "admin" && parsedData.role && parsedData.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "role",
        details: [],
        customMessage: "Only admins can create users with a role other than student.",
      });
    }

    if (loggedUser.role === "teacher") {
      await ensureTeacherCanEnroll(this.classRepository, parsedData.class, loggedUser);
    }

    await this.validateEmail(parsedData.email);

    if (parsedData.class) {
      await this.ensureClassAssignable(parsedData.class, parsedData.role ?? "student", { requireActive: true });
    }

    if (parsedData.password) {
      const { hash } = await AuthHelper.hashPassword(parsedData.password);
      parsedData.password = hash;
    }

    const created = await this.repository.create(parsedData);

    if (parsedData.class) {
      await this.classRepository.addStudent(parsedData.class, created._id);
    }

    return created;
  }

  async createWithPassword(parsedData) {
    delete parsedData.role;

    await this.validateEmail(parsedData.email);

    if (parsedData.password) {
      const { hash } = await AuthHelper.hashPassword(parsedData.password);
      parsedData.password = hash;
    }

    parsedData.role = "student";

    return await this.repository.create(parsedData);
  }

  async update(id, parsedData, req) {
    delete parsedData.email;
    delete parsedData.password;

    const target = await this.ensureUserExists(id);

    const user = await this.repository.findById(req.user_id);
    const isAdmin = user?.role === "admin";
    const updatingAnotherUser = String(user._id) !== String(id);

    if (!isAdmin && updatingAnotherUser) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "User",
        details: [],
        customMessage: "You do not have permission to update another user.",
      });
    }

    if (!isAdmin) {
      delete parsedData.role;
      delete parsedData.xp;
      delete parsedData.level;
      delete parsedData.class;
      delete parsedData.active;
    }

    const changingClass = "class" in parsedData;

    if (changingClass && parsedData.class !== null) {
      await this.ensureClassAssignable(parsedData.class, parsedData.role ?? target.role);
    }

    const updated = await this.repository.update(id, parsedData);

    if (changingClass && String(target.class ?? null) !== String(parsedData.class)) {
      if (target.class) await this.classRepository.removeStudent(target.class, id);
      if (parsedData.class) await this.classRepository.addStudent(parsedData.class, id);
    }

    return updated;
  }

  async delete(id, req) {
    const loggedUser = await this.repository.findById(req.user_id);
    const target = await this.ensureUserExists(id);

    const isSelf = String(loggedUser._id) === String(id);

    if (loggedUser.role === "student" && !isSelf) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "User",
        details: [],
        customMessage: "Students can only delete their own account.",
      });
    }

    if (loggedUser.role === "teacher" && !isSelf && target.role !== "student") {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "User",
        details: [],
        customMessage: "Teachers can only delete student accounts.",
      });
    }

    const deleted = await this.repository.delete(id);

    if (target.class) {
      await this.classRepository.removeStudent(target.class, id);
    }

    return deleted;
  }

  async recalculateLevels() {
    const updates = [];

    for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
      const minXp = level === MIN_LEVEL ? null : xpForLevel(level);
      const maxXp = level === MAX_LEVEL ? null : xpForLevel(level + 1);

      updates.push(this.repository.setLevelForXpRange(level, minXp, maxXp));
    }

    const results = await Promise.all(updates);

    return { updated: results.reduce((total, count) => total + count, 0) };
  }

  async ensureClassAssignable(classId, role, { requireActive = false } = {}) {
    const invalid = (message) => new CustomError({
      statusCode: HttpStatusCodes.BAD_REQUEST.code,
      errorType: "validationError",
      field: "class",
      details: [{ path: "class", message }],
      customMessage: message,
    });

    if (role !== "student") {
      throw invalid("Apenas alunos podem ser vinculados a uma turma.");
    }

    const classDoc = await this.classRepository.findPlainById(classId);

    if (!classDoc) throw invalid("Turma não encontrada.");
    if (requireActive && !classDoc.active) throw invalid("Turma não encontrada ou inativa.");
  }

  async validateEmail(email, id = null) {
    const existingUser = await this.repository.findByEmail(email, id);
    if (existingUser) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "email",
        details: [{ path: "email", message: "Email is already in use." }],
        customMessage: "Email already registered.",
      });
    }
  }

  async ensureUserExists(id) {
    const existingUser = await this.repository.findById(id);

    if (!existingUser) {
      throw new CustomError({
        statusCode: HttpStatusCodes.NOT_FOUND.code,
        errorType: "resourceNotFound",
        field: "User",
        details: [],
        customMessage: "User not found.",
      });
    }

    return existingUser;
  }
}

export default UserService;
