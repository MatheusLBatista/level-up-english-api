import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import DbConnect from "../config/dbConnect.js";
import User from "../models/User.js";
import Class from "../models/Class.js";
import Mission from "../models/Mission.js";
import Attitude from "../models/Attitude.js";
import AttitudeLog from "../models/AttitudeLog.js";
import XpAdjustment from "../models/XpAdjustment.js";
import Ranking from "../models/Ranking.js";
import MissionService from "../service/MissionService.js";
import AttitudeLogService from "../service/AttitudeLogService.js";
import XpAdjustmentService from "../service/XpAdjustmentService.js";
import RankingService from "../service/RankingService.js";
import { CreateMissionBodySchema, SubmitMissionProgressBodySchema } from "../schemas/MissionSchema.js";
import { CreateAttitudeBodySchema } from "../schemas/AttitudeSchema.js";
import { CreateAttitudeLogBodySchema } from "../schemas/AttitudeLogSchema.js";
import { CreateXpAdjustmentBodySchema } from "../schemas/XpAdjustmentSchema.js";
import { calculateLevel, xpForLevel } from "../utils/LevelHelper.js";
import * as demo from "./demo/demoData.js";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date(`${demo.SEMESTER_START}T00:00:00-03:00`);
const NOW = new Date(demo.NOW);

const createRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const random = createRandom(2026);
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];

const atDay = (day, hour, minute = 0) => new Date(START.getTime() + day * DAY + (hour * 60 + minute) * 60 * 1000);
const dayOf = (date) => Math.floor((date.getTime() - START.getTime()) / DAY);
const parseDate = (value) => new Date(value.includes("T") ? value : `${value}T07:00:00-03:00`);
const weekdayOf = (day) => new Date(START.getTime() + day * DAY - 3 * 60 * 60 * 1000).getUTCDay();

const emailFor = (name) => {
  const parts = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(" ");
  return `${parts[0]}.${parts[parts.length - 1]}@${demo.EMAIL_DOMAIN}`;
};

const answersFor = (questions, accuracy) => questions.map(({ correct_answer }) => {
  if (random() < accuracy) return correct_answer;
  return pick(["a", "b", "c", "d"].filter((option) => option !== correct_answer));
});

async function ensureDevelopmentDatabase() {
  const { databaseName } = mongoose.connection.db;

  if (process.env.NODE_ENV === "production" || databaseName.includes("prod")) {
    throw new Error(`O seed de demonstração apaga dados e não roda em produção (banco "${databaseName}").`);
  }

  console.log(`Banco: ${databaseName}`);
}

async function clearDatabase() {
  for (const model of [User, Class, Mission, Attitude, AttitudeLog, XpAdjustment, Ranking]) {
    await model.deleteMany();
  }
}

async function seedPeople() {
  const password = await bcrypt.hash(demo.DEFAULT_PASSWORD, 10);
  const staffCreatedAt = atDay(-7, 9);

  const staff = [
    { ...demo.admin, role: "admin" },
    ...demo.teachers.map(({ name, email }) => ({ name, email, role: "teacher" })),
  ].map((person) => ({ ...person, password, active: true, createdAt: staffCreatedAt, updatedAt: staffCreatedAt }));

  const students = demo.classes.flatMap((classDef) => classDef.students.map((student) => {
    const createdAt = student.joinedAt ? parseDate(student.joinedAt) : atDay(-3, 10);

    return {
      name: student.name,
      email: emailFor(student.name),
      password,
      role: "student",
      xp: 0,
      level: 1,
      mission_progress: [],
      active: true,
      createdAt,
      updatedAt: createdAt,
    };
  }));

  const emails = [...staff, ...students].map(({ email }) => email);
  if (new Set(emails).size !== emails.length) throw new Error("Há e-mails repetidos nos dados da demonstração.");

  await User.collection.insertMany([...staff, ...students]);

  const byEmail = new Map((await User.find()).map((user) => [user.email, user]));
  return {
    admin: byEmail.get(demo.admin.email),
    teachers: new Map(demo.teachers.map(({ key, email }) => [key, byEmail.get(email)])),
    students: byEmail,
  };
}

async function seedClasses(people) {
  const createdAt = atDay(-4, 9);
  const classes = new Map();

  for (const classDef of demo.classes) {
    const studentIds = classDef.students.map(({ name }) => people.students.get(emailFor(name))._id);

    const { insertedId } = await Class.collection.insertOne({
      name: classDef.name,
      active: true,
      teacher: people.teachers.get(classDef.teacher)._id,
      students: studentIds,
      missions: [],
      createdAt,
      updatedAt: createdAt,
    });

    await User.updateMany({ _id: { $in: studentIds } }, { $set: { class: insertedId } });
    classes.set(classDef.key, insertedId);
  }

  return classes;
}

async function seedMissions(people, classes) {
  const service = new MissionService();
  const missions = new Map();

  for (const classDef of demo.classes) {
    const teacher = people.teachers.get(classDef.teacher);
    const released = [];

    for (const [index, missionDef] of demo.missions[classDef.key].entries()) {
      const body = CreateMissionBodySchema.parse({ ...missionDef, class_id: String(classes.get(classDef.key)) });
      const mission = await service.create(body, { user_id: String(teacher._id) });

      const releasedAt = atDay(demo.missionReleaseDays[index], 7, 30);
      await Mission.collection.updateOne({ _id: mission._id }, { $set: { createdAt: releasedAt, updatedAt: releasedAt } });

      released.push({ mission, releasedAt, isLast: index === demo.missionReleaseDays.length - 1 });
    }

    missions.set(classDef.key, released);
  }

  return missions;
}

async function seedAttitudes(people) {
  const createdAt = atDay(-4, 10);

  const attitudes = demo.attitudes.map(({ active = true, ...attitude }) => ({
    ...CreateAttitudeBodySchema.parse(attitude),
    active,
    createdBy: people.admin._id,
    createdAt,
    updatedAt: createdAt,
  }));

  await Attitude.collection.insertMany(attitudes);

  const saved = await Attitude.find({ active: true });
  return {
    positive: saved.filter(({ type }) => type === "positive"),
    negative: saved.filter(({ type }) => type === "negative"),
  };
}

function planSemester(people, missions, attitudes) {
  const events = [];

  for (const classDef of demo.classes) {
    const teacher = people.teachers.get(classDef.teacher);
    const lessonHours = classDef.period === "manha" ? [7, 11] : [13, 17];

    for (const studentDef of classDef.students) {
      const student = people.students.get(emailFor(studentDef.name));
      const profile = demo.profiles[studentDef.profile];
      const joinedAt = studentDef.joinedAt ? parseDate(studentDef.joinedAt) : START;
      const leftAt = studentDef.deactivatedAt ? parseDate(studentDef.deactivatedAt) : NOW;
      const isActiveOn = (date) => date >= joinedAt && date < leftAt && date < NOW;

      for (const { mission, releasedAt, isLast } of missions.get(classDef.key)) {
        const chance = isLast ? profile.completion * 0.6 : profile.completion;
        if (random() >= chance) continue;

        const availableDay = dayOf(releasedAt > joinedAt ? releasedAt : joinedAt);
        const submittedAt = atDay(availableDay + between(...profile.delay), between(14, 22), between(0, 59));
        if (!isActiveOn(submittedAt)) continue;

        const answers = answersFor(mission.questions, profile.accuracy);
        events.push({ date: submittedAt, kind: "mission", student, mission, answers });

        const missed = answers.some((answer, index) => answer !== mission.questions[index].correct_answer);
        if (mission.type === "quiz" && missed && random() < profile.retry) {
          const retriedAt = new Date(submittedAt.getTime() + between(1, 4) * DAY);
          if (isActiveOn(retriedAt)) {
            const retryAnswers = answersFor(mission.questions, Math.min(profile.accuracy + 0.2, 1));
            events.push({ date: retriedAt, kind: "mission", student, mission, answers: retryAnswers });
          }
        }
      }

      const lessonDays = [];
      for (let day = dayOf(joinedAt); day <= dayOf(NOW); day++) {
        if (classDef.weekdays.includes(weekdayOf(day))) lessonDays.push(day);
      }

      const addAttitudes = (count, pool) => {
        for (let i = 0; i < count && lessonDays.length; i++) {
          const appliedAt = atDay(pick(lessonDays), between(...lessonHours), between(0, 59));
          if (isActiveOn(appliedAt)) events.push({ date: appliedAt, kind: "attitude", student, teacher, attitude: pick(pool) });
        }
      };
      addAttitudes(profile.positives, attitudes.positive);
      addAttitudes(profile.negatives, attitudes.negative);

      for (const key of ["olympiad", "fair"]) {
        const adjustment = demo.adjustments[key];
        if (studentDef[key] && isActiveOn(new Date(adjustment.date))) {
          events.push({ date: new Date(adjustment.date), kind: "adjustment", student, teacher, amount: adjustment.amount, reason: adjustment.reason });
        }
      }

      if (studentDef.fallsLevel) {
        const { date, reason } = demo.adjustments.fallsLevel;
        events.push({ date: new Date(date), kind: "adjustment", student, teacher, dropOneLevel: true, reason });
      }

      if (studentDef.deactivatedAt) {
        events.push({ date: leftAt, kind: "deactivate", student });
      }
    }
  }

  return events.sort((a, b) => a.date - b.date);
}

async function backdate(model, id, date) {
  await model.collection.updateOne({ _id: id }, { $set: { applied_at: date, createdAt: date, updatedAt: date } });
}

async function runSemester(events) {
  const missionService = new MissionService();
  const attitudeLogService = new AttitudeLogService();
  const xpAdjustmentService = new XpAdjustmentService();

  for (const [index, event] of events.entries()) {
    const studentId = String(event.student._id);

    if (event.kind === "mission") {
      const body = SubmitMissionProgressBodySchema.parse({ answers: event.answers, done: true });
      const result = await missionService.submitProgress(String(event.mission._id), body, { user_id: studentId });

      if (result.xp_earned > 0 && !result.already_rewarded) {
        await User.collection.updateOne(
          { _id: event.student._id, "mission_progress.mission_id": event.mission._id },
          { $set: { "mission_progress.$.completed_at": event.date } },
        );
      }
    }

    if (event.kind === "attitude") {
      const body = CreateAttitudeLogBodySchema.parse({ student: studentId, attitude: String(event.attitude._id) });
      const log = await attitudeLogService.create(body, { user_id: String(event.teacher._id) });
      await backdate(AttitudeLog, log._id, event.date);
    }

    if (event.kind === "adjustment") {
      let { amount } = event;

      if (event.dropOneLevel) {
        const { xp } = await User.findById(studentId).select("xp");
        const level = calculateLevel(xp);
        if (level === 1) continue;
        amount = xpForLevel(level) - 25 - xp;
      }

      const body = CreateXpAdjustmentBodySchema.parse({ student: studentId, amount, reason: event.reason });
      const adjustment = await xpAdjustmentService.create(body, { user_id: String(event.teacher._id) });
      await backdate(XpAdjustment, adjustment._id, event.date);
    }

    if (event.kind === "deactivate") {
      await User.collection.updateOne({ _id: event.student._id }, { $set: { active: false, updatedAt: event.date } });
    }

    if ((index + 1) % 25 === 0 || index === events.length - 1) {
      console.log(`  ${index + 1}/${events.length} eventos`);
    }
  }
}

async function printSummary() {
  const students = await User.find({ role: "student" }).populate("class", "name").sort({ xp: -1 });

  console.log("\nAlunos (XP · nível · missões concluídas):");
  for (const student of students) {
    const done = student.mission_progress.filter(({ done }) => done).length;
    const status = student.active ? "" : " (desativado)";
    console.log(`  ${String(student.xp).padStart(5)} XP · nível ${student.level} · ${done} missões · ${student.name} — ${student.class?.name}${status}`);
  }

  console.log(`\nLogin: qualquer e-mail @${demo.EMAIL_DOMAIN} com a senha ${demo.DEFAULT_PASSWORD}`);
  console.log(`  admin:       ${demo.admin.email}`);
  demo.teachers.forEach(({ name, email }) => console.log(`  professor(a): ${email} (${name})`));
}

async function main() {
  try {
    await DbConnect.conectar();
    await ensureDevelopmentDatabase();

    console.log("Apagando os dados da API...");
    await clearDatabase();

    console.log("Cadastrando pessoas, turmas, missões e atitudes...");
    const people = await seedPeople();
    const classes = await seedClasses(people);
    const missions = await seedMissions(people, classes);
    const attitudes = await seedAttitudes(people);

    const events = planSemester(people, missions, attitudes);
    console.log(`Simulando o semestre pelos services (${events.length} eventos)...`);
    await runSemester(events);

    await new RankingService().refreshFromUsers();

    await printSummary();
    console.log("\n>>> SEED DE DEMONSTRAÇÃO CONCLUÍDO! <<<");
  } catch (err) {
    console.error("Erro ao executar o seed de demonstração:", err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(process.exitCode || 0);
  }
}

main();
