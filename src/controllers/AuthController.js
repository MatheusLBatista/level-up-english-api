import AuthService from "../service/AuthService.js";
import { CommonResponse } from "../utils/helpers/index.js";

class AuthController {
  constructor() {
    this.service = new AuthService();
  }

  async login(req, res) {
    const { email, password } = req.body;
    const data = await this.service.login({ email, password });
    return CommonResponse.success(res, data, 200, "Login realizado com sucesso.");
  }
}

export default AuthController;
