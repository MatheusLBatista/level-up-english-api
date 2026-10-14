import Mission, { TITLE_PER_CLASS_INDEX } from "../models/Mission.js";

const LEGACY_INDEX = "title_1";
const COLLATION = { locale: "pt", strength: 2 };

const listIndexes = async(collection) => {
  try {
    return await collection.indexes();
  } catch (err) {
    // Banco sem nenhuma missão: a coleção ainda não existe.
    if (err.codeName === "NamespaceNotFound") return [];
    throw err;
  }
};

/**
 * Troca o índice único global do título (title_1) pelo único por turma.
 * Idempotente: rodar de novo não muda nada. Se já houver título repetido numa
 * turma, o índice novo não poderia ser criado; nesse caso devolve as
 * duplicatas e não mexe em nada.
 */
export default async function migrateMissionTitleIndex(collection = Mission.collection) {
  // O $group respeita a collation: agrupa os títulos do mesmo jeito que o índice compara.
  const duplicates = await collection
    .aggregate(
      [
        { $group: { _id: { class_id: "$class_id", title: "$title" }, titles: { $push: "$title" }, ids: { $push: "$_id" } } },
        { $match: { "ids.1": { $exists: true } } },
        { $project: { _id: 0, class_id: "$_id.class_id", titles: 1, ids: 1 } },
      ],
      { collation: COLLATION },
    )
    .toArray();

  if (duplicates.length) {
    return { duplicates, droppedLegacyIndex: false, createdIndex: false };
  }

  const names = (await listIndexes(collection)).map((index) => index.name);

  const droppedLegacyIndex = names.includes(LEGACY_INDEX);
  if (droppedLegacyIndex) {
    await collection.dropIndex(LEGACY_INDEX);
  }

  const createdIndex = !names.includes(TITLE_PER_CLASS_INDEX);
  if (createdIndex) {
    await collection.createIndex(
      { class_id: 1, title: 1 },
      { unique: true, name: TITLE_PER_CLASS_INDEX, collation: COLLATION },
    );
  }

  return { duplicates: [], droppedLegacyIndex, createdIndex };
}
