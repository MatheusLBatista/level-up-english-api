import AttitudeLog from "../models/AttitudeLog.js";
import { CustomError, messages } from "../utils/helpers/index.js";
import AttitudeLogFilterBuild from "./filters/AttitudeLogFilterBuild.js";

class AttitudeLogRepository {
  constructor({ attitudeLogModel = AttitudeLog } = {}) {
    this.attitudeLogModel = attitudeLogModel;
  }

  async findById(id) {
    const log = await this.attitudeLogModel
      .findById(id)
      .populate("student", "name email")
      .populate("teacher", "name email")
      .populate("attitude", "name type xp_value");

    if (!log) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "AttitudeLog",
        details: [],
        customMessage: messages.error.resourceNotFound("AttitudeLog"),
      });
    }

    return log;
  }

  async list(req) {
    const { student, teacher, attitude, page = 1 } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit, 10) || 10, 100);

    const filters = new AttitudeLogFilterBuild()
      .withStudent(student)
      .withTeacher(teacher)
      .withAttitude(attitude)
      .build();

    const options = {
      page: parseInt(page, 10),
      limit,
      sort: { applied_at: -1 },
      populate: [
        { path: "student", select: "name email" },
        { path: "teacher", select: "name email" },
        { path: "attitude", select: "name type xp_value" },
      ],
    };

    return await this.attitudeLogModel.paginate(filters, options);
  }

  async create(data) {
    const log = new this.attitudeLogModel(data);
    return await log.save();
  }

  async delete(id) {
    return await this.attitudeLogModel.findByIdAndDelete(id);
  }

  async update(id, data) {
    const log = await this.attitudeLogModel.findByIdAndUpdate(id, data, { new: true });

    if (!log) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "AttitudeLog",
        details: [],
        customMessage: messages.error.resourceNotFound("AttitudeLog"),
      });
    }

    return log;
  }
}

export default AttitudeLogRepository;
