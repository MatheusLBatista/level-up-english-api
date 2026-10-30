import Notification from "../models/Notification.js";

export default async function migrateNotificationIndexes(model = Notification) {
  await model.syncIndexes();

  const indexes = await model.collection.indexes();
  return indexes.map((index) => index.name);
}
