export const openApiDocument = {
  openapi: "3.0.0",
  info: {
    title: "Knowledge Trader API",
    version: "1.0.0",
    description: "Backend API for the Knowledge Trader skill-sharing platform.",
  },
  servers: [{ url: "/api/v1" }],
  tags: [
    { name: "Auth" },
    { name: "Users" },
    { name: "SkillPosts" },
    { name: "Trades" },
    { name: "Reviews" },
    { name: "Notifications" },
    { name: "Analytics" },
    { name: "AI" },
  ],
  paths: {
    "/auth/google-login": { post: { tags: ["Auth"], summary: "Login user with Google" } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Login user" } },
    "/users/register": { post: { tags: ["Users"], summary: "Register user" } },
    "/skill-posts": {
      get: { tags: ["SkillPosts"], summary: "List skill posts" },
      post: { tags: ["SkillPosts"], summary: "Create skill post" },
    },
    "/skill-posts/categories": {
      get: { tags: ["SkillPosts"], summary: "Get cached category list" },
    },
    "/skill-posts/home-feed": {
      get: { tags: ["SkillPosts"], summary: "Get cached home feed" },
    },
    "/skill-posts/{id}": {
      get: { tags: ["SkillPosts"], summary: "Get skill post details" },
      patch: { tags: ["SkillPosts"], summary: "Update skill post" },
    },
    "/trades/token-trade": {
      post: { tags: ["Trades"], summary: "Execute token trade" },
    },
    "/trades/my-trades": {
      get: { tags: ["Trades"], summary: "Get learning and teaching trades" },
    },
    "/reviews": { post: { tags: ["Reviews"], summary: "Create review" } },
    "/notifications": {
      post: { tags: ["Notifications"], summary: "Create notification" },
    },
    "/notifications/my-notifications": {
      get: { tags: ["Notifications"], summary: "Get my notifications" },
    },
    "/notifications/{id}/read": {
      patch: { tags: ["Notifications"], summary: "Mark notification as read" },
    },
    "/analytics/admin-stats": {
      get: { tags: ["Analytics"], summary: "Get admin dashboard stats" },
    },
    "/analytics/trades": {
      get: { tags: ["Analytics"], summary: "Get chart-ready trade analytics" },
    },
    "/ai/match": { post: { tags: ["AI"], summary: "Generate skill matches" } },
    "/ai/generate-content": {
      post: { tags: ["AI"], summary: "Generate course content" },
    },
    "/ai/summarize-reviews/{postId}": {
      post: { tags: ["AI"], summary: "Summarize reviews" },
    },
    "/ai/consultant": {
      post: { tags: ["AI"], summary: "Generate learning roadmap" },
    },
  },
};
