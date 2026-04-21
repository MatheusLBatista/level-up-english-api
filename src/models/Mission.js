import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Mission {
  constructor() {
    const missionSchema = new mongoose.Schema(
      {
        title: { type: String, unique: true },
        description: { type: String },
        type: { type: String, enum: ["video", "quiz", "reading"] },
        thumbnail: { type: String, default: null },
        content_url: { type: String, default: null },
        
        xp_reward: { type: Number, default: 0 },
        max_score: { type: Number, default: 0 },

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

    missionSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.missions || mongoose.model("missions", missionSchema);
  }
}

export default new Mission().model;
