import { z } from "zod";

const skillMatchValidationSchema = z.object({
  body: z.object({}).strict(),
});

const generateContentValidationSchema = z.object({
  body: z.object({
    prompt: z.string().min(1, "Prompt is required"),
  }),
});

const consultantValidationSchema = z.object({
  body: z.object({
    goal: z.string().optional(),
    trends: z.array(z.string().min(1)).optional(),
  }),
});

const generateSyllabusValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    roadmapType: z.enum(["DAILY", "HOURLY", "SEVEN_DAY", "THIRTY_DAY"]),
    category: z.string().optional(),
    shortDescription: z.string().optional(),
  }),
});

export const AIValidation = {
  skillMatchValidationSchema,
  generateContentValidationSchema,
  consultantValidationSchema,
  generateSyllabusValidationSchema,
};
