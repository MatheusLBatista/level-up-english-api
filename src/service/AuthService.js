import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";
import TokenUtil from "../utils/TokenUtil.js";
import bcrypt from "bcrypt";
import AuthHelper from "../utils/AuthHelper.js";
import SendMail from "../utils/SendMail.js";
import { forgotPasswordTemplate, welcomeStudentTemplate } from "../utils/emailTemplates.js";
import crypto from "crypto";

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

  async registerStudent({ name, email, class: classId }) {
    const emailExistente = await this.userRepository.findByEmail(email);
    if (emailExistente) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "email",
        details: [{ path: "email", message: "Este e-mail já está cadastrado." }],
        customMessage: "Este e-mail já está cadastrado.",
      });
    }
    
    const userData = { name, email, role: "student" };
    if (classId) userData.class = classId;
    const student = await this.userRepository.create(userData);
    
    const code = crypto.randomBytes(32).toString("hex");
    const expiresInHours = 24;
    const expiry = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    await this.userRepository.setRecoveryCode(student._id, code, expiry);
    
    const setupLink = `${process.env.FRONTEND_URL}/set-password?code=${code}`;
    const template = welcomeStudentTemplate({ name, setupLink, expiresInHours });
    await SendMail.enviaEmail({ to: email, ...template });

    const studentObj = student.toObject();
    delete studentObj.password;
    return studentObj;
  }

  async forgotPassword(email) {    
    const user = await this.userRepository.findByEmail(email);
    if (!user) return;
    
    const code = crypto.randomBytes(32).toString("hex");
    const expiresInMinutes = 30;
    const expiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    await this.userRepository.setRecoveryCode(user._id, code, expiry);
    
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?code=${code}`;
    
    const template = forgotPasswordTemplate({ name: user.name, code, resetLink, expiresInMinutes });
    await SendMail.enviaEmail({ to: user.email, ...template });
  }

  async resetPassword(code, newPassword) {    
    const user = await this.userRepository.findByRecoveryCode(code);

    const codigoInvalido = new CustomError({
      statusCode: HttpStatusCodes.BAD_REQUEST.code,
      errorType: "validationError",
      field: "code",
      details: [{ path: "code", message: "Código de recuperação inválido ou expirado." }],
      customMessage: "Código de recuperação inválido ou expirado.",
    });

    if (!user) throw codigoInvalido;
    
    if (!user.exp_password_recovery_code || user.exp_password_recovery_code < new Date()) {
      throw codigoInvalido;
    }
    
    const { hash } = await AuthHelper.hashPassword(newPassword);
    
    await this.userRepository.update(user._id, { password: hash });
    await this.userRepository.clearRecoveryCode(user._id);
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
