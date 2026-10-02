import mongoose from "mongoose";
import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

class ClassService {
  constructor() {
    this.repository = new ClassRepository();
    this.userRepository = new UserRepository();
  }

  async list(req) {
    const id = req?.params?.id;
    const loggedUser = await this.userRepository.findById(req.user_id);
    const isStudent = loggedUser.role === "student";

    if (id) {
      if (isStudent && String(loggedUser.class) !== String(id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "Class",
          details: [],
          customMessage: "Você só pode ver a sua turma.",
        });
      }

      return await this.repository.findById(id);
    }

    if (isStudent) {
      if (!loggedUser.class) {
        return { docs: [], totalDocs: 0, page: 1, totalPages: 0 };
      }

      // id vai por último: o aluno não consegue forçar outra turma via querystring.
      return await this.repository.list({
        query: { ...req.query, id: String(loggedUser.class) },
      });
    }

    return await this.repository.list(req);
  }

  async create(parsedData, req) {
    await this.ensureNameAvailable(parsedData.name);

    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role === "teacher") {
      parsedData.teacher = req.user_id;
    } else if (parsedData.teacher) {
      await this.ensureActiveTeacher(parsedData.teacher);
    }

    if (parsedData.students) {
      parsedData.students = await this.ensureStudents(parsedData.students);
    }

    const created = await this.repository.create(parsedData);

    if (parsedData.students) {
      await this.syncStudents(created._id, [], parsedData.students);
    }

    return created;
  }

  async update(id, parsedData, req) {
    const existingClass = await this.ensureClassExists(id);

    const loggedUser = await this.userRepository.findById(req.user_id);

    if (loggedUser.role === "teacher") {
      const ownerId = existingClass.teacher?._id ?? existingClass.teacher;

      if (String(ownerId) !== String(req.user_id)) {
        throw new CustomError({
          statusCode: HttpStatusCodes.FORBIDDEN.code,
          errorType: "permissionError",
          field: "Class",
          details: [],
          customMessage: "Você só pode editar as suas turmas.",
        });
      }

      delete parsedData.teacher;
    } else if (parsedData.teacher) {
      await this.ensureActiveTeacher(parsedData.teacher);
    }

    if (parsedData.name) {
      await this.ensureNameAvailable(parsedData.name, id);
    }

    if (parsedData.students) {
      parsedData.students = await this.ensureStudents(parsedData.students);
    }

    const updated = await this.repository.update(id, parsedData);

    if (parsedData.students) {
      const currentIds = existingClass.students.map((student) => student?._id ?? student);
      await this.syncStudents(id, currentIds, parsedData.students);
    }

    return updated;
  }

  async delete(id, req) {
    await this.ensureClassExists(id);

    await this.repository.delete(id);

    return null;
  }

  async ensureStudents(studentIds) {
    const uniqueIds = [...new Set(studentIds.map(String))];

    const allValid = uniqueIds.every((studentId) => mongoose.isValidObjectId(studentId));
    const users = allValid ? await this.userRepository.findByIds(uniqueIds) : [];
    const students = users.filter((user) => user.role === "student");

    if (students.length !== uniqueIds.length) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "students",
        details: [{ path: "students", message: "Todos os ids devem ser de alunos cadastrados." }],
        customMessage: "Todos os ids devem ser de alunos cadastrados.",
      });
    }

    return uniqueIds;
  }

  async syncStudents(classId, currentIds, newIds) {
    const current = currentIds.map(String);
    const added = newIds.filter((studentId) => !current.includes(studentId));
    const removed = current.filter((studentId) => !newIds.includes(studentId));

    if (added.length) {
      await this.repository.removeStudentsFromOtherClasses(added, classId);
      await this.userRepository.setClass(added, classId);
    }

    if (removed.length) {
      await this.userRepository.clearClass(removed, classId);
    }
  }

  async ensureNameAvailable(name, id = null) {
    const existingClass = await this.repository.findByName(name, id);

    if (existingClass) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "name",
        details: [{ path: "name", message: "Já existe uma turma com este nome." }],
        customMessage: "Já existe uma turma com este nome.",
      });
    }
  }

  async ensureActiveTeacher(teacherId) {
    const [teacher] = mongoose.isValidObjectId(teacherId)
      ? await this.userRepository.findByIds([teacherId])
      : [];

    if (!teacher || teacher.role !== "teacher" || !teacher.active) {
      throw new CustomError({
        statusCode: HttpStatusCodes.BAD_REQUEST.code,
        errorType: "validationError",
        field: "teacher",
        details: [{ path: "teacher", message: "Escolha um professor ativo." }],
        customMessage: "Escolha um professor ativo.",
      });
    }
  }

  async ensureClassExists(id) {
    return await this.repository.findById(id);
  }
}

export default ClassService;
