import XpAdjustment from "../models/XpAdjustment.js";

class XpAdjustmentRepository {
  constructor({ xpAdjustmentModel = XpAdjustment } = {}) {
    this.xpAdjustmentModel = xpAdjustmentModel;
  }

  async create(data) {
    const adjustment = new this.xpAdjustmentModel(data);
    return await adjustment.save();
  }

  async clearReasonsByStudent(studentId) {
    const result = await this.xpAdjustmentModel.updateMany(
      { student: studentId, reason: { $ne: null } },
      { $set: { reason: null } },
    );
    return result.modifiedCount;
  }

  async findByStudent(studentId) {
    return await this.xpAdjustmentModel.find({ student: studentId }).populate("teacher", "name");
  }
}

export default XpAdjustmentRepository;
