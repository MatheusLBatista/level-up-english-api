import AuthService from "../service/AuthService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { LoginBodySchema, RevokeParamsSchema, RefreshBodySchema, ChangePasswordBodySchema } from "../schemas/AuthSchema.js";

class AuthController {
  constructor() {
    this.service = new AuthService();
  }

  async login(req, res) {
    const body = LoginBodySchema.parse(req.body);
    const data = await this.service.login(body);
    return CommonResponse.success(res, data, 200, "Login realizado com sucesso.");
  }

  async refresh(req, res) {
    const { refreshToken } = RefreshBodySchema.parse(req.body);
    const data = await this.service.refresh(refreshToken);
    return CommonResponse.success(res, data, 200, "Token renovado com sucesso.");
  }

  async logout(req, res) {
    await this.service.logout(req.user_id);
    return CommonResponse.success(res, null, 200, "Logout realizado com sucesso.");
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = ChangePasswordBodySchema.parse(req.body);
    await this.service.changePassword(req.user_id, currentPassword, newPassword);
    return CommonResponse.success(res, null, 200, "Senha alterada com sucesso.");
  }

  async revoke(req, res) {
    const { userId } = RevokeParamsSchema.parse(req.params);
    await this.service.revoke(userId);
    return CommonResponse.success(res, null, 200, "Sessão do usuário revogada com sucesso.");
  }
}

export default AuthController;
