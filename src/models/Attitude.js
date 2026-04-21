import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Attitude {
  constructor() {
    const attitudeSchema = new mongoose.Schema(
      {
        name: { type: String, unique: true },
        description: { type: String },
        xp_value: { type: Number, default: 0 },
        type: { type: String, enum: ["positive", "negative"] },

        active: { type: Boolean, default: true },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    attitudeSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.attitudes || mongoose.model("attitudes", attitudeSchema);
  }
}

export default new Attitude().model;
