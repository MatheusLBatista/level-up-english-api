import "dotenv/config";
import DbConnect from "../config/dbConnect.js";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import Attitude from "../models/Attitude.js";
import User from "../models/User.js";

await DbConnect.conectar();

async function attitudeSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping("Attitude");

  const users = await User.find({ role: "admin", active: true }).select("_id");
  if (!users.length) {
    throw new Error(
      "Nenhum usuário ativo encontrado para preencher o campo createdBy.",
    );
  }

  const pickAuthorId = (index) => users[index % users.length]._id;

  await Attitude.deleteMany();

  const attitudes = [];

  attitudes.push({
    name: "Default Attitude",
    description: "This is a default attitude.",
    xp_value: 100,
    type: "positive",
    active: true,
    createdBy: pickAuthorId(0),
  });

  for (let i = 0; i < 10; i++) {
    attitudes.push({
      name: globalFakeMapping.name(),
      description: globalFakeMapping.description(),
      xp_value: globalFakeMapping.xp_value(),
      type: globalFakeMapping.type(),
      active: globalFakeMapping.active(),
      createdBy: pickAuthorId(i + 1),
    });
  }

  const result = await Attitude.collection.insertMany(attitudes);
  console.log(
    `${Object.keys(result.insertedIds).length} attitudes inserted successfully!`,
  );

  return Attitude.find();
}

export default attitudeSeeds;
