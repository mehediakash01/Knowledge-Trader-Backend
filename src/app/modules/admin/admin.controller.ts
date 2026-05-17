import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AdminServices } from "./admin.service";

const getOverview = catchAsync(async (_req, res) => {
  const result = await AdminServices.getOverview();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin overview retrieved successfully",
    data: result,
  });
});

const listUsers = catchAsync(async (req, res) => {
  const result = await AdminServices.listUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const result = await AdminServices.updateUser(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User administrative action applied successfully",
    data: result,
  });
});

const listBazaarPosts = catchAsync(async (req, res) => {
  const result = await AdminServices.listBazaarPosts(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin bazaar posts retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const moderatePost = catchAsync(async (req, res) => {
  const result = await AdminServices.moderatePost(req.params.id, req.body.action);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bazaar moderation action applied successfully",
    data: result,
  });
});

const listDisputes = catchAsync(async (req, res) => {
  const result = await AdminServices.listDisputes(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin disputes retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const resolveDispute = catchAsync(async (req, res) => {
  const result = await AdminServices.resolveDispute(req.params.id, req.body.action);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dispute resolution applied successfully",
    data: result,
  });
});

const getAiInfra = catchAsync(async (_req, res) => {
  const result = await AdminServices.getAiInfra();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "AI infrastructure metrics retrieved successfully",
    data: result,
  });
});

export const AdminControllers = {
  getOverview,
  listUsers,
  updateUser,
  listBazaarPosts,
  moderatePost,
  listDisputes,
  resolveDispute,
  getAiInfra,
};
