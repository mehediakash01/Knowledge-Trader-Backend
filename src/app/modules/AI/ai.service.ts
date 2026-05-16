import httpStatus from "http-status";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import AppError from "../../../errors/AppError";
import { aiGateway } from "./ai.gateway";
import {
  TConsultantRequest,
  TCourseArchitectRequest,
  TSkillAIReviewResponse,
  TSkillMatchRequest,
  TTradeValueRequest,
  TSyllabusRequest,
} from "./ai.interface";

const skillMatchSchema = z.object({
  matches: z.array(
    z.object({
      postId: z.string(),
      title: z.string(),
      score: z.number().min(0).max(100),
      reason: z.string(),
    }),
  ),
});

type TPersonaSkill = {
  name: string;
  level?: string;
  priority?: number;
};

type TMatchCandidate = {
  postId: string;
  title: string;
  score: number;
  reason: string;
  isPriorityMatch: boolean;
  hasReciprocalMatch: boolean;
  matchSkill: string | null;
};

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const normalizePersonaSkills = (value: unknown): TPersonaSkill[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name } : null;
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = String(
        record.name ?? record.skill ?? record.title ?? record.label ?? "",
      ).trim();

      if (!name) {
        return null;
      }

      const priorityValue = Number(record.priority);

      return {
        name,
        level: typeof record.level === "string" ? record.level : undefined,
        priority: Number.isFinite(priorityValue) && priorityValue > 0 ? priorityValue : undefined,
      };
    })
    .filter((item): item is TPersonaSkill => Boolean(item));
};

const skillTextTerms = (skill: {
  title: string;
  category: string;
  tags: string[];
}): string[] => [skill.title, skill.category, ...skill.tags].map(normalizeText);

const hasAnyMatch = (source: string[], terms: string[]) =>
  terms.some((term) => source.some((entry) => entry.includes(term) || term.includes(entry)));

const getCategoryBias = (terms: string[]) => {
  if (terms.some((term) => /(react|next|typescript|javascript|frontend|backend|node|code|programming|developer)/i.test(term))) {
    return ["Development"];
  }

  if (terms.some((term) => /(design|ui|ux|figma|branding|visual)/i.test(term))) {
    return ["Design"];
  }

  if (terms.some((term) => /(ai|ml|data|analytics|prompt|model)/i.test(term))) {
    return ["AI", "Data"];
  }

  if (terms.some((term) => /(business|sales|marketing|startup|strategy|finance)/i.test(term))) {
    return ["Business", "Marketing"];
  }

  return [];
};

const buildReason = (
  skill: { title: string; category: string; tags: string[] },
  priorityMatch: string | null,
  reciprocalMatch: string | null,
) => {
  if (priorityMatch && reciprocalMatch) {
    return `Perfect Barter! They want your ${reciprocalMatch} in exchange for this ${priorityMatch}.`;
  }

  if (priorityMatch) {
    return `Perfect fit for your ${priorityMatch} learning path. Strong alignment with ${skill.category}.`;
  }

  if (reciprocalMatch) {
    return `Perfect Barter! They want your ${reciprocalMatch} and this skill matches ${skill.category}.`;
  }

  return `Trending skill in ${skill.category}. Aligned with your broader persona signals.`;
};

const rankSkillPosts = (
  skills: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
    tokenPrice: number;
    creator: {
      learningPath: unknown;
      expertise: unknown;
      reputationScore: number;
    } | null;
  }>,
  buyerLearningPath: TPersonaSkill[],
  buyerExpertise: TPersonaSkill[],
) => {
  const primaryLearningSkill = buyerLearningPath
    .slice()
    .sort((left, right) => (left.priority ?? 999) - (right.priority ?? 999))[0]?.name ?? null;

  const scoreCandidate = (skill: (typeof skills)[number]): TMatchCandidate => {
    const buyerLearningTerms = buyerLearningPath.map((item) => normalizeText(item.name));
    const buyerExpertiseTerms = buyerExpertise.map((item) => normalizeText(item.name));
    const skillTerms = skillTextTerms(skill);

    const directLearningMatches = buyerLearningPath.filter((item) =>
      skill.tags.some((tag) => normalizeText(tag) === normalizeText(item.name)),
    );

    const primaryMatch = primaryLearningSkill
      ? skill.tags.some((tag) => normalizeText(tag) === normalizeText(primaryLearningSkill))
        || normalizeText(skill.title).includes(normalizeText(primaryLearningSkill))
        || normalizeText(skill.category).includes(normalizeText(primaryLearningSkill))
      : false;

    const sellerLearningPath = normalizePersonaSkills(skill.creator?.learningPath);
    const sellerExpertise = normalizePersonaSkills(skill.creator?.expertise);

    const reciprocalSkill = sellerLearningPath.find((sellerItem) =>
      buyerExpertiseTerms.some((buyerItem) => normalizeText(sellerItem.name) === buyerItem),
    )?.name ?? null;

    const exactLevelAlignment = buyerExpertise.find((buyerItem) => {
      const buyerName = normalizeText(buyerItem.name);
      const sellerMatch = sellerExpertise.find((sellerItem) => normalizeText(sellerItem.name) === buyerName);
      return Boolean(
        sellerMatch &&
        normalizeText(buyerItem.level) === "expert" &&
        normalizeText(sellerMatch.level) === "expert",
      );
    })?.name ?? null;

    const directScore = directLearningMatches.length > 0 ? 5 : 0;
    const reciprocalScore = reciprocalSkill ? 10 : 0;
    const levelScore = exactLevelAlignment ? 3 : 0;
    const priorityScore = primaryMatch ? 12 : 0;
    const reputationBoost = Math.min(5, Math.round((skill.creator?.reputationScore ?? 0) / 2));
    const priceBias = Math.max(0, 10 - Math.floor(skill.tokenPrice / 20));

    const score = Math.min(100, directScore + reciprocalScore + levelScore + priorityScore + reputationBoost + priceBias);

    return {
      postId: skill.id,
      title: skill.title,
      score,
      reason: buildReason(skill, primaryMatch ? primaryLearningSkill : directLearningMatches[0]?.name ?? null, reciprocalSkill ?? exactLevelAlignment),
      isPriorityMatch: primaryMatch,
      hasReciprocalMatch: Boolean(reciprocalSkill),
      matchSkill: reciprocalSkill ?? exactLevelAlignment,
    };
  };

  return skills.map(scoreCandidate);
};

const courseArchitectSchema = z.object({
  longDescription: z.string(),
  specifications: z.array(z.string()),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  estimatedDuration: z.string(),
});

const reviewSummarySchema = z.object({
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  summary: z.string(),
});

const skillAiReviewSchema = z.object({
  sentimentScore: z.number().min(0).max(100),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  summary: z.string(),
});

const skillReviewWarning = "Insufficient data to audit. Ask author to add syllabus.";

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];

const readCachedSkillReview = (skillPost: {
  aiReviewSentimentScore: number | null;
  aiReviewPros: unknown;
  aiReviewCons: unknown;
  aiReviewSummary: string | null;
  aiReviewGeneratedAt: Date | null;
}): TSkillAIReviewResponse["review"] => {
  if (
    skillPost.aiReviewSentimentScore === null ||
    skillPost.aiReviewSummary === null
  ) {
    return null;
  }

  return {
    sentimentScore: skillPost.aiReviewSentimentScore,
    pros: toStringArray(skillPost.aiReviewPros),
    cons: toStringArray(skillPost.aiReviewCons),
    summary: skillPost.aiReviewSummary,
  };
};

const buildSkillReviewFallback = (payload: {
  title: string;
  category: string;
  shortDescription: string;
  tokenPrice: number;
  outcomes: string[];
  valueProp: string | null;
  syllabus: unknown;
  reviews: Array<{ rating: number; comment: string }>;
}) => {
  const moduleCount = Array.isArray(payload.syllabus) ? payload.syllabus.length : 0;
  const averageRating = payload.reviews.length
    ? payload.reviews.reduce((sum, review) => sum + review.rating, 0) / payload.reviews.length
    : 0;

  const sentimentScore = Math.max(
    25,
    Math.min(
      95,
      Math.round(
        42 +
          moduleCount * 6 +
          payload.outcomes.length * 4 +
          averageRating * 8 +
          (payload.valueProp ? 6 : 0) -
          Math.floor(payload.tokenPrice / 15),
      ),
    ),
  );

  const pros = [
    `${moduleCount || 1} structured curriculum section${moduleCount === 1 ? "" : "s"} provide a clear learning path.`,
    payload.valueProp || `The ${payload.category} positioning is easy to understand for new learners.`,
    payload.outcomes[0] || `The post outlines practical takeaways for ${payload.title}.`,
  ].filter(Boolean);

  const cons = [
    averageRating > 0
      ? `Community feedback averages ${averageRating.toFixed(1)} stars, so buyer confidence may vary.`
      : "No learner reviews are available yet, so community validation is limited.",
    moduleCount < 4
      ? "The syllabus is relatively light, which may leave some depth gaps for advanced learners."
      : "Some sections may still need tighter examples or proof of implementation depth.",
  ];

  return {
    sentimentScore,
    pros,
    cons,
    summary: `Audited ${payload.title} using ${moduleCount} syllabus module${moduleCount === 1 ? "" : "s"} and ${payload.reviews.length} recent learner review${payload.reviews.length === 1 ? "" : "s"}.`,
  };
};

const consultantSchema = z.object({
  roadmap: z.array(
    z.object({
      step: z.number(),
      title: z.string(),
      focus: z.string(),
      recommendedSkills: z.array(z.string()),
    }),
  ),
  rationale: z.string(),
});

const skillMatchmaker = async (
  userId: string,
  _payload: TSkillMatchRequest,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      expertise: true,
      learningPath: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const buyerLearningPath = normalizePersonaSkills(user.learningPath)
    .sort((left, right) => (left.priority ?? 999) - (right.priority ?? 999));
  const buyerExpertise = normalizePersonaSkills(user.expertise);

  const learningTerms = buyerLearningPath.map((item) => normalizeText(item.name)).filter(Boolean);
  const expertiseTerms = buyerExpertise.map((item) => normalizeText(item.name)).filter(Boolean);
  const categoryBias = getCategoryBias([...learningTerms, ...expertiseTerms]);

  const relatedSkills = await prisma.skillPost.findMany({
    where: learningTerms.length > 0
      ? {
          OR: [
            { tags: { hasSome: buyerLearningPath.map((item) => item.name) } },
            ...buyerLearningPath.flatMap((item) => [
              { title: { contains: item.name, mode: "insensitive" as const } },
              { category: { contains: item.name, mode: "insensitive" as const } },
            ]),
          ],
        }
      : {},
    take: 60,
    orderBy: [{ tokenPrice: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      shortDescription: true,
      tokenPrice: true,
      creator: {
        select: {
          reputationScore: true,
          learningPath: true,
          expertise: true,
        },
      },
    },
  });

  const rankedMatches = rankSkillPosts(relatedSkills, buyerLearningPath, buyerExpertise)
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (left.isPriorityMatch !== right.isPriorityMatch) {
        return left.isPriorityMatch ? -1 : 1;
      }

      if (left.hasReciprocalMatch !== right.hasReciprocalMatch) {
        return left.hasReciprocalMatch ? -1 : 1;
      }

      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    });

  const hasReciprocalMatch = rankedMatches.some((item) => item.hasReciprocalMatch);

  const finalCandidates = hasReciprocalMatch
    ? rankedMatches
    : await prisma.skillPost.findMany({
        where: categoryBias.length > 0
          ? { category: { in: categoryBias } }
          : {},
        take: 20,
        orderBy: [{ tokenPrice: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          category: true,
          tags: true,
          shortDescription: true,
          tokenPrice: true,
          creator: {
            select: {
              reputationScore: true,
              learningPath: true,
              expertise: true,
            },
          },
        },
      }).then((skills) =>
        skills.map((skill, index) => ({
          postId: skill.id,
          title: skill.title,
          score: Math.max(92 - index * 6, 60),
          reason: `Trending ${skill.category} skill. Strong market activity and category fit for your profile.`,
          isPriorityMatch: false,
          hasReciprocalMatch: false,
          matchSkill: null,
        })),
      );

  const priorityMatches = finalCandidates.filter((item) => item.isPriorityMatch);
  const priorityPicks = priorityMatches.slice(0, 2);
  const remainder = finalCandidates.filter(
    (item) => !priorityPicks.some((priority) => priority.postId === item.postId),
  );

  const orderedMatches = [...priorityPicks, ...remainder].slice(0, 6);

  const postIds = orderedMatches.map((match) => match.postId);
  const matchedPosts = await prisma.skillPost.findMany({
    where: { id: { in: postIds } },
    include: {
      creator: {
        select: { id: true, name: true, reputationScore: true, image: true },
      },
    },
  });

  const matches = orderedMatches
    .map((match) => {
      const post = matchedPosts.find((item) => item.id === match.postId);

      if (!post) {
        return null;
      }

      return {
        ...match,
        post,
      };
    })
    .filter((item): item is (typeof orderedMatches)[number] & { post: (typeof matchedPosts)[number] } => Boolean(item));

  return {
    success: true as const,
    provider: "mock" as const,
    data: {
      isTrendingFallback: !hasReciprocalMatch,
      matches,
    },
  };
};

const generateCourseContent = async (payload: TCourseArchitectRequest) => {
  const fallbackData = {
    longDescription: `A practical course plan for ${payload.prompt}, covering core concepts, guided practice, and real-world application.`,
    specifications: [
      "Structured lessons",
      "Hands-on exercises",
      "Project-based learning",
      "Assessment checkpoints",
    ],
    difficulty: "INTERMEDIATE" as const,
    estimatedDuration: "4 weeks",
  };

  const aiResponse = await aiGateway.generateStructured(
    `Create a detailed course curriculum for: "${payload.prompt}".
Return JSON with:
- longDescription: a compelling 2-3 sentence description of what students will learn
- specifications: array of 5-7 specific learning outcomes or modules
- difficulty: one of BEGINNER, INTERMEDIATE, or ADVANCED
- estimatedDuration: e.g. "4 weeks" or "2 months"`,
    courseArchitectSchema,
    fallbackData,
  );

  return {
    ...aiResponse,
    data: {
      ...aiResponse.data,
      content: `${aiResponse.data.longDescription}\n\nSpecifications:\n${aiResponse.data.specifications.map((s) => `- ${s}`).join("\n")}`,
    },
  };
};

const summarizeReviews = async (postId: string) => {
  const reviews = await prisma.review.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      rating: true,
      comment: true,
    },
  });

  if (!reviews.length) {
    return {
      success: true,
      provider: "mock" as const,
      data: {
        pros: ["No review patterns available yet"],
        cons: ["Not enough learner feedback"],
        summary: "This skill post does not have enough reviews to summarize.",
      },
    };
  }

  const fallbackData = {
    pros: reviews
      .filter((review) => review.rating >= 4)
      .slice(0, 3)
      .map((review) => review.comment),
    cons: reviews
      .filter((review) => review.rating <= 3)
      .slice(0, 3)
      .map((review) => review.comment),
    summary: `Summarized ${reviews.length} review comments.`,
  };

  return aiGateway.generateStructured(
    `Summarize these reviews into pros, cons, and one summary.
Reviews: ${JSON.stringify(reviews)}
Return JSON with pros array, cons array, summary string.`,
    reviewSummarySchema,
    fallbackData,
  );
};

const getSkillAIReview = async (postId: string) => {
  const skillPost = await prisma.skillPost.findUnique({
    where: { id: postId },
    select: {
      aiReviewSentimentScore: true,
      aiReviewPros: true,
      aiReviewCons: true,
      aiReviewSummary: true,
      aiReviewGeneratedAt: true,
      syllabus: true,
    },
  });

  if (!skillPost) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  const cachedReview = readCachedSkillReview(skillPost);

  if (cachedReview) {
    return {
      success: true as const,
      provider: "mock" as const,
      data: {
        review: cachedReview,
        hasCachedReview: true,
        cachedAt: skillPost.aiReviewGeneratedAt?.toISOString() ?? null,
      },
    };
  }

  const hasSyllabus = Array.isArray(skillPost.syllabus) && skillPost.syllabus.length > 0;

  return {
    success: true as const,
    provider: "mock" as const,
    data: {
      review: null,
      hasCachedReview: false,
      warning: hasSyllabus ? undefined : skillReviewWarning,
    },
  };
};

const generateSkillAIReview = async (postId: string) => {
  const [skillPost, reviews] = await Promise.all([
    prisma.skillPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        category: true,
        shortDescription: true,
        tokenPrice: true,
        valueProp: true,
        outcomes: true,
        syllabus: true,
      },
    }),
    prisma.review.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        rating: true,
        comment: true,
      },
    }),
  ]);

  if (!skillPost) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  const hasSyllabus = Array.isArray(skillPost.syllabus) && skillPost.syllabus.length > 0;

  if (!hasSyllabus) {
    return {
      success: true as const,
      provider: "mock" as const,
      data: {
        review: null,
        hasCachedReview: false,
        warning: skillReviewWarning,
      },
    };
  }

  const fallbackData = buildSkillReviewFallback({
    title: skillPost.title,
    category: skillPost.category,
    shortDescription: skillPost.shortDescription,
    tokenPrice: skillPost.tokenPrice,
    outcomes: skillPost.outcomes,
    valueProp: skillPost.valueProp,
    syllabus: skillPost.syllabus,
    reviews,
  });

  const aiResponse = await aiGateway.generateStructured(
    `Act as a strict skill-post auditor for a knowledge marketplace.
Skill title: ${skillPost.title}
Category: ${skillPost.category}
Short description: ${skillPost.shortDescription}
Token price: ${skillPost.tokenPrice}
Value proposition: ${skillPost.valueProp ?? ""}
Learning outcomes: ${JSON.stringify(skillPost.outcomes)}
Syllabus: ${JSON.stringify(skillPost.syllabus)}
Recent learner reviews: ${JSON.stringify(reviews)}

Return JSON with:
- sentimentScore: an integer from 0 to 100 measuring how compelling, trustworthy, and purchase-worthy the skill post is
- pros: 3-5 concise, high-signal strengths
- cons: 2-4 concise, critical caveats or missing pieces
- summary: 1-2 sentence executive audit summary`,
    skillAiReviewSchema,
    fallbackData,
  );

  const review = aiResponse.data;
  const generatedAt = new Date();

  await prisma.skillPost.update({
    where: { id: postId },
    data: {
      aiReviewSentimentScore: review.sentimentScore,
      aiReviewPros: review.pros,
      aiReviewCons: review.cons,
      aiReviewSummary: review.summary,
      aiReviewGeneratedAt: generatedAt,
    },
  });

  return {
    success: true as const,
    provider: aiResponse.provider,
    data: {
      review,
      hasCachedReview: true,
      cachedAt: generatedAt.toISOString(),
      generatedAt: generatedAt.toISOString(),
    },
  };
};

const tradeConsultant = async (
  userId: string,
  payload: TConsultantRequest,
) => {
  const [user, learningTrades, availableSkills] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        interests: true,
        expertise: true,
        tokenBalance: true,
      },
    }),
    prisma.trade.findMany({
      where: {
        learnerId: userId,
        status: "COMPLETED",
      },
      take: 10,
      include: {
        post: {
          select: {
            title: true,
            category: true,
            tags: true,
          },
        },
      },
    }),
    prisma.skillPost.findMany({
      take: 12,
      orderBy: { tokenPrice: "asc" },
      select: {
        title: true,
        category: true,
        tags: true,
        tokenPrice: true,
      },
    }),
  ]);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const trends = payload.trends?.length
    ? payload.trends
    : ["AI automation", "Backend scalability", "Cloud deployment"];
  const fallbackData = {
    roadmap: [
      {
        step: 1,
        title: "Strengthen fundamentals",
        focus: "Close gaps in the user's stated interests and current expertise.",
        recommendedSkills: availableSkills.slice(0, 3).map((skill) => skill.title),
      },
      {
        step: 2,
        title: "Build marketable project depth",
        focus: "Use trending topics to choose applied learning paths.",
        recommendedSkills: availableSkills.slice(3, 6).map((skill) => skill.title),
      },
    ],
    rationale: "Generated from profile interests, completed trades, and current platform supply.",
  };

  return aiGateway.generateStructured(
    `Act as a trade consultant for a skill marketplace.
Goal: ${payload.goal || "Build a high-value learning roadmap"}
User: ${JSON.stringify(user)}
Completed learning trades: ${JSON.stringify(learningTrades)}
Available skills: ${JSON.stringify(availableSkills)}
Trends: ${JSON.stringify(trends)}
Return JSON with roadmap array and rationale.`,
    consultantSchema,
    fallbackData,
  );
};

// ─── Pillar 4: Trade Value Advisor ────────────────────────────────────────────
const tradeValueAdvisorSchema = z.object({
  verdict: z.enum(["GREAT_DEAL", "FAIR_TRADE", "UPGRADE_NEEDED"]),
  label: z.string(),
  reasoning: z.string(),
  offeredScore: z.number().min(0).max(100),
  requestedScore: z.number().min(0).max(100),
});

const tradeValueAdvisor = async (payload: TTradeValueRequest) => {
  const [offeredSkill, requestedSkill] = await Promise.all([
    prisma.skillPost.findUnique({
      where: { id: payload.offeredSkillId },
      select: { title: true, category: true, tokenPrice: true, shortDescription: true, tags: true },
    }),
    prisma.skillPost.findUnique({
      where: { id: payload.requestedSkillId },
      select: { title: true, category: true, tokenPrice: true, shortDescription: true, tags: true },
    }),
  ]);

  if (!offeredSkill || !requestedSkill) {
    throw new AppError(httpStatus.NOT_FOUND, "One or both skills not found");
  }

  const ratio = offeredSkill.tokenPrice / (requestedSkill.tokenPrice || 1);
  const fallbackVerdict = ratio >= 1 ? "GREAT_DEAL" : ratio >= 0.7 ? "FAIR_TRADE" : "UPGRADE_NEEDED";

  const fallbackData = {
    verdict: fallbackVerdict as "GREAT_DEAL" | "FAIR_TRADE" | "UPGRADE_NEEDED",
    label: fallbackVerdict === "GREAT_DEAL" ? "Great Deal!" : fallbackVerdict === "FAIR_TRADE" ? "Fair Trade" : "Upgrade Needed",
    reasoning: `Your skill "${offeredSkill.title}" (${offeredSkill.tokenPrice} KT) vs "${requestedSkill.title}" (${requestedSkill.tokenPrice} KT). Value ratio: ${(ratio * 100).toFixed(0)}%.`,
    offeredScore: Math.min(100, Math.round(ratio * 80)),
    requestedScore: 80,
  };

  return aiGateway.generateStructured(
    `Evaluate this barter trade fairly.
Offered skill: ${JSON.stringify(offeredSkill)}
Requested skill: ${JSON.stringify(requestedSkill)}
Return JSON with: verdict (GREAT_DEAL|FAIR_TRADE|UPGRADE_NEEDED), label (short string), reasoning (1-2 sentences), offeredScore (0-100), requestedScore (0-100).`,
    tradeValueAdvisorSchema,
    fallbackData,
  );
};

// ─── Knowledge Growth Analytics ───────────────────────────────────────────────
const analyticsSchema = z.object({
  headline: z.string(),
  growthAreas: z.array(z.object({
    category: z.string(),
    growth: z.number().min(0).max(100),
    insight: z.string(),
  })),
  topRecommendation: z.string(),
  totalSkillsLearned: z.number(),
  totalTokensInvested: z.number(),
});

const knowledgeAnalytics = async (userId: string) => {
  const [trades, user] = await Promise.all([
    prisma.trade.findMany({
      where: { learnerId: userId, status: "COMPLETED" },
      include: { post: { select: { title: true, category: true, tags: true, tokenPrice: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { interests: true, expertise: true, reputationScore: true },
    }),
  ]);

  const categoryMap: Record<string, number> = {};
  let totalInvested = 0;
  trades.forEach((t) => {
    const cat = t.post?.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    totalInvested += t.post?.tokenPrice || 0;
  });

  const fallbackData = {
    headline: trades.length === 0
      ? "Start your learning journey to see insights!"
      : `You've mastered ${trades.length} skills and invested ${totalInvested} KT in growth!`,
    growthAreas: Object.entries(categoryMap).map(([category, count]) => ({
      category,
      growth: Math.min(100, count * 20),
      insight: `Completed ${count} skill${count > 1 ? "s" : ""} in this area.`,
    })),
    topRecommendation: user?.interests?.[0]
      ? `Explore more ${user.interests[0]} skills to level up.`
      : "Add interests in Settings to get personalized recommendations.",
    totalSkillsLearned: trades.length,
    totalTokensInvested: totalInvested,
  };

  if (trades.length === 0) {
    return { success: true as const, provider: "mock" as const, data: fallbackData };
  }

  return aiGateway.generateStructured(
    `Analyze this user's learning history and generate a Knowledge Growth Report.
Completed trades: ${JSON.stringify(trades.map(t => ({ category: t.post?.category, title: t.post?.title, tags: t.post?.tags })))}
User interests: ${JSON.stringify(user?.interests)}
Return JSON with: headline (string), growthAreas (array of {category, growth 0-100, insight}), topRecommendation (string), totalSkillsLearned (number), totalTokensInvested (number).`,
    analyticsSchema,
    fallbackData,
  );
};

// ─── Elite Architect: Syllabus + Outcomes + Audience + Value Prop ────────────
const syllabusSchema = z.object({
  syllabus: z.array(
    z.object({
      moduleNumber: z.number(),
      title: z.string(),
      description: z.string(),
      topics: z.array(z.string()),
      estimatedTime: z.string(),
    }),
  ),
  outcomes: z.array(z.string()).min(3).max(5),
  targetAudience: z.string(),
  valueProp: z.string(),
});

const roadmapDurationLabel: Record<string, string> = {
  DAILY: "a 1-day intensive",
  HOURLY: "an hour-by-hour sprint",
  SEVEN_DAY: "a 7-day roadmap",
  THIRTY_DAY: "a 30-day deep-dive",
};

const generateSyllabus = async (payload: TSyllabusRequest) => {
  const durationLabel = roadmapDurationLabel[payload.roadmapType] ?? "a structured roadmap";

  const moduleCount =
    payload.roadmapType === "DAILY" ? 4
    : payload.roadmapType === "HOURLY" ? 6
    : payload.roadmapType === "SEVEN_DAY" ? 7
    : 12; // THIRTY_DAY

  const fallbackModules = Array.from({ length: moduleCount }, (_, i) => ({
    moduleNumber: i + 1,
    title: `Module ${i + 1}: Core Concept ${i + 1}`,
    description: `In-depth exploration of key topic ${i + 1} in ${payload.title}.`,
    topics: ["Theory", "Practical Exercise", "Assessment"],
    estimatedTime: payload.roadmapType === "HOURLY" ? `${i + 1}h` : `Day ${i + 1}`,
  }));

  const fallbackData = {
    syllabus: fallbackModules,
    outcomes: [
      `Master the fundamentals of ${payload.title}`,
      "Apply concepts to real-world projects",
      "Build a portfolio-ready deliverable",
      `Understand ${payload.category ?? "the subject"} at a professional level`,
    ],
    targetAudience: `Learners with basic ${payload.category ?? "tech"} knowledge seeking to advance their skills in ${payload.title}.`,
    valueProp: `A structured, mentor-guided path through ${payload.title} that gets you from zero to job-ready in ${durationLabel}.`,
  };

  const aiResponse = await aiGateway.generateStructured(
    `You are an elite course architect. Create a professional syllabus for a skill titled: "${payload.title}".
Category: ${payload.category ?? "General"}
Description: ${payload.shortDescription ?? ""}
Roadmap type: ${payload.roadmapType} (${durationLabel}, approximately ${moduleCount} modules).

Return JSON with:
- syllabus: array of exactly ${moduleCount} modules, each with: moduleNumber (int), title (string), description (2-sentence string), topics (array of 3-5 strings), estimatedTime (string)
- outcomes: array of exactly 4 specific, measurable learning outcomes (start each with an action verb)
- targetAudience: 1-2 sentence profile of the ideal learner
- valueProp: 1-2 sentence persuasive "Why Buy This?" statement`,
    syllabusSchema,
    fallbackData,
  );

  return aiResponse;
};

export const AIServices = {
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
