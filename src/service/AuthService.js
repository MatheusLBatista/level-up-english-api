import UserRepository from "../repository/UserRepository.js";

class AuthService {
  constructor({ userRepository = new UserRepository() } = {}) {
    this.userRepository = userRepository;
  }

  async carregatokens(userId) {
    const data = await this.userRepository.buscarPorID(userId, true);
    return { data };
  }
}

export default AuthService;
