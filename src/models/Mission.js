import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

class Mission {
  constructor() {
    const questionSchema = new mongoose.Schema(
      {
        question: { type: String, required: true },
        options: {
          a: { type: String, required: true },
          b: { type: String, required: true },
          c: { type: String, required: true },
          d: { type: String, required: true },
        },
        correct_answer: { type: String, enum: ["a", "b", "c", "d"], required: true },
      },
      { _id: false },
    );

    const missionSchema = new mongoose.Schema(
      {
        title: { type: String, required: true, unique: true },
        description: { type: String, default: null },

        type: { type: String, enum: ["quiz", "vocabulary", "audio"], required: true },

        questions: { type: [questionSchema], default: undefined },

        content: { type: String, default: null },

        content_url: { type: String, default: null },

        xp_reward: { type: Number, default: 0 },

        class_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "classes",
          required: true,
        },

        active: { type: Boolean, default: true },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
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
