import mongoose from "mongoose";

export const ERASURE_REASONS = ["retention", "holder_request"];

class DataErasureLog {
  constructor() {
    const dataErasureLogSchema = new mongoose.Schema(
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        reason: { type: String, enum: ERASURE_REASONS, required: true },
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          default: null,
        },
        performed_at: { type: Date, default: Date.now },
      },
      {
        versionKey: false,
      },
    );

    dataErasureLogSchema.index({ user: 1 });

    this.model = mongoose.models.dataErasureLogs || mongoose.model("dataErasureLogs", dataErasureLogSchema);
  }
}

export default new DataErasureLog().model;
