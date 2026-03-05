// for zod validation of the input

import { z } from "zod";

export const studentSignupSchema = z.object({
  fullName: z.string().min(5),
  username: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(8),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});