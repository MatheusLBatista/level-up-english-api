import dotenv from "dotenv";

dotenv.config();

process.env.NODE_ENV = "test";
process.env.DISABLED_EMAIL = "true";
process.env.LOG_ENABLED = "false";
process.env.JWT_SECRET_ACCESS_TOKEN = process.env.JWT_SECRET_ACCESS_TOKEN || "test-access-token-secret";
process.env.JWT_SECRET_REFRESH_TOKEN = process.env.JWT_SECRET_REFRESH_TOKEN || "test-refresh-token-secret";
process.env.JWT_SECRET_PASSWORD_RECOVERY = process.env.JWT_SECRET_PASSWORD_RECOVERY || "test-password-recovery-secret";
process.env.JWT_ACCESS_TOKEN_EXPIRATION = process.env.JWT_ACCESS_TOKEN_EXPIRATION || "1d";
process.env.JWT_REFRESH_TOKEN_EXPIRATION = process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5011";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => { });
  jest.spyOn(console, "log").mockImplementation(() => { });
});

afterAll(() => {
  if (console.error.mockRestore) {
    console.error.mockRestore();
  }
  if (console.log.mockRestore) {
    console.log.mockRestore();
  }
});
