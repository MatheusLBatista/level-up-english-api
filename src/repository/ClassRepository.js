import Class from "../models/Class.js";
import { CustomError, messages } from "../utils/helpers/index.js";

class ClassRepository {
  constructor({ classModel = Class } = {}) {
    this.classModel = classModel;
  }

  async findById(id) {
    const classDoc = await this.classModel
      .findById(id)
      .populate("teacher", "name email role")
      .populate("students", "name email role")
      .populate("missions", "title type active");

    if (!classDoc) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Class",
        details: [],
        customMessage: messages.error.resourceNotFound("Class"),
      });
    }

    return classDoc;
  }

  async findByName(name, excludeId = null) {
    const filter = { name: { $regex: `^${name}$`, $options: "i" } };

    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    return await this.classModel.findOne(filter);
  }

  async list(req) {
    const { name, active, teacher, page = 1 } = req.query || {};
    const limit = Math.min(parseInt(req.query?.limit, 10) || 10, 100);

    const filters = {};
    if (name) filters.name = { $regex: name, $options: "i" };
    if (teacher) filters.teacher = teacher;
    if (active !== undefined) {
      filters.active = active === "true" || active === "1" || active === true;
    }

    const options = {
      page: parseInt(page, 10),
      limit,
      sort: { name: 1 },
      populate: [{ path: "teacher", select: "name email role" }],
    };

    return await this.classModel.paginate(filters, options);
  }

  async create(data) {
    const classDoc = new this.classModel(data);
    return await classDoc.save();
  }

  async update(id, data) {
    const classDoc = await this.classModel.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!classDoc) {
      throw new CustomError({
        statusCode: 404,
        errorType: "resourceNotFound",
        field: "Class",
        details: [],
        customMessage: messages.error.resourceNotFound("Class"),
      });
    }

    return classDoc;
  }

  async delete(id) {
    return await this.classModel.findByIdAndDelete(id);
  }
}

export default ClassRepository;
