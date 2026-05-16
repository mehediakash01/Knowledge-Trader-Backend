import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AIServices } from "./ai.service";

const skillMatchmaker = catchAsync(async (req, res) => {
  const result = await AIServices.skillMatchmaker(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.provider === "mock"
        ? "Service Busy: fallback skill matches returned"
        : "Skill matches generated successfully",
    data: result.data,
  });
});

const generateCourseContent = catchAsync(async (req, res) => {
  const result = await AIServices.generateCourseContent(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.provider === "mock"
        ? "Service Busy: fallback course content returned"
        : "Course content generated successfully",
    data: result.data,
  });
});

const summarizeReviews = catchAsync(async (req, res) => {
  const result = await AIServices.summarizeReviews(String(req.params.postId));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.provider === "mock"
        ? "Service Busy: fallback review summary returned"
        : "Review summary generated successfully",
    data: result.data,
  });
});

const getSkillAIReview = catchAsync(async (req, res) => {
  const result = await AIServices.getSkillAIReview(String(req.params.postId));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.data.review ? "Skill audit retrieved successfully" : "Skill audit not yet generated",
    data: result.data,
  });
});

const generateSkillAIReview = catchAsync(async (req, res) => {
  const result = await AIServices.generateSkillAIReview(String(req.params.postId));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.data.review ? "Skill audit generated successfully" : "Insufficient data to audit",
    data: result.data,
  });
});

const tradeConsultant = catchAsync(async (req, res) => {
  const result = await AIServices.tradeConsultant(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.provider === "mock"
        ? "Service Busy: fallback roadmap returned"
        : "Learning roadmap generated successfully",
    data: result.data,
  });
});

const tradeValueAdvisor = catchAsync(async (req, res) => {
  const result = await AIServices.tradeValueAdvisor(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.provider === "mock" ? "Fallback trade assessment" : "Trade value assessed",
    data: result.data,
  });
});

const knowledgeAnalytics = catchAsync(async (req, res) => {
  const result = await AIServices.knowledgeAnalytics(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.provider === "mock" ? "Fallback analytics returned" : "Knowledge analytics generated",
    data: result.data,
  });
});

const generateSyllabus = catchAsync(async (req, res) => {
  const result = await AIServices.generateSyllabus(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      result.provider === "mock"
        ? "Service Busy: fallback syllabus returned"
        : "Syllabus generated successfully",
    data: result.data,
  });
});

export const AIControllers = {
  skillMatchmaker,
  generateCourseContent,
  summarizeReviews,
  getSkillAIReview,
  generateSkillAIReview,
  tradeConsultant,
  tradeValueAdvisor,
  knowledgeAnalytics,
  generateSyllabus,
};
