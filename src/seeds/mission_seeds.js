import "dotenv/config";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import Mission from "../models/Mission.js";
import Class from "../models/Class.js";
import User from "../models/User.js";

async function missionSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping("Mission");

  await Mission.deleteMany();

  const classes = await Class.find().select("_id");
  const teachers = await User.find({ role: { $in: ["teacher", "admin"] } }).select("_id");

  if (!classes.length) {
    throw new Error("Nenhuma turma encontrada. Execute o seed de classes primeiro.");
  }

  if (!teachers.length) {
    throw new Error("Nenhum teacher/admin encontrado. Execute o seed de users primeiro.");
  }

  const missions = [];

  missions.push({
    title: "Default Mission",
    description: "This is a default mission.",
    type: "vocabulary",
    content_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    xp_reward: 100,
    class_id: classes[0]._id,
    createdBy: teachers[0]._id,
    active: true,
  });

  for (let i = 0; i < 10; i++) {
    missions.push({
      title: globalFakeMapping.title(),
      description: globalFakeMapping.description(),
      type: globalFakeMapping.type(),
      content_url: globalFakeMapping.content_url(),
      xp_reward: globalFakeMapping.xp_reward(),
      class_id: classes[i % classes.length]._id,
      createdBy: teachers[i % teachers.length]._id,
      active: true,
    });
  }

  const result = await Mission.collection.insertMany(missions);
  console.log(
    `${Object.keys(result.insertedIds).length} missions inserted successfully!`,
  );

  const createdMissions = await Mission.find().select("_id class_id");
  for (const mission of createdMissions) {
    await Class.findByIdAndUpdate(mission.class_id, {
      $addToSet: { missions: mission._id },
    });
  }
  console.log("Classes updated with mission references.");

  return Mission.find();
}

export default missionSeeds;
