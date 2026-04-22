import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Ranking {
  constructor() {
    const rankingSchema = new mongoose.Schema(
      {
        type: { type: String, enum: ["global", "class"] },
        class: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "classes",
          required: function () {
            return this.type === "class";
          },
        },
        updatedAt: { type: Date, default: Date.now },
        entries: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "users",
            },
            xp: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
          },
        ],
      },
      {
        timestamps: true,
        versionKey: false,
      },
    );

    rankingSchema.plugin(mongoosePaginate);

    this.model = mongoose.models.rankings || mongoose.model("rankings", rankingSchema);
  }
}

export default new Ranking().model;
