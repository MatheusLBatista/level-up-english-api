import Attitude from "../models/Attitude.js";
import AttitudeLog from "../models/AttitudeLog.js";
import Class from "../models/Class.js";
import Mission from "../models/Mission.js";
import Notification from "../models/Notification.js";
import Ranking from "../models/Ranking.js";
import User from "../models/User.js";
import XpAdjustment from "../models/XpAdjustment.js";

export const MODELS = [Attitude, AttitudeLog, Class, Mission, Notification, Ranking, User, XpAdjustment];

export default async function migrateIndexes(models = MODELS) {
  const result = {};

  for (const model of models) {
    await model.createCollection();
    await model.createIndexes();

    const indexes = await model.collection.indexes();
    result[model.modelName] = indexes.map((index) => index.name);
  }

  return result;
}
