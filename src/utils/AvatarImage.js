import sharp from "sharp";
import { CustomError, HttpStatusCodes } from "./helpers/index.js";

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_PIXELS = 25_000_000;

export const toAvatarWebp = async(buffer) => {
  try {
    return await sharp(buffer, { limitInputPixels: AVATAR_MAX_PIXELS })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new CustomError({
      statusCode: HttpStatusCodes.BAD_REQUEST.code,
      errorType: "validationError",
      field: "avatar",
      customMessage: "O arquivo enviado não é uma imagem válida ou é grande demais.",
    });
  }
};
