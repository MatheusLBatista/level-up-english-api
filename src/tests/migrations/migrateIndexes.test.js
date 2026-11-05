import mongoose from "mongoose";
import migrateIndexes, { MODELS } from "../../migrations/migrateIndexes.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Attitude from "../../models/Attitude.js";
import {
  connectTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("migrateIndexes", () => {
  beforeAll(async() => {
    mongoose.set("autoIndex", false);
    await connectTestDatabase();
  });

  afterAll(async() => {
    await disconnectTestDatabase();
    mongoose.set("autoIndex", true);
  });

  beforeEach(async() => {
    await mongoose.connection.dropDatabase();
  });

  it("deve criar os índices de todos os models num banco vazio", async() => {
    const result = await migrateIndexes();

    expect(Object.keys(result).sort()).toEqual(MODELS.map((model) => model.modelName).sort());
    expect(result.users).toContain("email_1");
    expect(result.classes).toContain("name_1");
    expect(result.attitudes).toContain("name_1");
  });

  it("deve barrar e-mail duplicado depois da migração", async() => {
    await migrateIndexes();
    await User.collection.insertOne({ email: "aluno@escola.com" });

    await expect(User.collection.insertOne({ email: "aluno@escola.com" })).rejects.toThrow(/duplicate key/);
  });

  it("deve ser idempotente", async() => {
    const primeira = await migrateIndexes([User, Class, Attitude]);
    const segunda = await migrateIndexes([User, Class, Attitude]);

    expect(segunda).toEqual(primeira);
  });
});
