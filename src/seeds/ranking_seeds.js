import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import Ranking from "../models/Ranking.js";
import User from "../models/User.js";
import Class from "../models/Class.js";

await DbConnect.conectar();

async function rankingSeeds() {
  await Ranking.deleteMany();

  const users = await User.find({ active: true }).select("_id xp level class");
  if (!users.length) {
    throw new Error("Nenhum usuário ativo encontrado para montar o ranking.");
  }

  const rankings = [];

  const globalEntries = users
    .map((user) => ({
      user: user._id,
      xp: user.xp || 0,
      level: user.level || 1,
    }))
    .sort((a, b) => b.xp - a.xp || b.level - a.level)
    .slice(0, 30);

  rankings.push({
    type: "global",
    entries: globalEntries,
  });

  const classes = await Class.find({ active: true }).select("_id students");

  for (const turma of classes) {
    const studentIds = (turma.students || []).map((studentId) =>
      String(studentId),
    );

    const classUsers = users.filter((user) =>
      studentIds.includes(String(user._id)),
    );

    const classEntries = classUsers
      .map((user) => ({
        user: user._id,
        xp: user.xp || 0,
        level: user.level || 1,
      }))
      .sort((a, b) => b.xp - a.xp || b.level - a.level)
      .slice(0, 30);

    rankings.push({
      type: "class",
      class: turma._id,
      entries: classEntries,
    });
  }

  const result = await Ranking.collection.insertMany(rankings);
  console.log(
    `${Object.keys(result.insertedIds).length} rankings inserted successfully!`,
  );

  return Ranking.find();
}

export default rankingSeeds;
