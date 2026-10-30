import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export const NOTIFICATION_TYPES = ["attitude", "xp_adjustment", "new_mission"];
export const NOTIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;

class Notification {
  constructor() {
    const notificationSchema = new mongoose.Schema(
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        type: { type: String, enum: NOTIFICATION_TYPES, required: true },
        message: { type: String, required: true, trim: true },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
        read: { type: Boolean, default: false },
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
    notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_SECONDS });

    notificationSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.notifications || mongoose.model("notifications", notificationSchema);
  }
}

export default new Notification().model;
