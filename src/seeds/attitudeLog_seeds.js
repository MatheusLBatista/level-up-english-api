import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import AttitudeLog from "../models/AttitudeLog.js";
import User from "../models/User.js";
import Attitude from "../models/Attitude.js";

await DbConnect.conectar();

async function attitudeLogSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping("AttitudeLog");

  const teachers = await User.find({ role: "teacher", active: true }).select(
    "_id",
  );
  const students = await User.find({ role: "student", active: true }).select(
    "_id",
  );
  const attitudes = await Attitude.find({ active: true }).select(
    "_id xp_value type",
  );

  if (!teachers.length) {
    throw new Error(
      "Nenhum teacher ativo encontrado para criar attitude logs.",
    );
  }

  if (!students.length) {
    throw new Error(
      "Nenhum student ativo encontrado para criar attitude logs.",
    );
  }

  if (!attitudes.length) {
    throw new Error(
      "Nenhuma attitude ativa encontrada para criar attitude logs.",
    );
  }

  await AttitudeLog.deleteMany();

  const logs = [];
  const totalLogs = 30;

  for (let i = 0; i < totalLogs; i++) {
    const teacher = teachers[i % teachers.length]._id;
    const student = students[i % students.length]._id;
    const attitude = attitudes[i % attitudes.length];
    const baseXp =
      attitude.type === "negative"
        ? -Math.abs(attitude.xp_value)
        : Math.abs(attitude.xp_value);

    logs.push({
      student,
      attitude: attitude._id,
      teacher,
      xp_applied: baseXp || globalFakeMapping.xp_applied(),
      applied_at: globalFakeMapping.applied_at(),
    });
  }

  const result = await AttitudeLog.collection.insertMany(logs);
  console.log(
    `${Object.keys(result.insertedIds).length} attitude logs inserted successfully!`,
  );

  return AttitudeLog.find();
}

export default attitudeLogSeeds;
