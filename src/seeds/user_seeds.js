import "dotenv/config";
import bcrypt from "bcrypt";
import getGlobalFakeMapping from "./globalFakeMapping.js";
import User from "../models/User.js";

export function generateHashPassword(defaultPassword) {
  return bcrypt.hashSync(defaultPassword, 8);
}

const defaultPassword = "Senha@123";
const hashPassword = generateHashPassword(defaultPassword);

async function userSeeds() {
  const globalFakeMapping = await getGlobalFakeMapping("User");

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
      active: true,
    });
  }

  //students
  for (let i = 0; i < 40; i++) {
    const active = globalFakeMapping.active();
    const consentPending = i % 8 === 7;

    users.push({
      name: `Student ${i + 1}`,
      email: `student${i + 1}@example.com`,
      password: hashPassword,
      role: "student",
      xp: globalFakeMapping.xp(),
      level: globalFakeMapping.level(),
      mission_progress: globalFakeMapping.mission_progress(),
      // badges (RF-009) fica no default do model: lista vazia.
      active,
      deactivated_at: active ? null : new Date(),
      anonymized_at: null,
      guardian_consent_at: consentPending ? null : new Date(),
      guardian_consent_recorded_by: null,
      guardian_consent_revoked_at: null,
    });
  }

  const result = await User.collection.insertMany(users);

  const admin = await User.findOne({ role: "admin" });
  await User.updateMany(
    { role: "student", guardian_consent_at: { $ne: null } },
    { $set: { guardian_consent_recorded_by: admin._id } },
  );
  console.log(
    `${Object.keys(result.insertedIds).length} users inserted successfully!`,
  );

  return User.find();
}

export default userSeeds;
