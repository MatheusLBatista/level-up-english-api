import User from "../models/User.js";

export default async function backfillDeactivatedAt(model = User) {
  const result = await model.collection.updateMany(
    { active: false, deactivated_at: null },
    [{ $set: { deactivated_at: { $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", "$$NOW"] }] } } }],
  );

  return result.modifiedCount;
}
