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

const updateBarterStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["ACCEPTED", "REJECTED"], {
      errorMap: () => ({ message: "Status must be ACCEPTED or REJECTED" }),
    }),
  }),
});

export const TradeValidation = {
  executeTokenTradeValidationSchema,
  createBarterValidationSchema,
  updateBarterStatusValidationSchema,
};
