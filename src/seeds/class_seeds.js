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

  const TOTAL_CLASSES = 10;

  // Cada aluno pertence a uma única turma (user.class é uma referência única),
  // então os alunos são distribuídos entre as turmas em vez de sorteados por turma.
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
  const classes = [];

  for (let i = 0; i < TOTAL_CLASSES; i++) {
    classes.push({
      name: `Class ${i + 1}`,
      active: true,
      teacher: teachers[i % teachers.length]._id,
      students: [],
      missions: [], // preenchido pelo seed de missions
    });
  }

  shuffledStudents.forEach((student, index) => {
    classes[index % TOTAL_CLASSES].students.push(student._id);
  });

  const result = await Class.collection.insertMany(classes);
  console.log(
    `${Object.keys(result.insertedIds).length} classes inserted successfully!`,
  );

  // Mantém user.class em sincronia com class.students — o seed de usuários gera
  // um ObjectId aleatório, o que deixaria os alunos sem turma real.
  const insertedIds = Object.values(result.insertedIds);

  for (let i = 0; i < insertedIds.length; i++) {
    await User.updateMany(
      { _id: { $in: classes[i].students } },
      { $set: { class: insertedIds[i] } },
    );
  }

  return Class.find();
}

export default classSeeds;
