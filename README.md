# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system
built as a modular monorepo. The project uses a Docker-first development
workflow with organization-scoped authentication/authorization, ticket
workflows, comments, attachments, SLA automation, notifications, and
approval workflows.

## Current Status

**Backend foundation, ticket core, search/filtering, attachments, SLA
foundations, notifications, approval workflow, ticket regression
testing, and Phase 4-G reliability verification are implemented and
verified.**

Latest verified backend state:

-   Organization-scoped authentication and authorization
-   Ticket CRUD, assignment, status workflow, comments, and attachments
-   Ticket search, date filtering, sorting, relationships, and advanced
    filtering
-   MinIO-backed attachment storage
-   SLA policies, priority-based targets, timers, breach detection, and
    escalation
-   Ticket activity/audit history
-   Redis/BullMQ-backed notifications
-   Approval workflow with verified audit/activity integration
-   Approval lifecycle notifications with organization-scoped recipient
    validation
-   Notification queue processor tests
-   Notification organization-isolation tests
-   Deterministic notification test cleanup
-   Dedicated ticket E2E regression coverage
-   Full API E2E regression
-   Clean API lint
-   Successful NestJS production build

See [`PLANS.md`](./PLANS.md) for the detailed implementation tracker.

## Phase 4 Completion Checkpoint

### 4-G --- Integration & Reliability Testing

**COMPLETE AND VERIFIED --- 2026-09-24**

Full API E2E:

``` text
docker compose exec api npm run test:e2e

Test Files  8 passed (8)
Tests       108 passed (108)
Failures    0
Duration    35.70s
```

Lint:

``` text
docker compose exec api npm run lint

Found 0 warnings and 0 errors.
```

Production build:

``` text
docker compose exec api npm run build

Found 0 errors.
```

The seven previous lint warnings were removed with minimal,
behavior-preserving cleanup.

### Phase 4 Completion Boundary

Completed implemented/verified scope:

-   Approval data model
-   Approval service/API
-   Approval permissions
-   Approval workflow integration
-   Approval audit/activity integration
-   Approval lifecycle notifications
-   Notification processor tests
-   Notification organization isolation
-   Notification test cleanup
-   Notification E2E regression
-   Ticket regression testing
-   Full API E2E verification
-   Lint verification
-   Production build verification

Still planned:

-   Realtime / WebSockets
-   Unassigned queue
-   Junior cases
-   Case history refinement

This distinction intentionally avoids claiming functionality that has
not yet been implemented.

## Approval Workflow

The approval workflow is implemented around `TicketApproval` with these
states:

``` text
PENDING
APPROVED
REJECTED
CANCELLED
```

Approval endpoints:

``` text
POST /api/v1/tickets/:ticketId/approvals
GET  /api/v1/tickets/:ticketId/approvals
GET  /api/v1/approvals/:approvalId
POST /api/v1/approvals/:approvalId/approve
POST /api/v1/approvals/:approvalId/reject
POST /api/v1/approvals/:approvalId/cancel
```

### Approval Audit / Activity

**COMPLETE AND VERIFIED --- 2026-09-22**

The existing ticket activity infrastructure records:

``` text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

Approval creation, authorization boundaries,
approval/rejection/cancellation, and activity-history integration were
verified.

Automatic ticket-status transitions resulting from approval outcomes are
not assumed; those rules remain configurable until defined by the SOP.

### Approval Notifications

**COMPLETE AND VERIFIED --- 2026-09-23**

Approval lifecycle notifications use the existing event-driven
Redis/BullMQ email infrastructure.

Recipient routing:

``` text
REQUESTED  -> approver
APPROVED   -> requester
REJECTED   -> requester
CANCELLED  -> approver
```

Notification jobs carry organization context, and the worker validates
recipient organization membership before resolving email addresses.

Notification content uses the human-readable ticket number, such as
`TKT-000001`.

Live Resend delivery was verified with `delivered@resend.dev`.

`admin@example.com` was correctly resolved, but Resend rejected the
`example.com` address with HTTP 422 in its development environment. This
is a provider test-environment restriction rather than a routing
failure.

## Ticket Regression Testing

**COMPLETE AND VERIFIED --- 2026-09-24**

Dedicated `test/ticket.e2e-spec.ts` coverage protects:

1.  Ticket creation
2.  Retrieval/details
3.  List/search/filtering/pagination
4.  Authorization
5.  Organization isolation
6.  Assignment/workflow
7.  Status transitions
8.  Comments/history
9.  Attachments
10. Approval interactions
11. Validation/error paths
12. Full API E2E regression

Dedicated result:

``` text
test/ticket.e2e-spec.ts
56/56 tests passed
```

Full API result:

``` text
8 test files
108/108 tests passed
```

## Technology Stack

### Backend

-   NestJS 12
-   TypeScript
-   Prisma 6.19.0+
-   PostgreSQL 17
-   Better Auth 1.7.2
-   Redis 8
-   MinIO
-   Express
-   class-validator / class-transformer
-   Swagger

### Frontend

-   Next.js 16.3.3
-   React 19.2.8
-   Zustand

### Infrastructure

-   Docker Compose
-   PostgreSQL
-   Redis
-   MinIO

## API Base URL

Development API:

``` text
http://localhost:4000/api/v1
```

Development web application:

``` text
http://localhost:3000
```

## Repository Structure

``` text
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

1.  Keep organization boundaries enforced at the service/domain layer.
2.  Keep authorization explicit and permission-based.
3.  Validate state transitions rather than allowing arbitrary status
    changes.
4.  Keep attachment metadata and object storage lifecycle synchronized.
5.  Prefer small, verifiable implementation steps.
6.  Verify each feature through API/build tests before moving to the
    next roadmap item.
7.  Avoid speculative architecture changes that are not required by the
    current feature.
8.  Reuse existing activity/event infrastructure for audit and
    notifications.
9.  Do not invent approval rules or automatic ticket-status transitions
    that are not defined by the SOP.
10. Preserve organization validation across asynchronous notification
    processing.
11. Keep regression tests deterministic and independent.
12. Avoid destructive queue cleanup when live BullMQ workers may hold
    job locks.
13. Do not change production behavior solely to satisfy a regression
    test.

## Testing

Run the complete API E2E suite:

``` powershell
docker compose exec api npm run test:e2e
```

Run lint:

``` powershell
docker compose exec api npm run lint
```

Run the backend production build:

``` powershell
docker compose exec api npm run build
```

### Latest Verification

``` text
E2E test files       8/8 passed
E2E tests            108/108 passed
Lint                 0 warnings / 0 errors
Production build     0 errors
```

Current E2E files:

``` text
test/approval.e2e-spec.ts
test/auth.e2e-spec.ts
test/health.e2e-spec.ts
test/notification-organization-isolation.e2e-spec.ts
test/notification-processor.e2e-spec.ts
test/notification.e2e-spec.ts
test/organization.e2e-spec.ts
test/ticket.e2e-spec.ts
```

## Roadmap

### Phase 3 --- Ticket Core

-   Ticket database model --- **COMPLETE**
-   Ticket CRUD --- **COMPLETE**
-   Ticket assignment --- **COMPLETE AND VERIFIED**
-   Ticket status workflow --- **COMPLETE AND VERIFIED**
-   Ticket filtering/pagination --- **COMPLETE AND VERIFIED**
-   Ticket comments --- **COMPLETE AND VERIFIED**
-   Ticket attachments --- **COMPLETE AND VERIFIED**
-   Ticket relations --- **COMPLETE**
-   Advanced ticket search/filtering --- **COMPLETE AND VERIFIED**
-   SLA automation --- **COMPLETE AND VERIFIED**
-   Ticket activity/audit history --- **COMPLETE AND VERIFIED**

### Phase 4 --- Workflow

-   Approval data model --- **COMPLETE**
-   Approval service/API --- **COMPLETE**
-   Approval permissions --- **COMPLETE**
-   Approval workflow integration --- **COMPLETE AND VERIFIED**
-   Approval audit/activity integration (4-E) --- **COMPLETE AND
    VERIFIED**
-   Approval notification integration (4-F) --- **COMPLETE AND
    VERIFIED**
-   Notification integration/reliability tests (4-G.5) --- **COMPLETE
    AND VERIFIED**
-   Ticket regression tests (4-G.6) --- **COMPLETE AND VERIFIED**
-   Full API E2E regression (4-G.7) --- **COMPLETE AND VERIFIED**
-   Lint (4-G.8) --- **COMPLETE AND VERIFIED**
-   Production build (4-G.9) --- **COMPLETE AND VERIFIED**
-   Final verification/documentation (4-G.10) --- **COMPLETE AND
    VERIFIED**
-   Realtime / WebSockets --- planned
-   Unassigned queue --- planned
-   Junior cases --- planned
-   Case history refinement --- planned

### Productivity

-   Tasks
-   Task templates
-   Case library
-   Saved filters

### SLA

-   SLA policies
-   SLA timers
-   SLA warnings
-   SLA breaches
-   SLA dashboard

### Analytics

-   Dashboard
-   Product dashboard
-   Employee dashboard
-   SLA reports
-   TAT reports
-   Usage reports
-   Case library reports
-   Attendance reports
-   Exports

### Production Hardening

-   Unit tests
-   Integration tests
-   E2E tests
-   Security audit
-   Performance testing
-   Database optimization
-   Logging
-   Monitoring
-   Backups
-   CI/CD
-   Production Docker

## Current Project Checkpoint

``` text
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
Approval audit/activity (4-E)     COMPLETE AND VERIFIED
Approval notifications (4-F)     COMPLETE AND VERIFIED
Activity API                      COMPLETE
Notifications                     COMPLETE
Notification processor tests      COMPLETE AND VERIFIED
Notification organization tests   COMPLETE AND VERIFIED
Notification test cleanup         COMPLETE
Notification E2E regression       COMPLETE AND VERIFIED
Email infrastructure              COMPLETE
Redis-backed jobs                 COMPLETE
Ticket regression tests           COMPLETE AND VERIFIED
Full API E2E regression           COMPLETE AND VERIFIED
Lint                              COMPLETE AND VERIFIED
Production build                  COMPLETE AND VERIFIED
Phase 4-G                         COMPLETE AND VERIFIED
```

## Next Development Direction

Phase 4-G is complete. Continue with the roadmap rather than introducing
speculative architecture.

Remaining workflow candidates:

-   Realtime / WebSockets
-   Unassigned queue
-   Junior cases
-   Case history refinement

After the remaining workflow scope, proceed into Productivity,
Analytics, and Production Hardening.
