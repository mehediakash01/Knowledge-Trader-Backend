import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { AIRoutes } from "../modules/AI/ai.routes";
import { AnalyticsRoutes } from "../modules/analytics/analytics.routes";
import { NotificationRoutes } from "../modules/notification/notification.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { SkillPostRoutes } from "../modules/skillPost/skillPost.routes";
import { TradeRoutes } from "../modules/trade/trade.routes";
import { TradeControllers } from "../modules/trade/trade.controller";
import { TradeValidation } from "../modules/trade/trade.validation";
import { UserRoutes } from "../modules/user/user.routes";
import auth from "../middlewares/auth";
import validateRequest from "../middlewares/validateRequest";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/ai",
    route: AIRoutes,
  },
  {
    path: "/analytics",
    route: AnalyticsRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/skill-posts",
    route: SkillPostRoutes,
  },
  {
    path: "/trades",
    route: TradeRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

router.patch(
  "/barter-requests/:id/resolve",
  auth(Role.USER),
  validateRequest(TradeValidation.resolveBarterRequestValidationSchema),
  TradeControllers.resolveBarterRequest,
);

export default router;
