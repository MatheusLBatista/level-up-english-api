import XpAdjustment from "../models/XpAdjustment.js";

class XpAdjustmentRepository {
  constructor({ xpAdjustmentModel = XpAdjustment } = {}) {
    this.xpAdjustmentModel = xpAdjustmentModel;
  }

  async create(data) {
    const adjustment = new this.xpAdjustmentModel(data);
    return await adjustment.save();
  }
}

export default XpAdjustmentRepository;
