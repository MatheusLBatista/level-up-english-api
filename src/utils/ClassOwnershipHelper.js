import { CustomError, HttpStatusCodes } from "./helpers/index.js";

export function ensureTeacherOwnsClass(classDoc, loggedUser, customMessage, { requireActive = false } = {}) {
  const ownerId = classDoc?.teacher?._id ?? classDoc?.teacher;
  const ownsClass = ownerId && String(ownerId) === String(loggedUser._id);

  if (!ownsClass || (requireActive && !classDoc.active)) {
    throw new CustomError({
      statusCode: HttpStatusCodes.FORBIDDEN.code,
      errorType: "permissionError",
      field: "class",
      details: [],
      customMessage,
    });
  }
}

// Aluno cadastrado sem turma ficaria invisível para o professor, então a turma é obrigatória.
export async function ensureTeacherCanEnroll(classRepository, classId, loggedUser) {
  if (!classId) {
    const message = "Escolha uma das suas turmas.";

    throw new CustomError({
      statusCode: HttpStatusCodes.BAD_REQUEST.code,
      errorType: "validationError",
      field: "class",
      details: [{ path: "class", message }],
      customMessage: message,
    });
  }

  const classDoc = await classRepository.findPlainById(classId);

  ensureTeacherOwnsClass(classDoc, loggedUser, "Você só pode cadastrar alunos nas suas turmas.", { requireActive: true });
}
