import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TradeServices } from "./trade.service";

const executeTokenTrade = catchAsync(async (req, res) => {
  const result = await TradeServices.executeTokenTrade(
    req.user!.id,
    req.body.postId,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Token trade completed successfully",
    data: result,
  });
});

const getMyTrades = catchAsync(async (req, res) => {
  const result = await TradeServices.getMyTrades(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My trades retrieved successfully",
    data: result,
  });
});

const createBarterRequest = catchAsync(async (req, res) => {
  const result = await TradeServices.createBarterRequest({
    ...req.body,
    senderId: req.user!.id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Barter request sent successfully",
    data: result,
  });
});

const updateBarterStatus = catchAsync(async (req, res) => {
  const { barterId } = req.params;
  const { status } = req.body;
  const result = await TradeServices.updateBarterStatus(
    barterId,
    req.user!.id,
    status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Barter request ${status.toLowerCase()} successfully`,
    data: result,
  });
});

export const TradeControllers = {
  executeTokenTrade,
  getMyTrades,
  createBarterRequest,
  updateBarterStatus,
};
