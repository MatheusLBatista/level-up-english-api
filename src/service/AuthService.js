import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";
import TokenUtil from "../utils/TokenUtil.js";
import bcrypt from "bcrypt";
import AuthHelper from "../utils/AuthHelper.js";

class AuthService {
  constructor({ userRepository = new UserRepository() } = {}) {
    this.userRepository = userRepository;
    this.tokenUtil = TokenUtil;
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    const credenciaisInvalidas = new CustomError({
      statusCode: HttpStatusCodes.UNAUTHORIZED.code,
      errorType: "authenticationError",
      field: "Credenciais",
      details: [],
      customMessage: messages.auth.invalidCredentials,
    });

    if (!user) throw credenciaisInvalidas;

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) throw credenciaisInvalidas;

    const accessToken = await this.tokenUtil.generateAccessToken(user._id);
    const refreshToken = await this.tokenUtil.generateRefreshToken(user._id);

    await this.userRepository.storeTokens(user._id, accessToken, refreshToken);

    const userObj = user.toObject();
    delete userObj.password;

    return { accessToken, refreshToken, user: userObj };
  }

  async logout(userId) {
    await this.userRepository.removeTokens(userId);
  }

  async refresh(refreshToken) {

    let payload;

    try {
      payload = await this.tokenUtil.verifyRefreshToken(refreshToken);

    } catch {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: "authenticationError",
        field: "Token",
        details: [],
        customMessage: messages.auth.invalidToken,
      });
    }

    const user = await this.userRepository.findById(payload.id, true);

    if (!user.refreshtoken || user.refreshtoken !== refreshToken) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: "authenticationError",
        field: "Token",
        details: [],
        customMessage: messages.auth.invalidToken,
      });
    }

    const newAccessToken = await this.tokenUtil.generateAccessToken(user._id);
    const newRefreshToken = await this.tokenUtil.generateRefreshToken(user._id);

    await this.userRepository.storeTokens(user._id, newAccessToken, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findByIdWithPassword(userId);

    const senhaCorreta = await bcrypt.compare(currentPassword, user.password);
    if (!senhaCorreta) {
      throw new CustomError({
        statusCode: HttpStatusCodes.UNAUTHORIZED.code,
        errorType: "authenticationError",
        field: "currentPassword",
        details: [{ path: "currentPassword", message: "Senha atual incorreta." }],
        customMessage: "Senha atual incorreta.",
      });
    }

    const { hash } = await AuthHelper.hashPassword(newPassword);

    await this.userRepository.update(userId, { password: hash });
  }

  async revoke(targetUserId) {
    await this.userRepository.removeTokens(targetUserId);
  }

  async loadTokens(userId) {
    const data = await this.userRepository.findById(userId, true);
    return { data };
  }
}

export default AuthService;
