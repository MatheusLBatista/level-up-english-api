import multer from "multer";
import { CustomError, HttpStatusCodes } from "../utils/helpers/index.js";

export const AVATAR_FIELD = "avatar";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMETYPES = ["image/jpeg", "image/png", "image/webp"];

const avatarError = (statusCode, customMessage) =>
  new CustomError({ statusCode, errorType: "validationError", field: AVATAR_FIELD, customMessage });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) return cb(null, true);
    cb(avatarError(HttpStatusCodes.BAD_REQUEST.code, "A foto deve ser JPEG, PNG ou WebP."));
  },
}).single(AVATAR_FIELD);

const avatarUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(avatarError(HttpStatusCodes.PAYLOAD_TOO_LARGE.code, "A foto deve ter no máximo 2 MB."));
      }
      return next(avatarError(HttpStatusCodes.BAD_REQUEST.code, `Envie apenas um arquivo, no campo "${AVATAR_FIELD}".`));
    }
    if (err) return next(err);

    if (!req.file) {
      return next(avatarError(HttpStatusCodes.BAD_REQUEST.code, `Envie a foto no campo "${AVATAR_FIELD}".`));
    }

    next();
  });
};

export default avatarUpload;
