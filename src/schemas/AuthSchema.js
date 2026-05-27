import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { UserSchema } from "./UserSchema.js";

extendZodWithOpenApi(z);

export const LoginBodySchema = z
  .object({
    email: z.string().email().openapi({ example: "teacher@example.com" }),
    password: z.string().min(6).openapi({ example: "senha123" }),
  })
  .openapi("LoginBody");

export const LoginResponseSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    user: UserSchema,
  })
  .openapi("LoginResponse");

export const RevokeParamsSchema = z
  .object({
    userId: z.string().openapi({ example: "507f1f77bcf86cd799439011" }),
  })
  .openapi("RevokeParams");

export const RefreshBodySchema = z
  .object({
    refreshToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
  })
  .openapi("RefreshBody");

export const RefreshResponseSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
  })
  .openapi("RefreshResponse");
