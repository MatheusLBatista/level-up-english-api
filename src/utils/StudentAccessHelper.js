import mongoose from "mongoose";
import { ensureTeacherOwnsClass } from "./ClassOwnershipHelper.js";
import { CustomError, HttpStatusCodes } from "./helpers/index.js";

export async function findAccessibleStudent({ userRepository, classRepository }, studentId, loggedUser, messages) {
  if (loggedUser.role === "student") {
    if (String(studentId) !== String(loggedUser._id)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "student",
        details: [],
        customMessage: messages.ownOnly,
      });
    }

    return loggedUser;
  }

  const [student] = mongoose.isValidObjectId(studentId)
    ? await userRepository.findByIds([studentId])
    : [];

  if (!student || student.role !== "student") {
    throw new CustomError({
      statusCode: HttpStatusCodes.NOT_FOUND.code,
      errorType: "resourceNotFound",
      field: "student",
      details: [],
      customMessage: "Aluno não encontrado.",
    });
  }

  if (loggedUser.role === "teacher") {
    const classDoc = student.class ? await classRepository.findPlainById(student.class) : null;

    ensureTeacherOwnsClass(classDoc, loggedUser, messages.teacherOnly);
  }

  return student;
}
