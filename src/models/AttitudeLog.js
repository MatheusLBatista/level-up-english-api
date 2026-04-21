import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class AttitudeLog {
  constructor() {
    const attitudeLogSchema = new mongoose.Schema(
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        attitude: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "attitudes",
        },
        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        xp_applied: { type: Number, default: 0 },
        applied_at: { type: Date, default: Date.now },
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    attitudeLogSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.attitudeLogs || mongoose.model("attitudeLogs", attitudeLogSchema);
  }
}

export default new AttitudeLog().model;
