import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class XpAdjustment {
  constructor() {
    const xpAdjustmentSchema = new mongoose.Schema(
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        teacher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        amount: { type: Number, required: true },
        xp_applied: { type: Number, default: 0 },
        reason: { type: String, trim: true, maxlength: 200 },
        applied_at: { type: Date, default: Date.now },
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    xpAdjustmentSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.xpAdjustments || mongoose.model("xpAdjustments", xpAdjustmentSchema);
  }
}

export default new XpAdjustment().model;
