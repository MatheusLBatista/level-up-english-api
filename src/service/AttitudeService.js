import AttitudeRepository from "../repository/AttitudeRepository.js";

class AttitudeService {
  constructor() {
    this.repository = new AttitudeRepository();
  }

  async list(req) {
    const id = req?.params?.id;
    if (id) return await this.repository.findById(id);

    return await this.repository.list(req);
  }
}

export default AttitudeService;
