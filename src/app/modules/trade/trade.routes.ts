import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { TradeControllers } from "./trade.controller";
import { TradeValidation } from "./trade.validation";

const router = Router();
const authenticatedRoles = [Role.USER, Role.MANAGER, Role.ADMIN];

router.post(
  "/token-trade",
  auth(...authenticatedRoles),
  validateRequest(TradeValidation.executeTokenTradeValidationSchema),
  TradeControllers.executeTokenTrade,
);

router.get("/my-trades", auth(...authenticatedRoles), TradeControllers.getMyTrades);

router.post(
  "/barter-request",
  auth(...authenticatedRoles),
  validateRequest(TradeValidation.createBarterValidationSchema),
  TradeControllers.createBarterRequest,
);

router.patch(
  "/barter-requests/:id/resolve",
  auth(...authenticatedRoles),
  validateRequest(TradeValidation.resolveBarterRequestValidationSchema),
  TradeControllers.resolveBarterRequest,
);

router.patch(
  "/barter-request/:barterId",
  auth(...authenticatedRoles),
  validateRequest(TradeValidation.resolveBarterRequestValidationSchema),
  TradeControllers.resolveBarterRequest,
);

export const TradeRoutes = router;
