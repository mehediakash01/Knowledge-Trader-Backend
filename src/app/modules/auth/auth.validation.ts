import { z } from "zod";

const loginValidationSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

const googleLoginValidationSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Google token is required"),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  googleLoginValidationSchema,
};
