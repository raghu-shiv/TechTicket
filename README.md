# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system built as a modular monorepo. It uses a Docker-first development workflow with organization-scoped authentication/authorization, ticket workflows, comments, attachments, SLA automation, notifications, approval workflows, and realtime updates.

## Current Status

**Phase 4 — Workflow is complete and verified through Phase 4-J — Ticket History Refinement.**

Implemented and verified:

- Organization-scoped authentication and authorization
- Ticket CRUD, assignment, status workflow, comments, and attachments
- Ticket search, filtering, sorting, relationships, and pagination
- MinIO-backed attachment storage
- SLA policies, timers, breach detection, and escalation
- Ticket activity/audit history
- Redis/BullMQ-backed notifications
- Approval workflow and approval activity integration
- Approval lifecycle notifications
- Realtime organization, ticket, and user room authorization
- Realtime ticket, approval, SLA breach, and notification-created events
- Unassigned queue behavior and realtime membership changes
- Refined ticket history presentation, filtering, pagination, and realtime integration
- Full API E2E regression
- Clean API lint
- Successful NestJS production build

See [`PLANS.md`](./PLANS.md) for the detailed implementation tracker.

## Phase 4 Completion

### 4-G — Integration & Reliability Testing

**COMPLETE AND VERIFIED**

Covered:

- Health and authentication
- Organization/RBAC boundaries
- Approval API
- Notification integration and processor behavior
- Ticket regression
- Full API E2E regression
- Lint
- Production build

### 4-H — Realtime / WebSockets

**COMPLETE AND VERIFIED**

Implemented and verified:

- Organization rooms
- Secure ticket rooms
- Organization and ticket isolation
- User-room authorization
- Ticket lifecycle events
- Approval lifecycle events
- SLA breach events
- Notification-created events
- Realtime routing/security E2E coverage
- Socket lifecycle and cleanup hardening

### 4-I — Unassigned Queue

**COMPLETE AND VERIFIED**

The queue uses the existing ticket assignment model (`assigneeId = null`) rather than introducing a separate queue model.

Verified:

- Unassigned filtering
- Authorization and organization isolation
- Sorting/pagination/filter interactions
- Assignment/unassignment transitions
- Realtime queue membership changes
- Full regression

### 4-J — Ticket History Refinement

**COMPLETE AND VERIFIED**

Completed milestones:

- 4-J.1 — Derived activity categories
- 4-J.2 — Timeline metadata
- 4-J.3 — Human-readable event descriptions
- 4-J.4 — Actor presentation
- 4-J.5 — History filtering
- 4-J.6 — Pagination
- 4-J.7 — Realtime history integration
- 4-J.8 — Full verification

Ticket history now exposes:

- Activity categories
- Human-readable descriptions
- Timeline metadata
- Actor presentation
- Type/category/actor filters
- Paginated responses
- Realtime activity events
- Organization/ticket scoping

Latest verification:

```text
E2E test files       17/17 passed
E2E tests            208/208 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

## Approval Workflow

The approval workflow is implemented around `TicketApproval` with these states:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

Approval endpoints:

```text
POST /api/v1/tickets/:ticketId/approvals
GET  /api/v1/tickets/:ticketId/approvals
GET  /api/v1/approvals/:approvalId
POST /api/v1/approvals/:approvalId/approve
POST /api/v1/approvals/:approvalId/reject
POST /api/v1/approvals/:approvalId/cancel
```

Approval activity types:

```text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

Automatic ticket-status transitions resulting from approval outcomes remain configurable until defined by the SOP.

## Technology Stack

### Backend

- NestJS 12
- TypeScript
- Prisma 6.19.0+
- PostgreSQL 17
- Better Auth 1.7.2
- Redis 8
- MinIO
- Express
- class-validator / class-transformer
- Swagger

### Frontend

- Next.js 16.3.3
- React 19.2.8
- Zustand

### Infrastructure

- Docker Compose
- PostgreSQL
- Redis
- MinIO

## API Base URL

Development API:

```text
http://localhost:4000/api/v1
```

Development web application:

```text
http://localhost:3000
```

## Repository Structure

```text
TechTicket/
├── apps/
│   ├── api/                 # NestJS backend
│   └── web/                 # Next.js frontend
├── packages/                # Shared packages
├── docker/
├── README.md
├── PLANS.md
├── package.json
└── docker-compose.yml
```

## Development Principles

1. Keep organization boundaries enforced at the service/domain layer.
2. Keep authorization explicit and permission-based.
3. Validate state transitions rather than allowing arbitrary status changes.
4. Keep attachment metadata and object storage lifecycle synchronized.
5. Prefer small, verifiable implementation steps.
6. Verify each feature through API/build tests before moving to the next roadmap item.
7. Avoid speculative architecture changes that are not required by the current feature.
8. Reuse existing activity/event infrastructure for audit and notifications.
9. Do not invent approval rules or automatic ticket-status transitions that are not defined by the SOP.
10. Preserve organization validation across asynchronous notification processing.
11. Keep regression tests deterministic and independent.
12. Avoid destructive queue cleanup when live BullMQ workers may hold job locks.

## Testing

Run the complete API E2E suite:

```powershell
docker compose exec api npm run test:e2e
```

Run lint:

```powershell
docker compose exec api npm run lint
```

Run the backend production build:

```powershell
docker compose exec api npm run build
```

Latest verified result:

```text
E2E test files       17/17 passed
E2E tests            208/208 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

## Roadmap

### Phase 3 — Ticket Core

- Ticket database model — **COMPLETE**
- Ticket CRUD — **COMPLETE**
- Ticket assignment — **COMPLETE AND VERIFIED**
- Ticket status workflow — **COMPLETE AND VERIFIED**
- Ticket filtering/pagination — **COMPLETE AND VERIFIED**
- Ticket comments — **COMPLETE AND VERIFIED**
- Ticket attachments — **COMPLETE AND VERIFIED**
- Ticket relations — **COMPLETE**
- Advanced ticket search/filtering — **COMPLETE AND VERIFIED**
- SLA automation — **COMPLETE AND VERIFIED**
- Ticket activity/audit history — **COMPLETE AND VERIFIED**

### Phase 4 — Workflow

- Approval data model — **COMPLETE**
- Approval service/API — **COMPLETE**
- Approval permissions — **COMPLETE**
- Approval workflow integration — **COMPLETE AND VERIFIED**
- Approval audit/activity integration — **COMPLETE AND VERIFIED**
- Approval notification integration — **COMPLETE AND VERIFIED**
- Integration & reliability testing — **COMPLETE AND VERIFIED**
- Realtime / WebSockets — **COMPLETE AND VERIFIED**
- Unassigned queue — **COMPLETE AND VERIFIED**
- Ticket history refinement — **COMPLETE AND VERIFIED**

### Phase 5 — Productivity

- Ticket library — **PLANNED**
- Saved filters — **PLANNED**

### Phase 6 — SLA

- SLA policies — **PLANNED**
- SLA timers — **PLANNED**
- SLA warnings — **PLANNED**
- SLA breaches — **PLANNED**
- SLA dashboard — **PLANNED**

### Phase 7 — Analytics

- Dashboard — **PLANNED**
- Product dashboard — **PLANNED**
- Employee dashboard — **PLANNED**
- SLA reports — **PLANNED**
- TAT reports — **PLANNED**
- Usage reports — **PLANNED**
- Ticket library reports — **PLANNED**
- Exports — **PLANNED**

### Phase 8 — Production Hardening

- Unit tests — **PLANNED**
- Integration tests — **PLANNED**
- E2E tests — **PLANNED**
- Security audit — **PLANNED**
- Performance testing — **PLANNED**
- Database optimization — **PLANNED**
- Logging — **PLANNED**
- Monitoring — **PLANNED**
- Backups — **PLANNED**
- CI/CD — **PLANNED**
- Production Docker — **PLANNED**

## Current Project Checkpoint

```text
Authentication                    COMPLETE
Organization context              COMPLETE
Ticket CRUD                       COMPLETE
Ticket attachments                COMPLETE
Ticket relations                  COMPLETE
Advanced ticket filtering         COMPLETE
SLA policies                      COMPLETE
SLA timers                        COMPLETE
SLA breach detection              COMPLETE
SLA escalation                    COMPLETE
Ticket activity / audit history   COMPLETE
Approval workflow                 COMPLETE
Approval audit/activity           COMPLETE AND VERIFIED
Approval notifications            COMPLETE AND VERIFIED
Activity API                      COMPLETE
Notifications                     COMPLETE
Notification processor tests      COMPLETE AND VERIFIED
Notification organization tests   COMPLETE AND VERIFIED
Email infrastructure              COMPLETE
Redis-backed jobs                 COMPLETE
Ticket regression tests           COMPLETE AND VERIFIED
Full API E2E regression           COMPLETE AND VERIFIED
Lint                              COMPLETE AND VERIFIED
Production build                  COMPLETE AND VERIFIED
Phase 4-G                         COMPLETE AND VERIFIED
Phase 4-H Realtime / WebSockets   COMPLETE AND VERIFIED
Phase 4-I Unassigned Queue        COMPLETE AND VERIFIED
Phase 4-J Ticket History          COMPLETE AND VERIFIED
```

## Next Development Direction

Phase 4 is complete through **Ticket History Refinement**.

The next planned implementation area is **Phase 5 — Productivity**, beginning with:

1. Ticket library
2. Saved filters

Continue from the verified repository state and avoid speculative architecture changes.
