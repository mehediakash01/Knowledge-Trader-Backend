import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import aiRateLimiter from "../../middlewares/aiRateLimiter";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AIControllers } from "./ai.controller";
import { AIValidation } from "./ai.validation";

const router = Router();

router.post(
  "/match",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  validateRequest(AIValidation.skillMatchValidationSchema),
  AIControllers.skillMatchmaker,
);

router.post(
  "/generate-content",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  validateRequest(AIValidation.generateContentValidationSchema),
  AIControllers.generateCourseContent,
);

router.post(
  "/summarize-reviews/:postId",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  AIControllers.summarizeReviews,
);

router.get(
  "/reviews/:postId",
  aiRateLimiter,
  AIControllers.getSkillAIReview,
);

router.post(
  "/reviews/:postId/generate",
  aiRateLimiter,
  AIControllers.generateSkillAIReview,
);

router.post(
  "/consultant",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  validateRequest(AIValidation.consultantValidationSchema),
  AIControllers.tradeConsultant,
);

router.post(
  "/trade-value",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  AIControllers.tradeValueAdvisor,
);

router.get(
  "/analytics",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  AIControllers.knowledgeAnalytics,
);

router.post(
  "/generate-syllabus",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  aiRateLimiter,
  validateRequest(AIValidation.generateSyllabusValidationSchema),
  AIControllers.generateSyllabus,
);

export const AIRoutes = router;
