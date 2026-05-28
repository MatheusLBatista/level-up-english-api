import "dotenv/config";
import Class from "../models/Class.js";
import User from "../models/User.js";

async function classSeeds() {
  await Class.deleteMany();

  const teachers = await User.find({ role: "teacher" }).select("_id");
  const students = await User.find({ role: "student" }).select("_id");

  if (!teachers.length) {
    throw new Error(
      "Nenhum teacher ativo encontrado para vincular nas classes.",
    );
  }

  if (!students.length) {
    throw new Error(
      "Nenhum student ativo encontrado para vincular nas classes.",
    );
  }

  const pickMany = (array, quantity) => {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(quantity, shuffled.length));
  };

  const classes = [];

  for (let i = 0; i < 10; i++) {
    const teacherId = teachers[i % teachers.length]._id;
    const selectedStudents = pickMany(students, 8).map(
      (student) => student._id,
    );

    classes.push({
      name: `Class ${i + 1}`,
      active: true,
      teacher: teacherId,
      students: selectedStudents,
      missions: [], // preenchido pelo seed de missions
    });
  }

  const result = await Class.collection.insertMany(classes);
  console.log(
    `${Object.keys(result.insertedIds).length} classes inserted successfully!`,
  );

  return Class.find();
}

export default classSeeds;
