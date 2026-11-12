import DataErasureLog from "../models/DataErasureLog.js";

class DataErasureLogRepository {
  constructor({ dataErasureLogModel = DataErasureLog } = {}) {
    this.dataErasureLogModel = dataErasureLogModel;
  }

  async create(data) {
    const log = new this.dataErasureLogModel(data);
    return await log.save();
  }

  async findErasedUserIds() {
    return await this.dataErasureLogModel.distinct("user");
  }
}

export default DataErasureLogRepository;
