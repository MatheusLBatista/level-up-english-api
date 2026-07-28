import Mission from "../models/Mission.js";
import { CustomError, messages } from "../utils/helpers/index.js";
import MissionFilterBuild from "./filters/MissionFilterBuild.js";

class MissionRepository {
  constructor({ missionModel = Mission } = {}) {
    this.missionModel = missionModel;
  }

  async findById(id) {
    const mission = await this.missionModel.findById(id).populate("class_id", "name").populate("createdBy", "name");

    if (!mission) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Mission",
        details: [],
        customMessage: messages.error.resourceNotFound("Mission"),
      });
    }

    return mission;
  }

  async findByTitle(title, excludeId = null) {
    const filter = { title: { $regex: `^${title}$`, $options: "i" } };
    if (excludeId) filter._id = { $ne: excludeId };
    return await this.missionModel.findOne(filter);
  }

  async list(req) {
    const { title, type, class_id, active, page = 1 } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit, 10) || 10, 100);

    const filters = new MissionFilterBuild()
      .withTitle(title)
      .withType(type)
      .withClassId(class_id)
      .withActive(active)
      .build();

    const options = {
      page: parseInt(page, 10),
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: "class_id", select: "name" },
        { path: "createdBy", select: "name" },
      ],
    };

    return await this.missionModel.paginate(filters, options);
  }

  async create(data) {
    const mission = new this.missionModel(data);
    return await mission.save();
  }

  async update(id, data) {
    const mission = await this.missionModel.findByIdAndUpdate(id, data, { new: true });

    if (!mission) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Mission",
        details: [],
        customMessage: messages.error.resourceNotFound("Mission"),
      });
    }

    return mission;
  }

  async delete(id) {
    return await this.missionModel.findByIdAndDelete(id);
  }
}

export default MissionRepository;
