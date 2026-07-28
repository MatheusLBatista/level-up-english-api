import Attitude from "../models/Attitude.js";
import { CustomError, messages } from "../utils/helpers/index.js";
import AttitudeFilterBuild from "./filters/AttitudeFilterBuild.js";

class AttitudeRepository {
  constructor({ attitudeModel = Attitude } = {}) {
    this.attitudeModel = attitudeModel;
  }

  async findById(id) {
    const attitude = await this.attitudeModel
      .findById(id)
      .populate("createdBy", "name");

    if (!attitude) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Attitude",
        details: [],
        customMessage: messages.error.resourceNotFound("Attitude"),
      });
    }

    return attitude;
  }

  async list(req) {
    const { name, type, active, page = 1 } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit, 10) || 10, 100);

    const filters = new AttitudeFilterBuild()
      .withName(name)
      .withType(type)
      .withActive(active)
      .build();

    const options = {
      page: parseInt(page, 10),
      limit,
      sort: { name: 1 },
      populate: [{ path: "createdBy", select: "name" }],
    };

    return await this.attitudeModel.paginate(filters, options);
  }

  async findByName(name, excludeId = null) {
    const filter = { name: { $regex: `^${name}$`, $options: "i" } };
    if (excludeId) filter._id = { $ne: excludeId };
    return await this.attitudeModel.findOne(filter);
  }

  async create(data) {
    const attitude = new this.attitudeModel(data);
    return await attitude.save();
  }
}

export default AttitudeRepository;
