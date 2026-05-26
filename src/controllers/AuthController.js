import AuthService from "../service/AuthService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { LoginBodySchema } from "../schemas/AuthSchema.js";

class AuthController {
  constructor() {
    this.service = new AuthService();
  }

  async login(req, res) {
    const body = LoginBodySchema.parse(req.body);
    const data = await this.service.login(body);
    return CommonResponse.success(res, data, 200, "Login realizado com sucesso.");
  }
}

export default AuthController;
