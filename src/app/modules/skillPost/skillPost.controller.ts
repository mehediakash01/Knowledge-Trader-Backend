import httpStatus from "http-status";
import pick from "../../../shared/pick";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { skillPostFilterableFields } from "./skillPost.constant";
import { SkillPostServices } from "./skillPost.service";

const paginationFields = ["page", "limit", "sortBy", "sortOrder"];

const createSkillPost = catchAsync(async (req, res) => {
  const result = await SkillPostServices.createSkillPost(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Skill post created successfully",
    data: result,
  });
});

const getAllSkillPosts = catchAsync(async (req, res) => {
  const filters = pick(req.query, skillPostFilterableFields);
  const options = pick(req.query, paginationFields);
  const result = await SkillPostServices.getAllSkillPosts(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Skill posts retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleSkillPost = catchAsync(async (req, res) => {
  const result = await SkillPostServices.getSingleSkillPost(
    String(req.params.id),
    req.user?.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Skill post retrieved successfully",
    data: result,
  });
});

const getCategories = catchAsync(async (_req, res) => {
  const result = await SkillPostServices.getCategories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

const getHomeFeed = catchAsync(async (_req, res) => {
  const result = await SkillPostServices.getHomeFeed();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Home feed retrieved successfully",
    data: result,
  });
});

const updateSkillPost = catchAsync(async (req, res) => {
  const result = await SkillPostServices.updateSkillPost(
    String(req.params.id),
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Skill post updated successfully",
    data: result,
  });
});

// ─── Q&A Controllers ────────────────────────────────────────────────────────────

const createQuestion = catchAsync(async (req, res) => {
  const result = await SkillPostServices.createQuestion(
    String(req.params.id),
    req.user!.id,
    req.body.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Question submitted successfully",
    data: result,
  });
});

const answerQuestion = catchAsync(async (req, res) => {
  const result = await SkillPostServices.answerQuestion(
    String(req.params.questionId),
    req.user!.id,
    req.body.answer,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Answer posted successfully",
    data: result,
  });
});

const getQuestionsForPost = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const result = await SkillPostServices.getQuestionsForPost(
    String(req.params.id),
    page,
    limit,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Questions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const SkillPostControllers = {
  createSkillPost,
  getAllSkillPosts,
  getSingleSkillPost,
  getCategories,
  getHomeFeed,
  updateSkillPost,
  createQuestion,
  answerQuestion,
  getQuestionsForPost,
};
