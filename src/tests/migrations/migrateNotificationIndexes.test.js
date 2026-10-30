import migrateNotificationIndexes from "../../migrations/migrateNotificationIndexes.js";
import Notification, { NOTIFICATION_TTL_SECONDS } from "../../models/Notification.js";
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("migrateNotificationIndexes", () => {
  beforeAll(async() => {
    await connectTestDatabase();
    await Notification.init();
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  beforeEach(async() => {
    await Notification.collection.dropIndexes();
  });

  const indice = async(nome) => (await Notification.collection.indexes()).find((index) => index.name === nome);

  it("deve criar o índice da listagem e o TTL de 90 dias", async() => {
    const nomes = await migrateNotificationIndexes();

    expect(nomes).toEqual(expect.arrayContaining(["_id_", "user_1_read_1_createdAt_-1", "createdAt_1"]));
    expect((await indice("createdAt_1")).expireAfterSeconds).toBe(NOTIFICATION_TTL_SECONDS);
  });

  it("deve ser idempotente", async() => {
    await migrateNotificationIndexes();
    const nomes = await migrateNotificationIndexes();

    expect(nomes.sort()).toEqual(["_id_", "createdAt_1", "user_1_read_1_createdAt_-1"]);
  });
});
