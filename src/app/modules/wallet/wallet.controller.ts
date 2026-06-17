import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { WalletServices } from "./wallet.service";

const getBalance = catchAsync(async (req, res) => {
  const result = await WalletServices.getBalance(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wallet balance retrieved successfully",
    data: result,
  });
});

const getTransactions = catchAsync(async (req, res) => {
  const result = await WalletServices.getTransactions(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Transaction history retrieved successfully",
    data: result,
  });
});

const purchaseTokens = catchAsync(async (req, res) => {
  const result = await WalletServices.purchaseTokens(req.user!.id, req.body.amount);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens purchased successfully",
    data: result,
  });
});

const exchangeTokens = catchAsync(async (req, res) => {
  const result = await WalletServices.exchangeTokens(req.user!.id, req.body.amount);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Tokens exchanged successfully",
    data: result,
  });
});

export const WalletControllers = {
  getBalance,
  getTransactions,
  purchaseTokens,
  exchangeTokens,
};
