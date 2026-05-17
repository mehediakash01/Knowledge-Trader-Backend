import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import { authorizeRole } from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AdminControllers } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.use(authorizeRole(Role.ADMIN));

router.get("/overview", AdminControllers.getOverview);
router.get("/ai-infra", AdminControllers.getAiInfra);

router.get(
  "/users",
  validateRequest(AdminValidation.listQueryValidationSchema),
  AdminControllers.listUsers,
);
router.patch(
  "/users/:id",
  validateRequest(AdminValidation.updateUserValidationSchema),
  AdminControllers.updateUser,
);

router.get(
  "/bazaar",
  validateRequest(AdminValidation.listQueryValidationSchema),
  AdminControllers.listBazaarPosts,
);
router.patch(
  "/bazaar/:id/moderation",
  validateRequest(AdminValidation.moderatePostValidationSchema),
  AdminControllers.moderatePost,
);

router.get(
  "/disputes",
  validateRequest(AdminValidation.listQueryValidationSchema),
  AdminControllers.listDisputes,
);
router.patch(
  "/disputes/:id/resolve",
  validateRequest(AdminValidation.resolveDisputeValidationSchema),
  AdminControllers.resolveDispute,
);

export const AdminRoutes = router;
