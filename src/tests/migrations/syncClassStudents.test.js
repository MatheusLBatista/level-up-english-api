import mongoose from "mongoose";
import syncClassStudents from "../../migrations/syncClassStudents.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("syncClassStudents", () => {
  beforeAll(async() => {
    await connectTestDatabase();
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  beforeEach(async() => {
    await clearTestDatabase();
  });

  const criarAluno = async(email, dados = {}) =>
    await User.create({ name: email, email, role: "student", ...dados });

  const alunosDe = async(turma) =>
    (await Class.findById(turma._id)).students.map(String).sort();

  it("deve reconstruir Class.students a partir de User.class", async() => {
    const turmaA = await Class.create({ name: "Turma A" });
    const turmaB = await Class.create({ name: "Turma B" });

    const ana = await criarAluno("ana@escola.com", { class: turmaA._id });
    const bia = await criarAluno("bia@escola.com", { class: turmaA._id });
    const caio = await criarAluno("caio@escola.com", { class: turmaB._id });
    const semTurma = await criarAluno("sem@escola.com");

    // divergências: falta a bia na A, o caio está na A em vez da B, e o
    // aluno sem turma aparece na B
    await Class.findByIdAndUpdate(turmaA._id, { students: [ana._id, caio._id] });
    await Class.findByIdAndUpdate(turmaB._id, { students: [semTurma._id] });

    const resultado = await syncClassStudents();

    expect(resultado).toEqual({ changedClasses: 2, orphanStudents: 0 });
    expect(await alunosDe(turmaA)).toEqual([String(ana._id), String(bia._id)].sort());
    expect(await alunosDe(turmaB)).toEqual([String(caio._id)]);
  });

  it("deve ser idempotente", async() => {
    const turma = await Class.create({ name: "Turma A" });
    const aluno = await criarAluno("ana@escola.com", { class: turma._id });

    expect((await syncClassStudents()).changedClasses).toBe(1);
    expect((await syncClassStudents()).changedClasses).toBe(0);
    expect(await alunosDe(turma)).toEqual([String(aluno._id)]);
  });

  it("não deve contar turma que já está certa, mesmo com outra ordem", async() => {
    const turma = await Class.create({ name: "Turma A" });
    const ana = await criarAluno("ana@escola.com", { class: turma._id });
    const bia = await criarAluno("bia@escola.com", { class: turma._id });
    await Class.findByIdAndUpdate(turma._id, { students: [bia._id, ana._id] });

    expect((await syncClassStudents()).changedClasses).toBe(0);
  });

  it("deve remover ids repetidos do array", async() => {
    const turma = await Class.create({ name: "Turma A" });
    const ana = await criarAluno("ana@escola.com", { class: turma._id });
    await Class.findByIdAndUpdate(turma._id, { students: [ana._id, ana._id] });

    expect((await syncClassStudents()).changedClasses).toBe(1);
    expect(await alunosDe(turma)).toEqual([String(ana._id)]);
  });

  it("deve ignorar quem não é aluno", async() => {
    const turma = await Class.create({ name: "Turma A" });
    await User.create({ name: "Prof", email: "prof@escola.com", role: "teacher", class: turma._id });

    expect((await syncClassStudents()).changedClasses).toBe(0);
    expect(await alunosDe(turma)).toEqual([]);
  });

  it("deve contar sem alterar os alunos que apontam para turma inexistente", async() => {
    const turmaApagada = new mongoose.Types.ObjectId();
    const aluno = await criarAluno("ana@escola.com", { class: turmaApagada });

    const resultado = await syncClassStudents();

    expect(resultado).toEqual({ changedClasses: 0, orphanStudents: 1 });
    expect(String((await User.findById(aluno._id)).class)).toBe(String(turmaApagada));
  });
});
