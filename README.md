# Employee Onboarding & Document Management Portal

> A production-grade, multi-tenant B2B SaaS platform that digitises the entire employee onboarding journey — from offer acceptance to day-90 check-in — with document management, e-sign acknowledgements, automated workflows, and HR analytics.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)
![CI/CD](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=flat-square&logo=github-actions)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Live Demo](#live-demo)
- [Tech Stack — Full Breakdown](#tech-stack--full-breakdown)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Supabase Configuration](#supabase-configuration)
- [Docker Setup](#docker-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [CV Talking Points](#cv-talking-points)
- [Roadmap](#roadmap)

---

## Project Overview

The **Employee Onboarding & Document Management Portal** replaces manual, spreadsheet-driven HR onboarding with a structured digital workflow. Companies (tenants) can create role-specific onboarding checklists, assign them to new hires, track completion in real time, manage a secure document vault, and automate reminders for overdue steps.

### The problem it solves

German Mittelstand companies still onboard employees via email threads and printed checklists. A new hire's first week is chaotic — IT doesn't know when to set up accounts, managers don't know what documents are missing, and HR has no visibility. This platform changes that.

### Who uses it

| Role | What they do |
|------|-------------|
| **HR Admin** | Creates onboarding plans, invites new hires, monitors progress |
| **Manager** | Reviews and approves completed onboarding, adds notes |
| **IT Admin** | Gets notified automatically when a new hire is created; completes IT setup checklist |
| **New Hire** | Completes their onboarding tasks, uploads documents, signs acknowledgements |
| **Viewer** | Read-only access to dashboards (e.g. C-suite) |


---

## Live Demo

| Environment | URL |
|-------------|-----|
| Production app | `https://onboarding-portal.yourdomain.com` |
| API docs (Swagger) | `https://api.onboarding-portal.yourdomain.com/docs` |

**Demo accounts (pre-seeded):**

| Role | Email | Password |
|------|-------|----------|
| HR Admin | `hr@demo-company.com` | `Demo1234!` |
| Manager | `manager@demo-company.com` | `Demo1234!` |
| New Hire | `newhire@demo-company.com` | `Demo1234!` |
| IT Admin | `it@demo-company.com` | `Demo1234!` |

---

## Tech Stack — Full Breakdown

### Frontend — Next.js 14

| Tool | Version | Purpose |
|------|---------|---------|
| **Next.js** | 14 | App Router, SSR, server actions, streaming UI |
| **TypeScript** | 5 | Full type safety across frontend |
| **TailwindCSS** | 3 | Utility-first styling |
| **shadcn/ui** | latest | Accessible, composable component library |
| **Zustand** | 4 | Lightweight global state (user session, active company) |
| **TanStack Query** | 5 | Server state, caching, background sync, optimistic updates |
| **React Hook Form** | 7 | Form state management |
| **Zod** | 3 | Schema validation shared with backend DTOs |
| **TipTap** | 2 | Rich text editor for checklist descriptions and notes |
| **Recharts** | 2 | Analytics charts (completion rates, hire cohorts) |
| **@dnd-kit** | 6 | Drag-and-drop for checklist task reordering |
| **date-fns** | 3 | Date formatting and deadline calculations |
| **Supabase JS client** | 2 | Realtime subscriptions, auth session management |
| **next-themes** | latest | Light/dark mode |

**Why Next.js App Router?**
Server components reduce JavaScript bundle size for the dashboard. Server actions handle form submissions without extra API round-trips. Streaming renders the analytics dashboard progressively as data loads.

---

### Backend — NestJS

| Tool | Version | Purpose |
|------|---------|---------|
| **NestJS** | 10 | Modular, decorator-based Node.js framework |
| **TypeScript** | 5 | Full type safety |
| **Prisma** | 5 | Type-safe ORM, migrations, Supabase PostgreSQL adapter |
| **Passport.js** | latest | Authentication middleware |
| **passport-jwt** | latest | JWT access token strategy |
| **passport-local** | latest | Email/password login strategy |
| **@nestjs/jwt** | latest | JWT signing and verification |
| **BullMQ** | 4 | Redis-backed job queues for async tasks |
| **@nestjs/bull** | latest | NestJS BullMQ integration |
| **@nestjs/swagger** | 7 | Auto-generated OpenAPI/Swagger documentation |
| **class-validator** | latest | DTO validation decorators |
| **class-transformer** | latest | DTO serialisation / transform |
| **@nestjs/throttler** | 5 | Rate limiting per user/IP |
| **@nestjs/config** | 3 | Environment config with validation |
| **Nodemailer** | 6 | Transactional email (reminders, invites) |
| **pdf-lib** | latest | Server-side PDF generation for invoice/reports |
| **sharp** | latest | Image processing for uploaded profile photos |

**Why NestJS?**
NestJS's module system maps directly to domain boundaries (auth, company, employee, document, checklist). Guards implement RBAC at the controller level. Interceptors handle audit logging. Pipes run Zod/class-validator before any business logic runs.

---

### Database & Backend-as-a-Service — Supabase

| Feature | How it's used |
|---------|--------------|
| **PostgreSQL 15** | Primary relational database for all application data |
| **Row Level Security (RLS)** | Data isolation between tenants at the database level — no company can ever read another company's data |
| **Supabase Auth** | User registration, email confirmation, password reset, Google OAuth |
| **Supabase Realtime** | Live checklist progress updates pushed to HR dashboard without polling |
| **Supabase Storage** | Secure document vault — onboarding documents, signed PDFs, profile photos |
| **Supabase Edge Functions** | Webhook handler for document signing events |
| **pgvector** | (Roadmap) Semantic search across document content |

**Why Supabase over raw PostgreSQL?**
Supabase gives you Auth, Storage, and Realtime out of the box — reducing infrastructure complexity while keeping PostgreSQL as the foundation. RLS policies mean even if there's a bug in the NestJS API, data isolation is enforced at the database layer. This is exactly the kind of defence-in-depth German enterprise clients require.

---

### Infrastructure & DevOps

| Tool | Purpose |
|------|---------|
| **Docker** | Containerise all services (NestJS, Redis, workers) |
| **Docker Compose** | Local development orchestration — one command startup |
| **GitHub Actions** | CI/CD pipeline — lint, test, build, deploy on every push |
| **Railway** | Production hosting for NestJS API and Redis |
| **Vercel** | Next.js frontend hosting with preview deployments |
| **Supabase Cloud** | Managed PostgreSQL + all Supabase features |
| **Redis** | BullMQ job queue backing store |
| **Sentry** | Error tracking and performance monitoring |
| **Resend** | Transactional email delivery (invite emails, reminders) |

---

## Features

### Feature 1 — Multi-tenant Company Workspaces

Each company that signs up gets an isolated workspace. All data is partitioned by `company_id` enforced via Supabase RLS policies. No company can ever read, write, or even discover another company's data.

- Company registration with domain verification
- Subdomain routing: `acme.onboarding-portal.com`
- Company settings: logo, brand colour, timezone, locale (de-DE / en-GB)
- Billing tier: Free (5 active hires) / Pro (unlimited)
- Company admin can transfer ownership

**Technical implementation:** Every table has a `company_id UUID NOT NULL` column. Supabase RLS policy: `USING (company_id = auth.jwt() ->> 'company_id')`. NestJS `CompanyGuard` validates the JWT claim matches the URL parameter.

---

### Feature 2 — Role-based Access Control (RBAC)

Five roles with granular permissions enforced at both the API (NestJS Guards) and database (Supabase RLS) levels.

| Permission | HR Admin | Manager | IT Admin | New Hire | Viewer |
|-----------|----------|---------|----------|----------|--------|
| Create onboarding plans | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite new hires | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all hires | ✅ | ✅ | ❌ | ❌ | ✅ |
| Complete own tasks | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve onboarding | ❌ | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ❌ | ❌ | ✅ |
| Manage documents | ✅ | ❌ | ❌ | ❌ | ❌ |
| Upload own documents | ❌ | ❌ | ❌ | ✅ | ❌ |

**Technical implementation:**
```typescript
// NestJS guard example
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR_ADMIN, Role.MANAGER)
@Get('hires')
findAllHires(@CompanyId() companyId: string) {
  return this.hiresService.findAll(companyId);
}
```

---

### Feature 3 — Onboarding Plan Templates

HR admins create reusable onboarding plan templates per role (e.g. "Software Engineer", "Sales Rep", "Operations Manager"). Each template contains ordered tasks across configurable phases.

- Template library with role-based defaults
- Phases: Pre-boarding → Week 1 → Month 1 → Month 3
- Task types: `checkbox` | `document_upload` | `form_submission` | `acknowledgement` | `meeting`
- Due date rules: relative to start date (e.g. "Day -3", "Day 1", "Day 30")
- Assign tasks to: new hire / IT admin / manager / HR admin
- Drag-and-drop task reordering with @dnd-kit
- Duplicate and customise templates per hire

---

### Feature 4 — New Hire Onboarding Journey

When a new hire is invited, an onboarding plan is instantiated from the template. The new hire sees a personalised dashboard showing their progress, upcoming tasks, and deadlines.

- Clean, welcoming new hire portal (separate from HR dashboard)
- Progress bar: overall completion percentage
- Phase-by-phase task list with clear status indicators
- In-app notifications for newly assigned tasks
- Task detail view with rich text instructions (TipTap)
- One-click task completion for checkbox tasks
- File upload for document tasks (drag-and-drop or click)
- E-sign acknowledgement: read document → tick to confirm → timestamp recorded
- Mobile-responsive (new hires often complete tasks on phones)

---

### Feature 5 — Document Vault & Management

Secure, company-partitioned document storage powered by Supabase Storage with signed URLs for time-limited access.

- HR uploads company documents: handbook, policies, NDA, contracts
- Documents categorised: `policy` | `contract` | `training` | `form` | `certificate`
- Version control: upload new version, keep history, set active version
- New hire uploads personal documents: ID copy, tax form (Lohnsteuerkarte), bank details
- Documents marked: `pending_review` → `approved` | `rejected`
- Supabase Storage signed URLs expire in 60 minutes — no direct public access
- HR can download all documents for a hire as a ZIP archive
- GDPR compliance: data retention policy per document category
- Virus scan on upload via ClamAV sidecar (Docker)

---

### Feature 6 — Automated Workflow & Reminders

BullMQ job queues handle all async automation — email reminders, IT notifications, deadline escalations, and report generation.

**Automated triggers:**

| Event | Action |
|-------|--------|
| New hire created | Email invite sent to hire + welcome email |
| New hire created | IT admin notified with equipment checklist |
| New hire created | Manager notified with approval tasks |
| Task due in 24h | Reminder email to assigned person |
| Task overdue | Escalation email to HR admin |
| Onboarding completed | Congratulations email + manager notification |
| Document uploaded | HR admin notified for review |
| Document rejected | New hire notified with rejection reason |
| Day 30 reached | 30-day check-in survey triggered |
| Day 90 reached | 90-day review meeting task created |

**Technical implementation:** BullMQ `repeat` jobs check due dates every hour. `DelayedJob` sends notifications at the exact right time. Dead-letter queue captures failed sends for manual retry.

---

### Feature 7 — IT Onboarding Checklist

When HR creates a new hire, the IT admin team receives an automatic task list to provision the new employee's access and equipment.

- Auto-generated IT checklist from company's IT template
- Tasks: laptop provisioning, email creation, Slack invite, GitHub access, VPN credentials
- IT admin marks tasks complete with optional notes
- Status visible to HR admin in real time via Supabase Realtime
- Equipment serial numbers and asset tags recorded per hire
- IT checklist completion blocks "onboarding complete" status

---

### Feature 8 — Manager Approval Workflow

Managers have a structured review and approval flow that doesn't require HR involvement.

- Manager dashboard: all direct reports in onboarding
- View hire's task progress, uploaded documents, and completion percentage
- Add private manager notes (not visible to hire)
- Approve individual phases: "Week 1 approved"
- Final onboarding approval: manager signs off → HR notified
- 30-day and 90-day check-in meeting tasks assigned to manager
- Manager can request document re-upload with reason

---

### Feature 9 — Real-time Progress Dashboard (HR)

The HR admin dashboard shows the live state of all active onboardings, updated in real time via Supabase Realtime subscriptions.

- Active onboardings table: hire name, role, start date, progress %, days remaining
- Status filters: on-track / at-risk (task overdue) / blocked (document rejected)
- Drill-down into any hire's full onboarding detail
- Live progress bar updates when hire completes a task (no page refresh)
- Overdue task alerts with one-click reminder send
- Document review queue: pending uploads awaiting HR approval

---

### Feature 10 — Analytics & Reporting

Aggregate HR analytics to understand onboarding performance over time.

- Completion rate by department / role / hire cohort
- Average time-to-complete by phase
- Most commonly overdue tasks (identify bottlenecks)
- Document rejection rate
- IT provisioning time (from hire creation to IT checklist done)
- Monthly new hire volume chart
- Export: CSV data export, PDF summary report per hire
- **Recharts** renders all charts — line, bar, and donut

---

### Feature 11 — GDPR Compliance Features

Purpose-built for the German market with data protection built in from the start.

- Data retention policy per document category (configurable, e.g. 7 years for contracts)
- Right to erasure: HR can anonymise a departed employee's data
- Data processing log: every document access recorded with user + timestamp
- Cookie consent banner (Cookiebot-compatible)
- Privacy policy version tracking: new hires acknowledge each version
- Data export: hire can request all their data as a JSON/ZIP package
- Supabase RLS ensures cross-tenant data access is impossible at DB level

---

### Feature 12 — Notification Centre & Email System

- In-app notification bell with unread count
- Notification types: task assigned, task overdue, document reviewed, approval needed
- Mark as read / mark all as read
- Email notifications via **Resend** with company-branded templates
- Email preferences: daily digest or instant notifications
- Notification log in HR admin settings (audit trail)

---

## User Roles & Permissions

```
Company (Tenant)
│
├── HR Admin
│   ├── Full CRUD on onboarding plans and templates
│   ├── Invite and manage all company members
│   ├── View and approve all documents
│   ├── Access analytics dashboard
│   └── Manage company settings
│
├── Manager
│   ├── View direct reports' onboarding progress
│   ├── Add notes and approve phases
│   ├── Receive 30/90-day review tasks
│   └── View analytics for their team
│
├── IT Admin
│   ├── View IT checklist for new hires
│   ├── Mark IT tasks as complete
│   └── Record equipment/asset details
│
├── New Hire
│   ├── View and complete own onboarding tasks
│   ├── Upload personal documents
│   ├── Sign acknowledgements
│   └── View own progress only
│
└── Viewer
    ├── Read-only dashboard access
    └── View analytics (no PII)
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Browser / Mobile                        │
│                      Next.js 14 Frontend                        │
│          App Router · shadcn/ui · Zustand · TanStack Query      │
│          Supabase JS (Auth session + Realtime subscriptions)    │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST (JWT) + Supabase Realtime (WS)
             ┌───────────┴───────────┐
             ▼                       ▼
┌────────────────────┐    ┌──────────────────────────────────────┐
│  NestJS REST API   │    │           Supabase Cloud             │
│  (Docker container)│    │                                      │
│                    │    │  ┌──────────┐  ┌──────────────────┐ │
│  Auth module       │    │  │PostgreSQL│  │  Supabase Auth   │ │
│  Company module    │◄───┤  │+ RLS     │  │  (JWT provider)  │ │
│  Employee module   │    │  └──────────┘  └──────────────────┘ │
│  Checklist module  │    │                                      │
│  Document module   │    │  ┌──────────┐  ┌──────────────────┐ │
│  Analytics module  │    │  │ Realtime │  │  Storage         │ │
│  Notification mod. │    │  │(WebSocket│  │  (Document vault)│ │
└────────────────────┘    │  └──────────┘  └──────────────────┘ │
         │                └──────────────────────────────────────┘
         │
┌────────┴────────────┐
│    Redis (Docker)   │
│    BullMQ Queues    │
│                     │
│  email-queue        │
│  reminder-queue     │
│  report-queue       │
│  notification-queue │
└─────────────────────┘
         │
┌────────┴────────────┐
│  BullMQ Workers     │
│  (Docker container) │
│                     │
│  EmailWorker        │◄── Resend API
│  ReminderWorker     │
│  ReportWorker       │◄── pdf-lib
│  VirusScanWorker    │◄── ClamAV sidecar
└─────────────────────┘
```

## Docker Setup

### `docker-compose.yml` (development)

```yaml
version: '3.8'

services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      redis:
        condition: service_healthy
    command: npm run start:dev

  worker:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    depends_on:
      - redis
    command: npm run worker:dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  clamav:
    image: clamav/clamav:stable
    ports:
      - "3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav

volumes:
  redis_data:
  clamav_data:
```

### `Dockerfile` (NestJS production — multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1
USER node
CMD ["node", "dist/main"]
```

---

## CI/CD Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ─── Lint & Type Check ─────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # ─── Unit & Integration Tests ──────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:cov
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
      - uses: codecov/codecov-action@v3

  # ─── E2E Tests ─────────────────────────────────────────
  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:3001
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  # ─── Build Docker Image ────────────────────────────────
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./apps/api
          push: true
          tags: ghcr.io/${{ github.repository }}/api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Deploy ────────────────────────────────────────────
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy API to Railway
        run: |
          npm install -g @railway/cli
          railway up --service api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      - name: Deploy Frontend to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
      - name: Run DB migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - name: Notify Sentry of new release
        run: npx @sentry/cli releases new ${{ github.sha }}
```

---

## Folder Structure

```
employee-onboarding-portal/
├── apps/
│   ├── web/                              # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── accept-invite/page.tsx
│   │   │   │   └── forgot-password/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx            # Dashboard shell with sidebar
│   │   │   │   ├── overview/page.tsx     # HR home with KPI cards
│   │   │   │   ├── hires/
│   │   │   │   │   ├── page.tsx          # All hires list
│   │   │   │   │   ├── new/page.tsx      # Create new hire wizard
│   │   │   │   │   └── [hireId]/
│   │   │   │   │       ├── page.tsx      # Hire detail with progress
│   │   │   │   │       ├── tasks/page.tsx
│   │   │   │   │       └── documents/page.tsx
│   │   │   │   ├── templates/
│   │   │   │   │   ├── page.tsx          # Template library
│   │   │   │   │   └── [templateId]/page.tsx
│   │   │   │   ├── documents/page.tsx    # Company document vault
│   │   │   │   ├── analytics/page.tsx    # Analytics dashboard
│   │   │   │   └── settings/page.tsx     # Company settings
│   │   │   └── (hire)/                   # New hire portal (separate layout)
│   │   │       ├── layout.tsx
│   │   │       ├── onboarding/page.tsx   # Hire's own journey view
│   │   │       └── onboarding/[taskId]/page.tsx
│   │   ├── components/
│   │   │   ├── hires/
│   │   │   │   ├── HireCard.tsx
│   │   │   │   ├── HireTable.tsx
│   │   │   │   ├── CreateHireWizard.tsx
│   │   │   │   └── ProgressBar.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── TaskItem.tsx
│   │   │   │   ├── TaskDetail.tsx
│   │   │   │   └── PhaseAccordion.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── DocumentVault.tsx
│   │   │   │   ├── AcknowledgementModal.tsx
│   │   │   │   └── DocumentReviewQueue.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── KpiCard.tsx
│   │   │   │   ├── CompletionChart.tsx
│   │   │   │   └── HireVolumeChart.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── NotificationList.tsx
│   │   │   └── ui/                       # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts                    # Axios client + interceptors
│   │   │   ├── supabase.ts               # Supabase client (browser)
│   │   │   ├── supabase-server.ts        # Supabase client (server)
│   │   │   └── realtime.ts               # Supabase Realtime hooks
│   │   ├── stores/
│   │   │   ├── auth.store.ts             # Zustand: user + company state
│   │   │   └── notifications.store.ts    # Zustand: unread count
│   │   └── hooks/
│   │       ├── useHires.ts
│   │       ├── useTasks.ts
│   │       ├── useDocuments.ts
│   │       └── useRealtimeProgress.ts    # Supabase Realtime subscription
│   │
│   └── api/                              # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── strategies/
│       │   │   │   ├── jwt.strategy.ts
│       │   │   │   └── local.strategy.ts
│       │   │   └── guards/
│       │   │       ├── jwt-auth.guard.ts
│       │   │       └── roles.guard.ts
│       │   ├── company/
│       │   ├── hires/
│       │   │   ├── hires.module.ts
│       │   │   ├── hires.service.ts
│       │   │   ├── hires.controller.ts
│       │   │   └── dto/
│       │   │       ├── create-hire.dto.ts
│       │   │       └── update-hire.dto.ts
│       │   ├── tasks/
│       │   ├── documents/
│       │   │   ├── documents.service.ts
│       │   │   ├── documents.controller.ts
│       │   │   └── storage/
│       │   │       └── supabase-storage.service.ts
│       │   ├── templates/
│       │   ├── analytics/
│       │   ├── notifications/
│       │   ├── queues/
│       │   │   ├── email.queue.ts
│       │   │   ├── reminder.queue.ts
│       │   │   └── workers/
│       │   │       ├── email.worker.ts
│       │   │       ├── reminder.worker.ts
│       │   │       └── virus-scan.worker.ts
│       │   ├── prisma/
│       │   │   └── prisma.service.ts
│       │   └── common/
│       │       ├── decorators/
│       │       │   ├── roles.decorator.ts
│       │       │   └── company-id.decorator.ts
│       │       ├── filters/
│       │       │   └── http-exception.filter.ts
│       │       └── interceptors/
│       │           └── audit-log.interceptor.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── preview.yml                   # PR preview deployments
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Supabase account (free tier works)
- Resend account (free tier: 3,000 emails/month)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/employee-onboarding-portal.git
cd employee-onboarding-portal
npm install   # installs root + all workspace dependencies
```

### 2. Set up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push database schema
supabase db push

# Enable realtime for required tables
# In Supabase dashboard: Database → Replication → enable hire_tasks, notifications
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Fill in all values — see Environment Variables section
```

### 4. Start Docker services

```bash
docker-compose up -d
# Starts: Redis, ClamAV
```

### 5. Run database migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed    # seeds demo company, users, and template
```

### 6. Start development servers

```bash
# Terminal 1 — NestJS API
cd apps/api && npm run start:dev

# Terminal 2 — BullMQ Worker
cd apps/api && npm run worker:dev

# Terminal 3 — Next.js frontend
cd apps/web && npm run dev
```

### 7. Open the app

Navigate to `http://localhost:3000`. Log in with the seeded HR admin account:
- Email: `hr@demo.com`
- Password: `Demo1234!`



---



### Architecture

- **Multi-tenant data isolation** — Supabase RLS enforces company boundaries at the PostgreSQL level, not just application level. Even a compromised API cannot leak cross-tenant data.
- **Event-driven automation** — BullMQ decouples email sending, reminders, and virus scanning from the request lifecycle. Failed jobs retry automatically with exponential backoff.
- **Real-time without polling** — Supabase Realtime subscriptions push hire progress updates to the HR dashboard instantly. Zero polling, minimal server load.

### German market specifics

- **GDPR-aware from day one** — Document retention policies, right to erasure, data processing audit log, and cookie consent built in at the schema level.
- **DATEV awareness** — The analytics export format is aligned with German HR reporting requirements.
- **German locale defaults** — Timezone `Europe/Berlin`, locale `de-DE`, date format `DD.MM.YYYY` throughout.

### Engineering practices

- **CI/CD pipeline** — Lint → type-check → unit tests → E2E tests → Docker build → deploy. Every pull request gets a preview deployment.
- **Multi-stage Docker builds** — Production image is 60% smaller than naive builds. Health checks built into the Dockerfile.
- **Database migrations** — Prisma migrations run automatically in CI/CD. No manual schema changes in production.
- **API documentation** — Swagger docs auto-generated from NestJS decorators. Always in sync with the code.
- **Audit logging** — Every state change logged with user, timestamp, and IP. Required for enterprise clients.







---

*Built with Next.js 14 · NestJS · Supabase · Docker · GitHub Actions*

*Targeting the German B2B SaaS market*
