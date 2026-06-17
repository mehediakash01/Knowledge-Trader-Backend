import { Router } from "express";
import { Role } from "../../../../generated/prisma/enums";
import auth from "../../middlewares/auth";
import { WalletControllers } from "./wallet.controller";

const router = Router();
const authenticatedRoles = [Role.USER, Role.MANAGER, Role.ADMIN];

router.get("/balance", auth(...authenticatedRoles), WalletControllers.getBalance);
router.get("/transactions", auth(...authenticatedRoles), WalletControllers.getTransactions);
router.post("/purchase", auth(...authenticatedRoles), WalletControllers.purchaseTokens);
router.post("/exchange", auth(...authenticatedRoles), WalletControllers.exchangeTokens);

export const WalletRoutes = router;
