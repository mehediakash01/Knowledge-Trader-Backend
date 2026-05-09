import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "ADMIN" | "MANAGER";
  tokenBalance?: number;
  reputationScore?: number;
  expertise?: string[];
  interests?: string[];
}) {
  const hashedPassword = await bcrypt.hash(data.password, 12);

  return prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      role: data.role || "USER",
      tokenBalance: data.tokenBalance ?? 10,
      reputationScore: data.reputationScore ?? 0,
      expertise: data.expertise || [],
      interests: data.interests || [],
    },
    create: {
      ...data,
      password: hashedPassword,
      role: data.role || "USER",
      tokenBalance: data.tokenBalance ?? 10,
      reputationScore: data.reputationScore ?? 0,
      expertise: data.expertise || [],
      interests: data.interests || [],
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: "Admin Lead",
    email: "admin@knowledgetrader.com",
    password: "admin123",
    role: "ADMIN",
    tokenBalance: 500,
    expertise: ["Platform operations", "Analytics"],
    interests: ["Marketplace quality", "Creator growth"],
  });

  const manager = await upsertUser({
    name: "Marketplace Manager",
    email: "manager@knowledgetrader.com",
    password: "manager123",
    role: "MANAGER",
    tokenBalance: 250,
    expertise: ["Community", "Skill curation"],
    interests: ["Mentorship", "AI learning"],
  });

  const mentor = await upsertUser({
    name: "Seed Mentor",
    email: "mentor@example.com",
    password: "mentor123",
    tokenBalance: 160,
    reputationScore: 4.8,
    expertise: ["Go", "Microservices", "gRPC"],
    interests: ["Distributed systems", "Backend architecture"],
  });

  const aiMentor = await upsertUser({
    name: "Aisha Rahman",
    email: "aisha@example.com",
    password: "user123",
    tokenBalance: 130,
    reputationScore: 4.6,
    expertise: ["Prompt engineering", "AI workflows", "Automation"],
    interests: ["Teaching AI", "Creator tooling"],
  });

  const learner = await upsertUser({
    name: "John Doe",
    email: "john@example.com",
    password: "secret123",
    tokenBalance: 90,
    expertise: ["JavaScript", "React"],
    interests: ["Backend Development", "AI automation", "Cloud deployment"],
  });

  const designer = await upsertUser({
    name: "Nadia Karim",
    email: "nadia@example.com",
    password: "user123",
    tokenBalance: 75,
    expertise: ["UI design", "Research"],
    interests: ["Product strategy", "No-code automation"],
  });

  const posts = await Promise.all([
    // Backend Development - 5 posts
    prisma.skillPost.upsert({
      where: { slug: "advanced-go-microservices" },
      update: {},
      create: {
        title: "Advanced Microservices with Go",
        slug: "advanced-go-microservices",
        category: "Backend Development",
        tags: ["go", "microservices", "grpc", "distributed-systems"],
        shortDescription:
          "Learn to build scalable, distributed systems using Go and gRPC.",
        longDescription:
          "A production-focused path covering service discovery, circuit breakers, tracing, deployment, and reliability patterns.",
        tokenPrice: 15,
        images: ["https://example.com/go-course.jpg"],
        previewContent: { intro: "Go is built for concurrency." },
        lockedContent: {
          videoUrl: "https://secure-stream.com/v/go-microservices",
          sourceCode: "github.com/knowledge-trader/go-microservices",
          modules: ["Module 1: gRPC Fundamentals", "Module 2: Service Discovery with Consul", "Module 3: Circuit Breaking"],
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "rust-async-programming" },
      update: {},
      create: {
        title: "Rust Async Programming Mastery",
        slug: "rust-async-programming",
        category: "Backend Development",
        tags: ["rust", "async", "tokio", "performance"],
        shortDescription:
          "Master async/await patterns in Rust for high-performance systems.",
        longDescription:
          "Deep dive into Tokio runtime, async traits, and building real-time applications.",
        tokenPrice: 16,
        images: ["https://example.com/rust-async.jpg"],
        previewContent: { intro: "Fearless concurrency is Rust's superpower." },
        lockedContent: {
          videoUrl: "https://secure-stream.com/v/rust-async",
          sourceCode: "github.com/knowledge-trader/rust-async-examples",
          modules: ["Async Foundations", "Tokio Deep Dive", "Building Web Servers"],
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "postgresql-optimization" },
      update: {},
      create: {
        title: "PostgreSQL Query Optimization",
        slug: "postgresql-optimization",
        category: "Backend Development",
        tags: ["postgresql", "database", "optimization", "sql"],
        shortDescription:
          "Optimize PostgreSQL queries for production-scale applications.",
        longDescription:
          "Indexing strategies, execution plans, transaction isolation levels, and scaling techniques.",
        tokenPrice: 12,
        images: ["https://example.com/postgres.jpg"],
        previewContent: { intro: "Slow queries destroy user experience." },
        lockedContent: {
          workbook: "https://secure-stream.com/files/postgres-queries",
          scripts: "github.com/knowledge-trader/postgres-optimization",
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "kubernetes-production" },
      update: {},
      create: {
        title: "Kubernetes for Production",
        slug: "kubernetes-production",
        category: "Backend Development",
        tags: ["kubernetes", "devops", "container-orchestration"],
        shortDescription:
          "Deploy and scale applications confidently with Kubernetes.",
        longDescription:
          "Helm charts, persistent volumes, networking, security policies, and monitoring.",
        tokenPrice: 18,
        images: ["https://example.com/k8s.jpg"],
        previewContent: { intro: "Kubernetes is the standard for modern deployments." },
        lockedContent: {
          helm_charts: ["example-app", "monitoring-stack"],
          guides: "https://secure-stream.com/files/k8s-guide",
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "redis-caching-strategies" },
      update: {},
      create: {
        title: "Redis Caching & Pub/Sub Strategies",
        slug: "redis-caching-strategies",
        category: "Backend Development",
        tags: ["redis", "caching", "pubsub", "performance"],
        shortDescription:
          "Master Redis for high-performance caching and real-time messaging.",
        longDescription:
          "Cache invalidation patterns, distributed locks, rate limiting, and Pub/Sub architectures.",
        tokenPrice: 13,
        images: ["https://example.com/redis.jpg"],
        previewContent: { intro: "Cache correctly, scale effortlessly." },
        lockedContent: {
          patterns: ["LRU", "Write-Through", "Cache Aside"],
          examples: "github.com/knowledge-trader/redis-patterns",
        },
        creatorId: mentor.id,
      },
    }),
    
    // AI & Machine Learning - 4 posts
    prisma.skillPost.upsert({
      where: { slug: "ai-automation-playbook" },
      update: {},
      create: {
        title: "AI Automation Playbook",
        slug: "ai-automation-playbook",
        category: "AI & Machine Learning",
        tags: ["ai", "automation", "workflows", "prompt-engineering"],
        shortDescription:
          "Design reliable AI workflows for operations, content, and support.",
        longDescription:
          "Build prompt chains, human review loops, fallback flows, and measurable automation systems.",
        tokenPrice: 12,
        images: ["https://example.com/ai-automation.jpg"],
        previewContent: { intro: "Automation starts with clear decisions." },
        lockedContent: {
          templates: ["support-triage", "content-brief", "ops-audit"],
          workbook: "https://secure-stream.com/files/ai-playbook",
          modules: ["Prompt Fundamentals", "Chain Orchestration", "Reliability Patterns"],
        },
        creatorId: aiMentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "fine-tuning-llms" },
      update: {},
      create: {
        title: "Fine-Tuning Large Language Models",
        slug: "fine-tuning-llms",
        category: "AI & Machine Learning",
        tags: ["llm", "fine-tuning", "deep-learning", "transformers"],
        shortDescription:
          "Adapt LLMs to your domain and use case with efficient fine-tuning.",
        longDescription:
          "LoRA, QLoRA, supervised fine-tuning, RLHF concepts, and deployment strategies.",
        tokenPrice: 20,
        images: ["https://example.com/fine-tuning.jpg"],
        previewContent: { intro: "Your data is your competitive advantage." },
        lockedContent: {
          notebooks: "jupyter notebooks for fine-tuning workflows",
          datasets: "example datasets for domain adaptation",
        },
        creatorId: aiMentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "rag-systems-implementation" },
      update: {},
      create: {
        title: "Retrieval-Augmented Generation (RAG) Systems",
        slug: "rag-systems-implementation",
        category: "AI & Machine Learning",
        tags: ["rag", "vector-databases", "embeddings", "llm"],
        shortDescription:
          "Build knowledge-grounded AI systems with RAG for accurate, sourced responses.",
        longDescription:
          "Vector embeddings, similarity search, ranking, and integrating with LLMs.",
        tokenPrice: 18,
        images: ["https://example.com/rag.jpg"],
        previewContent: { intro: "RAG bridges knowledge and AI generation." },
        lockedContent: {
          code: "github.com/knowledge-trader/rag-systems",
          integrations: ["Pinecone", "Weaviate", "Milvus"],
        },
        creatorId: aiMentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "ai-safety-alignment" },
      update: {},
      create: {
        title: "AI Safety & Alignment Fundamentals",
        slug: "ai-safety-alignment",
        category: "AI & Machine Learning",
        tags: ["ai-safety", "alignment", "guardrails", "ethics"],
        shortDescription:
          "Build trustworthy AI systems with safety guardrails and alignment techniques.",
        longDescription:
          "Bias detection, toxic content filtering, policy enforcement, and user oversight.",
        tokenPrice: 14,
        images: ["https://example.com/ai-safety.jpg"],
        previewContent: { intro: "Safe AI is responsible AI." },
        lockedContent: {
          frameworks: ["Constitutional AI", "RLHF", "Red Teaming"],
          guidelines: "https://secure-stream.com/files/safety-checklist",
        },
        creatorId: aiMentor.id,
      },
    }),

    // Product & Design - 4 posts
    prisma.skillPost.upsert({
      where: { slug: "product-strategy-sprint" },
      update: {},
      create: {
        title: "Product Strategy Sprint",
        slug: "product-strategy-sprint",
        category: "Product & Design",
        tags: ["strategy", "research", "roadmap", "product-management"],
        shortDescription:
          "Turn fuzzy ideas into validated product bets and roadmaps.",
        longDescription:
          "A compact operating system for discovery interviews, opportunity scoring, positioning, and roadmap decisions.",
        tokenPrice: 10,
        images: ["https://example.com/product-strategy.jpg"],
        previewContent: { intro: "Strategy is choosing what not to build." },
        lockedContent: {
          worksheet: "https://secure-stream.com/files/strategy-sprint",
          examples: ["B2B SaaS", "marketplace", "creator tool"],
          modules: ["User Research", "Opportunity Mapping", "Roadmap Planning"],
        },
        creatorId: designer.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "ui-ux-design-systems" },
      update: {},
      create: {
        title: "Design Systems & UI/UX Principles",
        slug: "ui-ux-design-systems",
        category: "Product & Design",
        tags: ["design-system", "ui", "ux", "figma"],
        shortDescription:
          "Build scalable design systems that accelerate product development.",
        longDescription:
          "Component libraries, design tokens, accessibility, and design documentation.",
        tokenPrice: 13,
        images: ["https://example.com/design-systems.jpg"],
        previewContent: { intro: "Consistency scales design." },
        lockedContent: {
          figma_file: "Shared Design System Component Library",
          guidelines: "https://secure-stream.com/files/design-guidelines",
        },
        creatorId: designer.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "user-research-methods" },
      update: {},
      create: {
        title: "User Research Methods & Analysis",
        slug: "user-research-methods",
        category: "Product & Design",
        tags: ["research", "user-testing", "analytics", "interviews"],
        shortDescription:
          "Validate product decisions with rigorous user research.",
        longDescription:
          "Interview techniques, usability testing, survey design, and data analysis.",
        tokenPrice: 11,
        images: ["https://example.com/research.jpg"],
        previewContent: { intro: "Users guide product truth." },
        lockedContent: {
          templates: ["Interview Guide", "Usability Test Script"],
          workbook: "https://secure-stream.com/files/research-playbook",
        },
        creatorId: designer.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "conversion-rate-optimization" },
      update: {},
      create: {
        title: "Conversion Rate Optimization (CRO)",
        slug: "conversion-rate-optimization",
        category: "Product & Design",
        tags: ["cro", "analytics", "a-b-testing", "growth"],
        shortDescription:
          "Systematically improve your funnel with data-driven CRO techniques.",
        longDescription:
          "A/B testing frameworks, funnel analysis, heatmaps, and experimentation culture.",
        tokenPrice: 12,
        images: ["https://example.com/cro.jpg"],
        previewContent: { intro: "Every percentage point compounds." },
        lockedContent: {
          toolkit: "CRO Checklist and Templates",
          case_studies: "Real conversion improvements",
        },
        creatorId: designer.id,
      },
    }),

    // Cloud & DevOps - 3 posts
    prisma.skillPost.upsert({
      where: { slug: "terraform-infrastructure" },
      update: {},
      create: {
        title: "Infrastructure as Code with Terraform",
        slug: "terraform-infrastructure",
        category: "Cloud & DevOps",
        tags: ["terraform", "iac", "aws", "infrastructure"],
        shortDescription:
          "Manage cloud infrastructure safely and reproducibly with Terraform.",
        longDescription:
          "Modules, state management, workspaces, and multi-environment deployments.",
        tokenPrice: 14,
        images: ["https://example.com/terraform.jpg"],
        previewContent: { intro: "Code your infrastructure." },
        lockedContent: {
          modules: "Reusable Terraform Modules",
          examples: "github.com/knowledge-trader/terraform-examples",
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "github-actions-ci-cd" },
      update: {},
      create: {
        title: "CI/CD with GitHub Actions",
        slug: "github-actions-ci-cd",
        category: "Cloud & DevOps",
        tags: ["github-actions", "ci-cd", "automation", "devops"],
        shortDescription:
          "Automate testing, building, and deployment with GitHub Actions.",
        longDescription:
          "Custom actions, secrets management, matrix builds, and deployment strategies.",
        tokenPrice: 11,
        images: ["https://example.com/github-actions.jpg"],
        previewContent: { intro: "Automate your entire workflow." },
        lockedContent: {
          workflows: "Production-ready workflow templates",
          guide: "https://secure-stream.com/files/ci-cd-guide",
        },
        creatorId: mentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "observability-monitoring" },
      update: {},
      create: {
        title: "Observability & Monitoring for Production",
        slug: "observability-monitoring",
        category: "Cloud & DevOps",
        tags: ["observability", "monitoring", "logging", "tracing"],
        shortDescription:
          "Build observability into systems for faster incident response.",
        longDescription:
          "Structured logging, distributed tracing, metrics, and alerting strategies.",
        tokenPrice: 13,
        images: ["https://example.com/observability.jpg"],
        previewContent: { intro: "You can't fix what you can't see." },
        lockedContent: {
          stack: ["Prometheus", "Grafana", "Jaeger", "ELK"],
          configs: "github.com/knowledge-trader/observability-stack",
        },
        creatorId: mentor.id,
      },
    }),

    // Blockchain & Web3 - 2 posts
    prisma.skillPost.upsert({
      where: { slug: "smart-contracts-solidity" },
      update: {},
      create: {
        title: "Smart Contracts with Solidity",
        slug: "smart-contracts-solidity",
        category: "Blockchain & Web3",
        tags: ["solidity", "smart-contracts", "ethereum", "web3"],
        shortDescription:
          "Build secure, auditable smart contracts on Ethereum.",
        longDescription:
          "Contract design patterns, security best practices, testing, and deployment.",
        tokenPrice: 17,
        images: ["https://example.com/solidity.jpg"],
        previewContent: { intro: "Code is law on the blockchain." },
        lockedContent: {
          contracts: "audited smart contract examples",
          tests: "github.com/knowledge-trader/solidity-tests",
        },
        creatorId: aiMentor.id,
      },
    }),
    prisma.skillPost.upsert({
      where: { slug: "defi-protocols-architecture" },
      update: {},
      create: {
        title: "DeFi Protocols & Architecture",
        slug: "defi-protocols-architecture",
        category: "Blockchain & Web3",
        tags: ["defi", "protocols", "finance", "blockchain"],
        shortDescription:
          "Understand and build DeFi protocols: AMMs, lending, derivatives.",
        longDescription:
          "Protocol economics, liquidity, risk management, and governance.",
        tokenPrice: 19,
        images: ["https://example.com/defi.jpg"],
        previewContent: { intro: "Finance without intermediaries." },
        lockedContent: {
          whitepaper_summaries: "Key DeFi protocol analysis",
          protocol_guides: "https://secure-stream.com/files/defi-guide",
        },
        creatorId: aiMentor.id,
      },
    }),
  ]);

  const tradeSpecs = [
    // Backend Development trades
    { post: posts[0], learner, teacher: mentor },
    { post: posts[1], learner, teacher: mentor },
    { post: posts[2], learner, teacher: mentor },
    { post: posts[3], learner: designer, teacher: mentor },
    { post: posts[4], learner: aiMentor, teacher: mentor },
    
    // AI & ML trades
    { post: posts[5], learner, teacher: aiMentor },
    { post: posts[6], learner: mentor, teacher: aiMentor },
    { post: posts[7], learner: designer, teacher: aiMentor },
    { post: posts[8], learner, teacher: aiMentor },
    
    // Product & Design trades
    { post: posts[9], learner: mentor, teacher: designer },
    { post: posts[10], learner, teacher: designer },
    { post: posts[11], learner: aiMentor, teacher: designer },
    { post: posts[12], learner, teacher: designer },
    
    // Cloud & DevOps trades
    { post: posts[13], learner: designer, teacher: mentor },
    { post: posts[14], learner, teacher: mentor },
    { post: posts[15], learner: aiMentor, teacher: mentor },
    
    // Web3 trades
    { post: posts[16], learner: designer, teacher: aiMentor },
    { post: posts[17], learner, teacher: aiMentor },
  ];

  for (const spec of tradeSpecs) {
    const existingTrade = await prisma.trade.findFirst({
      where: {
        postId: spec.post.id,
        learnerId: spec.learner.id,
        status: "COMPLETED",
      },
    });

    if (!existingTrade) {
      const trade = await prisma.trade.create({
        data: {
          postId: spec.post.id,
          learnerId: spec.learner.id,
          teacherId: spec.teacher.id,
          status: "COMPLETED",
        },
      });

      await prisma.transaction.create({
        data: {
          userId: spec.learner.id,
          tradeId: trade.id,
          amount: spec.post.tokenPrice,
          type: "DEBIT",
        },
      });
    }
  }

  const reviews = [
    // Backend Development reviews
    {
      postId: posts[0].id,
      userId: learner.id,
      rating: 5,
      comment:
        "Clear, practical, and full of production details I could apply immediately.",
    },
    {
      postId: posts[0].id,
      userId: designer.id,
      rating: 4,
      comment:
        "Excellent deep-dive into gRPC and service discovery patterns.",
    },
    {
      postId: posts[1].id,
      userId: learner.id,
      rating: 5,
      comment:
        "Finally understand async/await in Rust. This course unlocked so much for me.",
    },
    {
      postId: posts[2].id,
      userId: designer.id,
      rating: 4,
      comment:
        "The query optimization techniques saved us significant infrastructure costs.",
    },
    {
      postId: posts[3].id,
      userId: designer.id,
      rating: 5,
      comment:
        "Best Kubernetes guide I've found. Covers the gaps in official docs.",
    },
    {
      postId: posts[4].id,
      userId: aiMentor.id,
      rating: 5,
      comment:
        "Redis patterns here are gold. Applied them to our caching layer immediately.",
    },

    // AI & ML reviews
    {
      postId: posts[5].id,
      userId: learner.id,
      rating: 4,
      comment:
        "Great workflow examples and useful guardrails for real business automations.",
    },
    {
      postId: posts[5].id,
      userId: designer.id,
      rating: 5,
      comment:
        "The templates made it easy to convert manual tasks into repeatable AI systems.",
    },
    {
      postId: posts[6].id,
      userId: mentor.id,
      rating: 5,
      comment:
        "Comprehensive coverage of fine-tuning techniques. Very hands-on.",
    },
    {
      postId: posts[7].id,
      userId: designer.id,
      rating: 4,
      comment:
        "RAG is complex, but this breaks it down perfectly. Great implementation examples.",
    },
    {
      postId: posts[8].id,
      userId: learner.id,
      rating: 5,
      comment:
        "Essential knowledge for building trustworthy AI. Should be required reading.",
    },

    // Product & Design reviews
    {
      postId: posts[9].id,
      userId: mentor.id,
      rating: 4,
      comment:
        "Strong strategy framework with practical exercises for prioritization.",
    },
    {
      postId: posts[10].id,
      userId: learner.id,
      rating: 5,
      comment:
        "Design system best practices here transformed our component library.",
    },
    {
      postId: posts[11].id,
      userId: aiMentor.id,
      rating: 4,
      comment:
        "Interview templates are solid starters. Great research fundamentals.",
    },
    {
      postId: posts[12].id,
      userId: learner.id,
      rating: 5,
      comment:
        "CRO framework helped us identify quick wins that improved conversion by 23%.",
    },

    // Cloud & DevOps reviews
    {
      postId: posts[13].id,
      userId: designer.id,
      rating: 5,
      comment:
        "Terraform modules here are production-ready. Saved us months of IaC work.",
    },
    {
      postId: posts[14].id,
      userId: learner.id,
      rating: 4,
      comment:
        "GitHub Actions workflows are practical and easy to adapt to our stack.",
    },
    {
      postId: posts[15].id,
      userId: aiMentor.id,
      rating: 5,
      comment:
        "Observability stack is exactly what we needed for our microservices.",
    },

    // Web3 reviews
    {
      postId: posts[16].id,
      userId: designer.id,
      rating: 5,
      comment:
        "Smart contract security practices here are industry-leading. Highly recommended.",
    },
    {
      postId: posts[17].id,
      userId: learner.id,
      rating: 4,
      comment:
        "DeFi protocol economics explained with stunning clarity.",
    },
  ];

  for (const review of reviews) {
    const exists = await prisma.review.findFirst({
      where: {
        postId: review.postId,
        userId: review.userId,
        comment: review.comment,
      },
    });

    if (!exists) {
      await prisma.review.create({ data: review });
    }
  }

  await Promise.all([
    prisma.notification.create({
      data: {
        userId: admin.id,
        title: "Seed data ready",
        message: "Knowledge Trader demo data has been populated.",
      },
    }),
    prisma.notification.create({
      data: {
        userId: manager.id,
        title: "Marketplace activity",
        message: "New trades and reviews are available for dashboard review.",
      },
    }),
    prisma.notification.create({
      data: {
        userId: mentor.id,
        title: "New learner review",
        message: "Your Go microservices course received a 5-star review.",
      },
    }),
  ]);

  const creators = [mentor, aiMentor, designer];
  for (const creator of creators) {
    const aggregate = await prisma.review.aggregate({
      where: {
        post: {
          creatorId: creator.id,
        },
      },
      _avg: {
        rating: true,
      },
    });

    await prisma.user.update({
      where: {
        id: creator.id,
      },
      data: {
        reputationScore: aggregate._avg.rating || creator.reputationScore,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
