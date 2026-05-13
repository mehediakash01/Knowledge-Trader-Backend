import { z } from "zod";

const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

const updateProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    bio: z.string().max(500).optional().nullable(),
    tagline: z.string().optional().nullable(),
    image: z.string().url().optional().nullable(),
    socialLinks: z
      .array(
        z.object({ platform: z.string().min(1), url: z.string().url() }),
      )
      .optional()
      .nullable(),
    experience: z
      .array(
        z.object({ title: z.string().min(1), company: z.string().min(1), duration: z.string().min(1) }),
      )
      .optional()
      .nullable(),
    expertise: z
      .array(z.object({ name: z.string().min(1), level: z.enum(["Beginner", "Intermediate", "Expert"]) }))
      .optional()
      .nullable(),
    learningPath: z
      .array(z.object({ name: z.string().min(1), priority: z.number().min(1) }))
      .optional()
      .nullable(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateProfileValidationSchema,
};
