import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth, { optionalAuth } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { SkillPostControllers } from "./skillPost.controller";
import { SkillPostValidation } from "./skillPost.validation";

const router = Router();

// Public
router.get("/", SkillPostControllers.getAllSkillPosts);
router.get("/categories", SkillPostControllers.getCategories);
router.get("/home-feed", SkillPostControllers.getHomeFeed);
router.get("/:id", optionalAuth, SkillPostControllers.getSingleSkillPost);
router.get("/:id/questions", SkillPostControllers.getQuestionsForPost);

// Auth-required
router.post(
  "/",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  validateRequest(SkillPostValidation.createSkillPostValidationSchema),
  SkillPostControllers.createSkillPost,
);

router.patch(
  "/:id",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  validateRequest(SkillPostValidation.updateSkillPostValidationSchema),
  SkillPostControllers.updateSkillPost,
);

// Seller Q&A
router.post(
  "/:id/questions",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  validateRequest(SkillPostValidation.createQuestionValidationSchema),
  SkillPostControllers.createQuestion,
);

router.patch(
  "/questions/:questionId/answer",
  auth(Role.USER, Role.MANAGER, Role.ADMIN),
  validateRequest(SkillPostValidation.answerQuestionValidationSchema),
  SkillPostControllers.answerQuestion,
);

export const SkillPostRoutes = router;
