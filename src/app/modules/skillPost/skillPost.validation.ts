import { z } from "zod";

const jsonSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

const roadmapTypeEnum = z.enum(["DAILY", "HOURLY", "SEVEN_DAY", "THIRTY_DAY"]);

const createSkillPostValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    category: z.string().min(1, "Category is required"),
    tags: z.array(z.string().min(1)).default([]),
    shortDescription: z
      .string()
      .min(20, "Short description must be at least 20 characters"),
    thumbnail: z.string().url("Must be a valid URL").optional(),
    teaserAsset: z.string().url("Must be a valid URL").optional(),
    roadmapType: roadmapTypeEnum.default("SEVEN_DAY"),
    outcomes: z.array(z.string().min(1)).default([]),
    targetAudience: z.string().optional(),
    prerequisites: z.string().optional(),
    valueProp: z.string().optional(),
    longDescription: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length === 0 || val.length >= 500,
        {
          message: "Long description (Strategy Vault) must be at least 500 characters",
        }
      ),
    syllabus: jsonSchema.optional(),
    resourceLinks: z.array(z.string().url()).default([]),
    lockedContent: jsonSchema.optional(),
    vaultContentType: z.string().optional(),
    vaultVideo: z.string().optional(),
    vaultPdf: z.string().optional(),
    vaultCodeLink: z.string().optional(),
    vaultCodeDescription: z.string().optional(),
    tokenPrice: z
      .number()
      .int("Token price must be an integer")
      .positive("Token price must be a positive integer"),
    images: z.array(z.string().url()).default([]),
  }),
});

const updateSkillPostValidationSchema = z.object({
  body: createSkillPostValidationSchema.shape.body.partial(),
});

// Seller Q&A
const createQuestionValidationSchema = z.object({
  body: z.object({
    body: z.string().min(10, "Question must be at least 10 characters"),
  }),
});

const answerQuestionValidationSchema = z.object({
  body: z.object({
    answer: z.string().min(10, "Answer must be at least 10 characters"),
  }),
});

export const SkillPostValidation = {
  createSkillPostValidationSchema,
  updateSkillPostValidationSchema,
  createQuestionValidationSchema,
  answerQuestionValidationSchema,
};
