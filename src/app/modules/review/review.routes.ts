import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewControllers } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.post(
  "/",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  validateRequest(ReviewValidation.createReviewValidationSchema),
  ReviewControllers.createReview,
);

export const ReviewRoutes = router;
