import "dotenv/config";
import bcrypt from "bcryptjs";
import DbConnect from "../config/dbConnect.js";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import User from "../models/User.js";

await DbConnect.conectar();

export function generateHashPassword(defaultPassword) {
  return bcrypt.hashSync(defaultPassword, 8);
}

const defaultPassword = "Senha@123";
const hashPassword = generateHashPassword(defaultPassword);

async function userSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping();

  await User.deleteMany();

  const users = [];

  // admin
  users.push({
    name: "Admin User",
    email: "admin@example.com",
    password: hashPassword,
    role: "admin",
    active: true,
  });

  // teachers
  for (let i = 0; i < 5; i++) {
    users.push({
      name: `Teacher ${i + 1}`,
      email: `teacher${i + 1}@example.com`,
      password: hashPassword,
      role: "teacher",
      active: true
    });
  }

  //students
  for (let i = 0; i < 10; i++) {
    users.push({
      name: `Student ${i + 1}`,
      email: `student${i + 1}@example.com`,
      password: hashPassword,
      role: "student",
      xp: globalFakeMapping.xp(),
      level: globalFakeMapping.level(),
      class: globalFakeMapping.class(),
      mission_progress: globalFakeMapping.mission_progress(),
      streak: globalFakeMapping.streak(),
      badges: globalFakeMapping.badges(),
      active: globalFakeMapping.active(),
    });
  }

  const result = await User.collection.insertMany(users);
  console.log(
    `${Object.keys(result.insertedIds).length} users inserted successfully!`,
  );

  return User.find();
}

export default userSeeds;
