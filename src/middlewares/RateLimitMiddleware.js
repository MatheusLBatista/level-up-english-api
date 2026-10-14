import { rateLimit, ipKeyGenerator, MINUTE, HOUR } from "express-rate-limit";
import { CommonResponse, HttpStatusCodes } from "../utils/helpers/index.js";

// Em teste as instâncias da rota têm limite alto, para a suíte, que faz muitos
// logins seguidos, não esbarrar nele; o middleware continua na rota. Os testes
// do limite montam o limitador pelas fábricas, com limite baixo.
const testLimit = process.env.NODE_ENV === "test" ? { limit: 10000 } : {};

const emailOf = (req) => {
  const email = req.body?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

// IP + e-mail: num laboratório os alunos saem pelo mesmo IP, e um aluno errando
// a senha não pode bloquear a turma inteira.
const ipAndEmailKey = (req) => {
  const ip = ipKeyGenerator(req.ip);
  const email = emailOf(req);
  return email ? `${ip}:${email}` : ip;
};

const createLimiter = ({ limit, windowMs, message, ...options }) =>
  rateLimit({
    limit,
    windowMs,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) =>
      CommonResponse.error(res, HttpStatusCodes.TOO_MANY_REQUESTS.code, "tooManyRequests", null, [], message),
    ...options,
  });

const LOGIN_MESSAGE = "Muitas tentativas de login. Tente de novo em 15 minutos.";

export const createLoginLimiter = ({ limit = 10, windowMs = 15 * MINUTE } = {}) =>
  createLimiter({
    limit,
    windowMs,
    message: LOGIN_MESSAGE,
    keyGenerator: ipAndEmailKey,
    skipSuccessfulRequests: true,
  });

export const createLoginIpLimiter = ({ limit = 100, windowMs = 15 * MINUTE } = {}) =>
  createLimiter({
    limit,
    windowMs,
    message: LOGIN_MESSAGE,
    skipSuccessfulRequests: true,
  });

export const createForgotPasswordLimiter = ({ limit = 5, windowMs = HOUR } = {}) =>
  createLimiter({
    limit,
    windowMs,
    message: "Muitos pedidos de recuperação. Tente de novo em 1 hora.",
    keyGenerator: ipAndEmailKey,
  });

export const createResetPasswordLimiter = ({ limit = 10, windowMs = 15 * MINUTE } = {}) =>
  createLimiter({
    limit,
    windowMs,
    message: "Muitas tentativas. Tente de novo em 15 minutos.",
    skipSuccessfulRequests: true,
  });

// O limite por IP + e-mail vem antes: o 429 dele encerra a requisição e não
// gasta a cota do IP, que é dividida pelo laboratório inteiro.
export const loginLimiters = [createLoginLimiter(testLimit), createLoginIpLimiter(testLimit)];
export const forgotPasswordLimiter = createForgotPasswordLimiter(testLimit);
export const resetPasswordLimiter = createResetPasswordLimiter(testLimit);
