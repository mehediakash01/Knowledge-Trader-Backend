import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { AuthControllers } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import auth from "../../middlewares/auth";

const router = Router();

router.post(
  "/google-login",
  validateRequest(AuthValidation.googleLoginValidationSchema),
  AuthControllers.googleLogin,
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthControllers.loginUser,
);

router.get("/me", auth(), AuthControllers.getMe);

export const AuthRoutes = router;
