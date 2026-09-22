# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system built as a modular monorepo. The project uses a Docker-first development workflow with organization-scoped authentication/authorization, ticket workflows, comments, attachments, SLA automation, notifications, and approval workflows.

## Current Status

**Backend foundation, ticket core, search/filtering, attachments, SLA foundations, notifications, and the approval workflow are implemented and verified.**

The latest verified backend state includes:

- Organization-scoped authentication and authorization
- Ticket CRUD, assignment, status workflow, comments, and attachments
- Ticket search, date filtering, sorting, relationships, and advanced filtering
- MinIO-backed attachment storage with verified upload, listing, download, and deletion
- SLA policies, priority-based targets, timers, breach detection, and escalation
- Ticket activity/audit history
- Notifications and Redis/BullMQ-backed jobs
- Approval workflow with verified audit/activity integration

See [`PLANS.md`](./PLANS.md) for the detailed progress tracker and complete roadmap.

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

### 4-E — Approval Audit/Activity Integration

**COMPLETE AND VERIFIED — 2026-09-22**

The existing ticket activity infrastructure records:

```text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

End-to-end verification on `TKT-000001` confirmed:

- Admin/requester can request approval from the designated Agent (`201 Created`).
- The approval is created as `PENDING` and can be retrieved with its human-readable ticket number.
- The requester cannot approve the request (`403 Forbidden`).
- The designated Agent can approve the request (`201 Created`).
- A fresh approval can be rejected by the designated Agent.
- Another fresh approval can be cancelled by the designated Agent.
- Ticket activity history contains the complete approval lifecycle events.
- Activity metadata contains the approval ID, ticket number, approver ID, status, comment, actor, and timestamp information.
- Approval activity reuses the existing ticket activity/event infrastructure rather than introducing a separate audit system.

Automatic ticket-status transitions resulting from approval outcomes are intentionally not assumed; those business rules remain configurable until the SOP defines them.

## Technology Stack

### Backend

- NestJS 12
- TypeScript
- Prisma 6.19.3
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

## Roadmap

The implementation roadmap and completion status are maintained in [`PLANS.md`](./PLANS.md).

### Phase 4 — Workflow

- Approval data model — **COMPLETE**
- Approval service/API — **COMPLETE**
- Pending approval helpers — **COMPLETE**
- Approval audit/activity integration (4-E) — **COMPLETE AND VERIFIED**
- Realtime / WebSockets — **NEXT**
- Unassigned queue — planned
- Junior cases — planned
- Case history refinement — planned

### Part 3-H — SLA & Automation

- SLA policies — **COMPLETE**
- First-response SLA — **COMPLETE**
- Resolution SLA — **COMPLETE**
- SLA timers/deadlines — **COMPLETE**
- Breach detection — **COMPLETE**
- Escalation — **COMPLETE**
- Priority-based SLA — **COMPLETE**
- Organization-specific policies — **COMPLETE**

### Part 3-I — Audit & Notifications

- Ticket activity/audit history — **COMPLETE**
- Assignment notifications — **COMPLETE**
- Status-change notifications — **COMPLETE**
- Comment notifications — **COMPLETE**
- Email notification infrastructure — **COMPLETE**
- Redis-backed jobs — **COMPLETE**
- Approval activity integration — **COMPLETE AND VERIFIED**

The next implementation focus is realtime/WebSocket support, followed by tasks/productivity features as defined in `PLANS.md`.
