import UserRepository from "../repository/UserRepository.js";
import { CustomError, HttpStatusCodes, messages } from "../utils/helpers/index.js";

const repository = new UserRepository();

const authorize = (...roles) => async(req, res, next) => {
  try {
    const user = await repository.findById(req.user_id);

    if (!user.active) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "User",
        details: [],
        customMessage: messages.auth.accountLocked,
      });
    }

    if (!roles.includes(user.role)) {
      throw new CustomError({
        statusCode: HttpStatusCodes.FORBIDDEN.code,
        errorType: "permissionError",
        field: "Permissão",
        details: [],
        customMessage: messages.auth.invalidPermission,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authorize;
