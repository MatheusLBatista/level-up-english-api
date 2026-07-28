import Attitude from "../models/Attitude.js";
import { CustomError, messages } from "../utils/helpers/index.js";

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

    const filters = {};
    if (name) filters.name = { $regex: name, $options: "i" };
    if (type) filters.type = type;
    if (active !== undefined) {
      filters.active = active === "true" || active === "1" || active === true;
    }

    const options = {
      page: parseInt(page, 10),
      limit,
      sort: { name: 1 },
      populate: [{ path: "createdBy", select: "name" }],
    };

    return await this.attitudeModel.paginate(filters, options);
  }
}

export default AttitudeRepository;
