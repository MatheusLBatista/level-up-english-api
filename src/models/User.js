import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class User {
  constructor() {
    const userSchema = new mongoose.Schema(
      {
        name: { type: String },
        email: { type: String, unique: true },
        password: { type: String, select: false },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        class: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "classes",
        },
        role: {
          type: String,
          enum: ["student", "teacher", "admin"],
          default: "student",
        },
        mission_progress: [
          {
            mission_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "missions",
            },
            done: Boolean,
            score: Number,
          },
        ],
        streak: { type: Number, default: 0 },
        badges: [{ type: String }],
        active: { type: Boolean, default: true },

        uniqueToken: { type: String, select: false },
        refreshtoken: { type: String, select: false },
        accesstoken: { type: String, select: false },
        password_recovery_code: { type: String, select: false, unique: false },
        exp_password_recovery_code: { type: Date, select: false },
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    userSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.users || mongoose.model("users", userSchema);
  }
}

export default new User().model;
