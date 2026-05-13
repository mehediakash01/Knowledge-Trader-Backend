# Knowledge Trader

![Build](https://img.shields.io/badge/Build-Passing-success)
![Node](https://img.shields.io/badge/Node.js-20+-339933)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6)
![License](https://img.shields.io/badge/License-ISC-blue)

**A high-performance, resilient skill-exchange marketplace powered by a Multi-Model AI Gateway.**

Knowledge Trader bridges the gap between learners and experts through a tokenized knowledge economy, secure transactional flows, and AI-driven matchmaking. The platform is engineered for production reliability, data integrity, and operational observability.

---

## Table of Contents

- [Project Identity and Mission](#project-identity-and-mission)
- [Senior Engineering Highlights](#senior-engineering-highlights)
- [Technical Specifications](#technical-specifications)
- [API Documentation by Module](#api-documentation-by-module)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Architecture Diagram (MSC Pattern)](#architecture-diagram-msc-pattern)
- [System Reliability and Data Integrity](#system-reliability-and-data-integrity)
- [Project Status](#project-status)
- [Future Roadmap](#future-roadmap)

---

## Project Identity and Mission

Knowledge Trader is a resilient backend platform for skill exchange where:

- Experts publish premium, structured skill posts.
- Learners discover, evaluate, and purchase knowledge using platform tokens.
- AI services personalize discovery, content architecture, and review intelligence.
- The trade engine enforces strict transactional consistency for token transfers and content access.

The core mission is to provide a secure, high-signal marketplace where quality learning and monetized expertise can scale without compromising reliability.

---

## Senior Engineering Highlights

### 1. Resilient AI Gateway

The AI gateway is built around **provider failover and structured output guarantees**:

- Provider order: **Gemini -> Groq -> OpenRouter**.
- Timeout-based execution with cancellation (`AbortController`) to prevent hanging model calls.
- Structured schema enforcement with Zod validation.
- JSON repair strategy:
  - strips markdown/code fences,
  - attempts object boundary extraction,
  - retries provider fallback when parse/validation fails.
- Safe fallback mode returns deterministic mock-style structured data when all providers fail.
- **Per-user AI rate limiting** with Redis primary store and in-memory fallback.
  - current policy: `20 requests / hour / user`.

### 2. The Knowledge Economy

Tokenized interactions are protected by an **atomic transaction engine**:

- Trade execution runs inside a single Prisma transaction.
- Learner token debit and teacher token credit are committed atomically.
- Trade + transaction + notification records are persisted as one consistency unit.
- Duplicate purchases and self-purchase attempts are rejected.
- Content gating logic ensures `lockedContent` is only visible to:
  - post owner, or
  - users with a completed trade for that post.

### 3. Advanced Security

Security controls are applied at multiple layers:

- **RBAC (Role-Based Access Control)** for protected modules (`USER`, `MANAGER`, `ADMIN`).
- **XSS sanitization middleware** recursively sanitizes POST/PATCH payloads.
- **Helmet** hardens HTTP security headers.
- JWT-based auth with access and refresh token semantics.
- Validation-first request handling using Zod schemas.

### 4. Performance Engineering

Performance-focused architecture includes:

- **Redis-backed caching** with memory fallback.
  - cached category discovery,
  - cached home feed,
  - cache invalidation on content mutation.
- **Redis-backed rate limiting** for AI endpoints.
- **Database indexing** on high-cardinality and search/filter fields.
  - `category`, `tokenPrice`, `title`, `slug`, composite `category + tokenPrice`.
- **Winston logging** with console + file transports for production diagnostics.

---

## Technical Specifications

### Core Stack

- **Language:** TypeScript
- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL (Prisma ORM + Prisma PG adapter)
- **Caching / Rate Limiting:** Redis (with in-memory graceful fallback)
- **AI Models:**
  - Google Gemini (`gemini-1.5-flash`)
  - Groq (`llama-3.1-8b-instant`)
  - OpenRouter (`meta-llama/llama-3.1-8b-instruct:free`)
- **Documentation:** Swagger UI / OpenAPI 3 (`/api-docs`)

### Additional Production Libraries in Use

- `helmet` for HTTP hardening
- `xss` for payload sanitization
- `jsonwebtoken` for auth tokens
- `zod` for runtime contract validation
- `winston` for structured logs
- `socket.io` for live notification streaming
- `http-status`, `cors`, `cookie-parser`, `bcrypt`

---

## API Documentation by Module

Base URL: `http://localhost:5000/api/v1`

### Auth Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/users/register` | Register new user account | Public |
| POST | `/auth/login` | Login and receive access/refresh tokens | Public |
| POST | `/auth/refresh` | Refresh access token using refresh token | Planned (refresh token already issued on login) |

### SkillPosts Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/skill-posts` | Search/filter/list skill posts | Public |
| GET | `/skill-posts/categories` | Cached distinct categories | Public |
| GET | `/skill-posts/home-feed` | Cached featured/latest feed | Public |
| GET | `/skill-posts/:id` | Get single post with gated locked content | Optional Auth |
| POST | `/skill-posts` | Create skill post | USER / MANAGER / ADMIN |
| PATCH | `/skill-posts/:id` | Update own skill post | USER / MANAGER / ADMIN |

### Trades Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/trades/token-trade` | Execute token-based purchase trade | USER |
| GET | `/trades/my-trades` | Learning + teaching trade history | USER |

### AI Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/ai/match` | AI skill matchmaking | USER / MANAGER / ADMIN |
| POST | `/ai/generate-content` | AI content architect for course details | USER / MANAGER / ADMIN |
| POST | `/ai/summarize-reviews/:postId` | AI review summarizer | USER / MANAGER / ADMIN |
| POST | `/ai/consultant` | AI roadmap/trade consultant | USER / MANAGER / ADMIN |

### Analytics Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/analytics/admin-stats` | Admin dashboard KPIs | ADMIN / MANAGER |
| GET | `/analytics/trades?groupBy=date|category` | Trade trends and token volume analytics | ADMIN / MANAGER |

### Notification Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/notifications` | Create notification | ADMIN / MANAGER |
| GET | `/notifications/my-notifications` | Fetch authenticated user notifications | USER / MANAGER / ADMIN |
| PATCH | `/notifications/:id/read` | Mark own notification as read | USER / MANAGER / ADMIN |

### Review Module

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/reviews` | Submit review after completed trade | USER |

Interactive docs available at: `GET /api-docs`

---

## Installation and Setup

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd Knowledge-Trader-Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in project root using the variables from [Environment Variables](#environment-variables).

### 4. Generate Prisma Client and Run Migrations

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Seed Database

```bash
npm run seed
```

### 6. Run Development Server

```bash
npm run dev
```

Server starts on configured port (default `5000`).

### 7. Build for Production

```bash
npm run build
```

---

## Environment Variables

Use these keys in your `.env`:

```env
# App
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/knowledge_trader

# JWT
JWT_SECRET=change-me
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Redis
REDIS_URL=redis://localhost:6379

# AI Providers
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
OPENROUTER_API_KEY=your-openrouter-key
AI_TIMEOUT_MS=10000
```

Notes:

- `JWT_SECRET` can act as fallback if specific access/refresh secrets are omitted.
- AI gateway automatically falls back across providers when keys are present.
- Redis is optional but recommended for production-grade caching and rate limiting.

---

## Architecture Diagram (MSC Pattern)

The project follows a **Modular Service-Controller (MSC)** architecture inspired by enterprise backend systems.

```text
Client / Postman / Frontend
            |
            v
       Express Router (Module-based)
            |
            v
   Middleware Layer (Helmet, CORS, Auth, RBAC,
     Validation, XSS Sanitization, Rate Limiting)
            |
            v
      Controller Layer (HTTP orchestration)
            |
            v
        Service Layer (Business logic,
      Transactions, Caching, AI orchestration)
            |
            +-------------------+
            |                   |
            v                   v
      Prisma ORM          AI Gateway (Failover)
            |            Gemini -> Groq -> OpenRouter
            v
        PostgreSQL
            |
            v
   Redis (cache/rate-limit state) + Socket.IO (live notifications)
```

### Why MSC Here

- Enforces clean separation of concerns.
- Improves testability and maintainability at module level.
- Simplifies adding new domains (AI, Analytics, Trades, Notifications).
- Keeps business rules centralized and reusable.

---

## System Reliability and Data Integrity

Reliability and integrity are first-class concerns in this system:

- Atomic trade transactions prevent partial financial state updates.
- Defensive AI orchestration protects user workflows from provider instability.
- Cache invalidation on writes keeps high-read endpoints performant and fresh.
- Schema validation and strict auth gates reduce malformed/unauthorized state transitions.
- Structured logging and API docs improve operational observability and supportability.

---

## Project Status

- Build: Passing
- API docs: Active (`/api-docs`)
- Core modules: Auth, SkillPosts, Trades, Reviews, Notifications, Analytics, AI
- Production hardening: Security headers, XSS filtering, RBAC, rate limiting, caching, logging

---

## Future Roadmap

- WebSocket-first real-time chat between learners and experts
- Mobile application (iOS/Android) with unified token wallet experience
- Dedicated refresh token rotation endpoint and session management dashboard
- Event-driven background jobs for AI precomputation and digest notifications
- Audit trail enhancements for compliance-grade transaction forensics
- Advanced recommendation ranking with behavioral and cohort signals

---

If you are evaluating this backend for production readiness, start with:

1. `GET /api-docs` for endpoint discovery
2. Trade flow (`/trades/token-trade`) to validate transaction integrity
3. AI flow (`/ai/*`) to observe failover and structured responses under load
4. Notification flow (`/notifications/*` + Socket.IO) for real-time UX behavior
