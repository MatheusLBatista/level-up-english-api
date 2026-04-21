import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Class {
  constructor() {
    const classSchema = new mongoose.Schema(
      {
        name: { type: String, unique: true },
        active: { type: Boolean, default: true },

        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        students: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        }],
        missions: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "missions",
        }],
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    classSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.classes || mongoose.model("classes", classSchema);
  }
}

export default new Class().model;
