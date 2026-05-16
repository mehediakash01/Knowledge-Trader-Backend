import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import catchAsync from "../../shared/catchAsync";

const validateRequest = (schema: ZodType) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body ?? {},
      cookies: req.cookies ?? {},
      params: req.params ?? {},
      query: req.query ?? {},
    });

    next();
  });

export default validateRequest;
