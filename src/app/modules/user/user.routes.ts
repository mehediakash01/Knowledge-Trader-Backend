import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserControllers } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middlewares/auth";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.createUser,
);

router.get("/profile/:id", UserControllers.getUserProfile);
router.patch(
  "/update-profile",
  auth(),
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserControllers.updateProfile,
);

export const UserRoutes = router;
