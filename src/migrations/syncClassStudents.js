import Class from "../models/Class.js";
import User from "../models/User.js";

const sameIds = (a, b) =>
  a.length === b.length && [...a].map(String).sort().join() === [...b].map(String).sort().join();

/**
 * Reconstrói Class.students a partir de User.class, que é a fonte de verdade.
 * Idempotente: rodar de novo sobre dados já corrigidos não muda nada.
 */
export default async function syncClassStudents() {
  const grouped = await User.aggregate([
    { $match: { role: "student", class: { $ne: null } } },
    { $group: { _id: "$class", students: { $push: "$_id" } } },
  ]);

  const expectedByClass = new Map(grouped.map(({ _id, students }) => [String(_id), students]));
  const classes = await Class.find({}, { students: 1 }).lean();

  const updates = classes
    .map(({ _id, students }) => ({ _id, current: students, expected: expectedByClass.get(String(_id)) ?? [] }))
    .filter(({ current, expected }) => !sameIds(current, expected))
    .map(({ _id, expected }) => ({
      updateOne: { filter: { _id }, update: { $set: { students: expected } } },
    }));

  if (updates.length) {
    await Class.bulkWrite(updates);
  }

  const existing = new Set(classes.map(({ _id }) => String(_id)));
  const orphanStudents = grouped
    .filter(({ _id }) => !existing.has(String(_id)))
    .reduce((total, { students }) => total + students.length, 0);

  return { changedClasses: updates.length, orphanStudents };
}
