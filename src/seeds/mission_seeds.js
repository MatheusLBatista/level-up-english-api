import "dotenv/config";
import bcrypt from "bcryptjs";
import DbConnect from "../config/dbConnect.js";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import Mission from "../models/Mission.js";

await DbConnect.conectar();

async function missionSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping();

  await Mission.deleteMany();

  const missions = [];

  missions.push({
    title: "Default Mission",
    description: "This is a default mission.",
    thumbnail: "teste.png",
    type: "video",
    content_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    xp_reward: 100,
    max_score: 100,
  });

  for (let i = 0; i < 10; i++) {
    missions.push({
      title: globalFakeMapping.title(),
      description: globalFakeMapping.description(),
      thumbnail: globalFakeMapping.thumbnail(),
      type: globalFakeMapping.type(),
      content_url: globalFakeMapping.content_url(),
      xp_reward: globalFakeMapping.xp_reward(),
      max_score: globalFakeMapping.max_score(),
    });
  }

  const result = await Mission.collection.insertMany(missions);
  console.log(
    `${Object.keys(result.insertedIds).length} missions inserted successfully!`,
  );

  return Mission.find();
}

export default missionSeeds;