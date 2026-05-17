import { z } from "zod";

const executeTokenTradeValidationSchema = z.object({
  body: z.object({
    postId: z.string().uuid("Invalid skill post id"),
  }),
});

const createBarterValidationSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid("Invalid receiver id"),
    skillOfferedId: z.string().uuid("Invalid skill offered id"),
    skillRequestedId: z.string().uuid("Invalid skill requested id"),
  }),
});

const resolveBarterRequestValidationSchema = z.object({
  body: z.object({
    action: z.enum(["ACCEPT", "DECLINE"], {
      errorMap: () => ({ message: "Action must be ACCEPT or DECLINE" }),
    }),
  }),
});

export const TradeValidation = {
  executeTokenTradeValidationSchema,
  createBarterValidationSchema,
  resolveBarterRequestValidationSchema,
};
