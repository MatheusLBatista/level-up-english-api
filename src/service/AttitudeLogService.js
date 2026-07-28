import AttitudeLogRepository from "../repository/AttitudeLogRepository.js";

class AttitudeLogService {
  constructor() {
    this.repository = new AttitudeLogRepository();
  }

  async list(req) {
    const id = req?.params?.id;
    if (id) return await this.repository.findById(id);

    return await this.repository.list(req);
  }
}

export default AttitudeLogService;
