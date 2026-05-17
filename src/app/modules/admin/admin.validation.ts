import { z } from "zod";

const listQueryValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    role: z.enum(["USER", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
  }),
});

const moderatePostValidationSchema = z.object({
  body: z.object({
    action: z.enum(["CLEAR", "TAKE_DOWN"]),
  }),
});

const resolveDisputeValidationSchema = z.object({
  body: z.object({
    action: z.enum(["REFUND", "RELEASE"]),
  }),
});

export const AdminValidation = {
  listQueryValidationSchema,
  updateUserValidationSchema,
  moderatePostValidationSchema,
  resolveDisputeValidationSchema,
};
