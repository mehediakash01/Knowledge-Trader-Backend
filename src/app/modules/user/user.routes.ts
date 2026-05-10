import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { UserControllers } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.createUser,
);

router.get("/profile/:id", UserControllers.getUserProfile);

export const UserRoutes = router;
