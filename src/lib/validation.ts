import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" });

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Full name must be at least 2 characters" })
  .max(100, { message: "Full name must be less than 100 characters" });
