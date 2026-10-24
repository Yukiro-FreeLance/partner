import { z } from "zod";

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Add your name.").max(40, "Use 40 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/[0-9]/, "Include a number."),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms and privacy policy." }) }),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const resetSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/[0-9]/, "Include a number."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export const coupleSchema = z.object({
  name: z.string().trim().min(2, "Give your space a name.").max(60),
  nickname: z.string().trim().max(40).optional(),
});

export const memorySchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().max(2000).optional(),
  kind: z.enum(["milestone", "trip", "moment", "plan", "note"]),
  occurredOn: z.string().optional(),
  visibility: z.enum(["shared", "private"]),
  remindOn: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(2000),
});
