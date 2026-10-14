import mongoose from "mongoose";
import migrateMissionTitleIndex from "../../migrations/migrateMissionTitleIndex.js";
import Mission from "../../models/Mission.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("migrateMissionTitleIndex", () => {
  const TURMA_A = new mongoose.Types.ObjectId();
  const TURMA_B = new mongoose.Types.ObjectId();
  const AUTOR = new mongoose.Types.ObjectId();

  beforeAll(async() => {
    await connectTestDatabase();
    // Em teste o autoIndex está ligado: espera o Mongoose terminar os índices
    // do model antes de cada teste montar o cenário que quer.
    await Mission.init();
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  // Simula o banco de produção antes da migração: só o índice global antigo.
  beforeEach(async() => {
    await clearTestDatabase();
    await Mission.collection.dropIndexes();
    await Mission.collection.createIndex({ title: 1 }, { unique: true, name: "title_1" });
  });

  const indices = async() => (await Mission.collection.indexes()).map((index) => index.name).sort();

  const inserir = async(...missoes) =>
    await Mission.collection.insertMany(
      missoes.map(([title, class_id]) => ({ title, class_id, type: "vocabulary", createdBy: AUTOR, active: true })),
    );

  it("deve apagar o title_1 e criar o índice composto", async() => {
    const resultado = await migrateMissionTitleIndex();

    expect(resultado).toEqual({ duplicates: [], droppedLegacyIndex: true, createdIndex: true });
    expect(await indices()).toEqual(["_id_", "class_id_1_title_1"]);

    const [composto] = (await Mission.collection.indexes()).filter((index) => index.name === "class_id_1_title_1");
    expect(composto).toMatchObject({
      key: { class_id: 1, title: 1 },
      unique: true,
      collation: expect.objectContaining({ locale: "pt", strength: 2 }),
    });
  });

  it("deve ser idempotente", async() => {
    await migrateMissionTitleIndex();

    const segunda = await migrateMissionTitleIndex();

    expect(segunda).toEqual({ duplicates: [], droppedLegacyIndex: false, createdIndex: false });
    expect(await indices()).toEqual(["_id_", "class_id_1_title_1"]);
  });

  it("deve funcionar num banco ainda sem a coleção de missões", async() => {
    await Mission.collection.drop();

    const resultado = await migrateMissionTitleIndex();

    expect(resultado).toEqual({ duplicates: [], droppedLegacyIndex: false, createdIndex: true });
    expect(await indices()).toEqual(["_id_", "class_id_1_title_1"]);
  });

  it("deve abortar sem mexer nos índices quando a turma tiver título repetido sem diferenciar maiúsculas", async() => {
    // O title_1 diferencia maiúsculas, então essa duplicata passou por ele.
    await inserir(["Lesson 1", TURMA_A], ["lesson 1", TURMA_A], ["Lesson 2", TURMA_A]);

    const resultado = await migrateMissionTitleIndex();

    expect(resultado.droppedLegacyIndex).toBe(false);
    expect(resultado.createdIndex).toBe(false);
    expect(resultado.duplicates).toEqual([
      { class_id: TURMA_A, titles: ["Lesson 1", "lesson 1"], ids: [expect.any(mongoose.Types.ObjectId), expect.any(mongoose.Types.ObjectId)] },
    ]);
    expect(await indices()).toEqual(["_id_", "title_1"]);
  });

  it("não deve tratar como duplicata o mesmo título em turmas diferentes", async() => {
    await Mission.collection.dropIndex("title_1");
    await inserir(["Lesson 1", TURMA_A], ["Lesson 1", TURMA_B]);

    const resultado = await migrateMissionTitleIndex();

    expect(resultado).toEqual({ duplicates: [], droppedLegacyIndex: false, createdIndex: true });
  });

  it("deve fazer o índice novo barrar o título repetido na turma e liberar em outra turma", async() => {
    await migrateMissionTitleIndex();
    await inserir(["Lesson 1", TURMA_A]);

    await expect(inserir(["LESSON 1", TURMA_A])).rejects.toMatchObject({ code: 11000 });
    await expect(inserir(["Lesson 1", TURMA_B])).resolves.toBeDefined();
  });
});
