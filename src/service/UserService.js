import {
  CustomError,
  HttpStatusCodes,
} from "../utils/helpers/index.js";
import AuthHelper from "../utils/AuthHelper.js";
import UserRepository from "../repository/UserRepository.js";
import { MIN_LEVEL, MAX_LEVEL, xpForLevel } from "../utils/LevelHelper.js";

class UserService {
  constructor() {
    this.repository = new UserRepository();
  }

  async list(req) {
    const id = req?.params?.id;

    if (id) {
      return await this.repository.findById(id);
    }

    return await this.repository.list(req);
  }

  async create(parsedData) {
    await this.validateEmail(parsedData.email);

    if (parsedData.password) {
      const { hash } = await AuthHelper.hashPassword(parsedData.password);
      parsedData.password = hash;
    }

    return await this.repository.create(parsedData);
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

    await this.ensureUserExists(id);

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
    }

    return await this.repository.update(id, parsedData);
  }

  async delete(id, req) {
    const user = await this.repository.findById(req.user_id);

    await this.ensureUserExists(id);

    if (user.role === "student" && user._id.toString() !== id.toString()) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "User",
        details: [],
        customMessage: "Students can only delete their own account.",
      });
    }

    return await this.repository.delete(id);
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
