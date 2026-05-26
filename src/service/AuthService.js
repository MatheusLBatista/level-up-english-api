import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";
import TokenUtil from "../utils/TokenUtil.js";
import bcrypt from "bcrypt";

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

  async loadTokens(userId) {
    const data = await this.userRepository.findById(userId, true);
    return { data };
  }
}

export default AuthService;
