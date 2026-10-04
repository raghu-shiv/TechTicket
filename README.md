# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system
built as a modular monorepo. The project uses a Docker-first development
workflow with organization-scoped authentication/authorization, ticket
workflows, comments, attachments, SLA automation, notifications, and
approval workflows.

## Current Status

**Phase 4 --- Workflow is complete and verified through Phase 4-J ---
Ticket History Refinement. Phase 5-A through Phase 5-F are COMPLETE AND
VERIFIED. Phase 6-A — SLA Policy Management, Phase 6-B — Ticket SLA Timer Experience, and Phase 6-C — SLA Warnings are COMPLETE AND VERIFIED.**

The current implementation milestone is **6-D — SLA Breach Operations**.

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
-   Realtime organization, ticket, and user room authorization
-   Realtime ticket, approval, SLA breach, and notification-created
    event broadcasting
-   Focused realtime event-to-room routing E2E coverage

See [`PLANS.md`](./PLANS.md) for the detailed implementation tracker.

## Phase 5 Productivity Checkpoint

### 5-A --- Ticket Library

**COMPLETE AND VERIFIED**

The ticket library supports URL-backed search, filtering, sorting,
pagination, row navigation, and ticket details.

### 5-B --- Ticket Library UX Refinement

**COMPLETE AND VERIFIED**

The library UX includes refined filter presentation, active-filter
controls, responsive behavior, useful defaults, and preserved URL-backed
query state.

### 5-C --- Saved Filters Foundation

**COMPLETE AND VERIFIED**

The Saved Filter data model, Prisma migration, organization/user
ownership relationships, schema validation, and foundation E2E coverage
are complete.

### 5-D --- Saved Filter API

**COMPLETE AND VERIFIED**

CRUD endpoints are implemented with authenticated organization/user
ownership, validation, and isolation.

### 5-D.5 / 5-D.6 --- Isolation, CRUD, and Full Verification

**COMPLETE AND VERIFIED**

Latest backend checkpoint:

``` text
E2E test files       21/21 passed
E2E tests            249/249 passed
Failures             0
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

### 5-E --- Saved Filter UX

**COMPLETE AND VERIFIED**

Planned:

-   Save current ticket-library filters
-   Saved-filter list
-   Apply saved filter
-   Rename/edit
-   Delete
-   Reset to normal ticket library
-   Clear distinction between current query and saved query
-   Preserve URL-backed current-query state

The URL remains the source of truth for the current ticket query. Saved
filters are named server-side query definitions that can be applied to
that query.

### 5-F --- Full Phase 5 Verification

**COMPLETE AND VERIFIED**

Final verification:

``` text
Backend unit tests      3/3 test files, 29/29 tests passed
Backend E2E             21/21 test files, 249/249 tests passed
Backend lint            0 warnings / 0 errors
Backend build           SUCCESS
Frontend lint           PASS
Frontend build          SUCCESS
Failures                0
```

Verified functional/security coverage includes organization isolation,
saved-filter ownership, invalid payloads, pagination/filter interaction,
saved-filter query reproduction, edit permissions, delete permissions,
and save/apply/reset/edit/delete workflow regression.

Phase 5 — Productivity is COMPLETE AND VERIFIED.


### 5-F — Full Phase 5 Verification

**COMPLETE AND VERIFIED**

Final verification:

```text
Backend unit tests      3/3 test files, 29/29 tests passed
Backend E2E             21/21 test files, 249/249 tests passed
Backend lint            0 warnings / 0 errors
Backend build           SUCCESS
Frontend lint           PASS
Frontend build          SUCCESS
Failures                0
```

Verified functional/security coverage includes organization isolation, saved-filter ownership, invalid payloads, pagination/filter interaction, saved-filter query application, and edit/delete permissions.

Phase 5 — Productivity is complete and verified.

## Phase 4-H Realtime / WebSockets Checkpoint

### 4-H.3 --- Organization Rooms

**COMPLETE AND VERIFIED**

Authenticated organization context resolution, organization room
subscription, membership enforcement, cross-organization isolation,
lifecycle verification, focused realtime E2E coverage, and regression
verification are complete.

### 4-H.4 --- Ticket Rooms

**COMPLETE AND VERIFIED**

Ticket-room subscriptions are organization-scoped and protected by
ticket ownership validation, cross-organization isolation, lifecycle
verification, and focused/full E2E regression.

### 4-H.5 --- Domain Event Broadcasting

**COMPLETE AND VERIFIED**

Realtime event broadcasting is implemented for ticket lifecycle,
approval lifecycle, SLA breach, and notification-created events. Room
authorization is enforced for organization, ticket, and user rooms.
Focused E2E tests verify organization routing, ticket routing,
notification recipient routing, and rejection of unauthorized user-room
joins.

Latest full API E2E verification:

``` text
Test Files  16 passed (16)
Tests       151 passed (151)
Failures    0
```

Build completed successfully with 0 errors. Lint completed with 0
warnings and 0 errors.

### Next Phase 4-H Milestones

-   4-H.6 --- Realtime tests \| Unit + E2E security/event tests \|
    **NEXT**
-   4-H.7 --- Hardening \| Error handling, lifecycle, cleanup, logging
    \| **PLANNED**
-   4-H.8 --- Full verification \| lint + build + unit + E2E +
    documentation \| **PLANNED**

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

-   Realtime / WebSockets --- **IN PROGRESS**
-   Unassigned queue
-   Ticket history refinement

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

## Phase 4-I --- Unassigned Queue Checkpoint

**COMPLETE AND VERIFIED**

The unassigned queue builds on the existing ticket assignment model
(`assigneeId = null`) without introducing a separate queue data model.

Completed milestones:

-   4-I.1 --- Define unassigned queue behavior
-   4-I.2 --- Verify current unassigned ticket filtering
-   4-I.3 --- Dedicated unassigned-queue API coverage
-   4-I.4 --- Authorization and organization-isolation coverage
-   4-I.5 --- Sorting/pagination/filter interaction coverage
-   4-I.6 --- Assignment transition coverage
-   4-I.7 --- Realtime queue membership changes
-   4-I.8 --- Full verification

Queue membership transitions are verified as:

``` text
UNASSIGNED → assign → removed from unassigned queue
ASSIGNED   → unassign → added to unassigned queue
```

Final verification:

``` text
E2E test files       21/21 passed
E2E tests            249/249 passed
Failures             0
Unit/integration     9/9 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

## Phase 4-J --- Ticket History Refinement

**NEXT**

Planned scope:

-   Activity categorization
-   Timeline metadata
-   Human-readable event descriptions
-   Actor presentation
-   History filtering
-   Pagination
-   Realtime history integration

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
E2E test files       21/21 passed
E2E tests            249/249 passed
Failures             0
Unit/integration     9/9 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
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
test/realtime.e2e-spec.ts
test/realtime-approval-events.e2e-spec.ts
test/realtime-ticket-events.e2e-spec.ts
test/realtime-sla-events.e2e-spec.ts
test/realtime-notification-events.e2e-spec.ts
test/realtime-event.broadcaster.e2e-spec.ts
test/realtime-room-routing.e2e-spec.ts
test/ticket.e2e-spec.ts
```

## 5-F --- Full Phase 5 Verification

**IN PROGRESS**

Verification boundary:

### Backend

-   Unit tests
-   Full E2E tests
-   Lint
-   Production build

### Frontend

-   Lint
-   Production build

### Functional/security checks

-   Organization isolation
-   Saved-filter ownership
-   Invalid saved-filter payloads
-   Pagination/filter interaction
-   Applying a saved filter reproduces the intended ticket query
-   Edit permissions
-   Delete permissions
-   Save/apply/reset/edit/delete workflow regression
-   Current-query vs saved-query behavior

Docker verification commands:

``` powershell
docker compose exec api npm test
docker compose exec api npm run test:e2e
docker compose exec api npm run lint
docker compose exec api npm run build
docker compose exec web npm run lint
docker compose exec web npm run build
```

The repository contains dedicated Saved Filter E2E coverage for context,
organization/user isolation, validation, and persistence. Runtime Docker
execution is still required before this milestone can be marked
**COMPLETE AND VERIFIED**.

## Phase 6 --- SLA

**Status: IN PROGRESS — Phase 6-C COMPLETE AND VERIFIED**

Phase 3-H established the underlying SLA automation foundation. Phase 6
focuses on the product-level SLA experience and operational workflow.
Existing SLA policy, snapshot, due-time, breach, escalation, audit, and
realtime foundations are reused rather than duplicated.

### 6-A — SLA Policy Management

**COMPLETE AND VERIFIED**

Implemented and verified:

- SLA policy API contract
- Policy creation and editing
- Four-priority target management
- Inactive-by-default lifecycle
- Single active policy per organization
- Activate/deactivate UX
- ADMIN/OWNER management authorization
- REQUESTER/AGENT view-only behavior
- Organization isolation
- SLA policy delete UX
- Active-policy deletion protection
- ADMIN/OWNER delete authorization
- Lifecycle confirmation and pending/error states
- Full frontend/backend verification

Policy lifecycle:

```text
Create → INACTIVE
Activate → ACTIVE
Deactivate → INACTIVE
Delete → INACTIVE policies only
```

### 6-B — Ticket SLA Timer Experience

**COMPLETE AND VERIFIED**

Scope:

- Expose existing Ticket SLA snapshot data cleanly to the frontend
- First-response timer
- Resolution timer
- Remaining-time / elapsed-time presentation
- Breached state presentation
- Ticket detail integration
- Library/list SLA indicators where appropriate

Implementation boundary:

- Reuse the existing Ticket SLA snapshot and due-time data.
- Do not introduce duplicate SLA timer or snapshot models.
- Preserve ticket organization scoping and authorization.
- Derive presentation from existing SLA timestamps and breach fields.
- Do not invent warning thresholds; those belong to 6-C.
- Verify the API contract, frontend behavior, lint, TypeScript, build, and
  regression E2E before moving forward.

6-B.5 presentation tests:

```text
Test Files  1 passed (1)
Tests       5 passed (5)
Failures    0
```

6-B.6 full verification:

```text
Frontend:
Vitest tests        PASS — 1/1 test file, 5/5 tests
Frontend lint        PASS
Frontend TypeScript  PASS
Frontend build       SUCCESS

Backend:
E2E tests            PASS
Unit tests           PASS
Backend lint         PASS
Backend build        SUCCESS
```

The backend verification also exercised realtime ticket, approval, SLA, and notification event coverage and organization-isolation scenarios. Resend HTTP 422 messages for `example.com` test recipients were provider test-environment restrictions and did not produce test failures.

### 6-C — SLA Warnings

**COMPLETE AND VERIFIED**

TechTicket uses the following product warning rule:

> **An SLA enters WARNING when 20% or less of the original SLA window remains, while the SLA is still before its due time.**

The threshold is proportional to the captured SLA duration:

- 15 minutes → final 3 minutes
- 30 minutes → final 6 minutes
- 1 hour → final 12 minutes
- 4 hours → final 48 minutes
- 24 hours → final 4 hours 48 minutes

This is a **TechTicket product-design inference** for a quick-support/helpdesk
workflow, not an official numeric rule claimed from the referenced Quick
Support product documentation.

Warning is a derived presentation state only and does not alter existing
due-time calculation, overdue/breach semantics, breach persistence,
escalation, audit, or realtime breach events.

State precedence:

```text
BREACHED → COMPLETED → OVERDUE → WARNING → NORMAL/RUNNING
```

Boundary behavior:

- Greater than 20% remaining → NORMAL/RUNNING
- Exactly 20% remaining → WARNING
- Less than 20% but greater than zero → WARNING
- Exactly due → OVERDUE
- Existing breach timestamp → BREACHED

6-C verification:

```text
Frontend test files  2/2 passed
Frontend tests       43/43 passed
Frontend lint        PASS
Frontend TypeScript  PASS
Frontend build       SUCCESS
Failures             0
```

No warning database model or Socket.IO warning event was introduced.
Existing backend breach detection and realtime breach events remain
authoritative for actual SLA breaches.

### 6-D — SLA Breach Operations

**IN PROGRESS**

Goal: turn the existing SLA breach engine into an operational ticket
workflow without changing breach detection or idempotency.

Scope:

- Existing breach engine becomes an operational UI workflow
- Breach indicators on tickets
- Breach filtering
- Breach history/activity presentation
- Existing escalation records exposed where required
- Existing SLA breach realtime events presented operationally
- Preserve current breach idempotency

Implementation boundary:

- Reuse existing `TicketSla` breach timestamps.
- Reuse existing `SlaEscalation` records.
- Reuse existing SLA breach audit activities.
- Reuse existing SLA breach realtime events.
- Preserve organization scoping and authorization.
- Do not introduce a duplicate breach model.
- Do not change existing breach detection semantics.
- Preserve the existing unique escalation constraint and
  `skipDuplicates` behavior.

Milestones:

- 6-D.1 — Breach operational data/API contract
- 6-D.2 — Ticket breach indicators
- 6-D.3 — Breach filtering
- 6-D.4 — Breach history/activity presentation
- 6-D.5 — Escalation record exposure where required
- 6-D.6 — Realtime breach presentation
- 6-D.7 — Breach authorization and organization isolation
- 6-D.8 — Full 6-D verification

### 6-E — SLA Dashboard

**PLANNED**

Dashboard metrics and definitions must be established from the project
requirements/SOP before implementation.

### 6-F — Full SLA Verification

**PLANNED**

Final verification will cover backend tests, focused SLA E2E, full E2E,
frontend lint/TypeScript/build, authorization, organization isolation,
realtime SLA behavior, and the final documentation checkpoint.

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
-   Realtime / WebSockets (4-H) --- **COMPLETE AND VERIFIED**
    -   Organization rooms (4-H.3) --- **COMPLETE AND VERIFIED**
    -   Ticket rooms (4-H.4) --- **COMPLETE AND VERIFIED**
    -   Domain event broadcasting (4-H.5) --- **COMPLETE AND VERIFIED**
    -   Realtime tests (4-H.6) --- **COMPLETE AND VERIFIED**
    -   Hardening (4-H.7) --- **COMPLETE AND VERIFIED**
    -   Full verification (4-H.8) --- **COMPLETE AND VERIFIED**
-   Unassigned queue (4-I) --- **COMPLETE AND VERIFIED**
    -   4-I.1 --- Define unassigned queue behavior --- **COMPLETE**
    -   4-I.2 --- Verify current unassigned ticket filtering ---
        **COMPLETE**
    -   4-I.3 --- Dedicated unassigned-queue API coverage ---
        **COMPLETE**
    -   4-I.4 --- Authorization and organization-isolation coverage ---
        **COMPLETE**
    -   4-I.5 --- Sorting/pagination/filter interaction coverage ---
        **COMPLETE**
    -   4-I.6 --- Assignment transition coverage --- **COMPLETE**
    -   4-I.7 --- Realtime queue membership changes --- **COMPLETE**
    -   4-I.8 --- Full verification --- **COMPLETE AND VERIFIED**
-   Ticket history refinement (4-J) --- **NEXT**
    -   Activity categorization --- **PLANNED**
    -   Timeline metadata --- **PLANNED**
    -   Human-readable event descriptions --- **PLANNED**
    -   Actor presentation --- **PLANNED**
    -   History filtering --- **PLANNED**
    -   Pagination --- **PLANNED**
    -   Realtime history integration --- **PLANNED**

### Phase 5 --- Productivity

-   Ticket library --- **COMPLETE AND VERIFIED**
-   Ticket Library UX refinement --- **COMPLETE AND VERIFIED**
-   Saved Filters Foundation --- **COMPLETE AND VERIFIED**
-   Saved Filter API --- **COMPLETE AND VERIFIED**
-   Saved Filter UX --- **COMPLETE AND VERIFIED**
-   Full Phase 5 Verification --- **COMPLETE AND VERIFIED**

### Productivity

-   Ticket library
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
-   Ticket library reports
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
SLA timers                        COMPLETE AND VERIFIED
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
Phase 4-H Realtime / WebSockets   COMPLETE AND VERIFIED
Phase 4-I Unassigned Queue        COMPLETE AND VERIFIED
Phase 4-J Ticket History          COMPLETE AND VERIFIED
Phase 5-A Ticket Library          COMPLETE AND VERIFIED
Phase 5-B Ticket Library UX       COMPLETE AND VERIFIED
Phase 5-C Saved Filters Foundation COMPLETE AND VERIFIED
Phase 5-D Saved Filter API          COMPLETE AND VERIFIED
Phase 5-E Saved Filter UX           COMPLETE AND VERIFIED
Phase 5-F Full Phase 5 Verification COMPLETE AND VERIFIED
```

## Phase 6 — SLA

**Status: NEXT**

Phase 3-H established the underlying SLA automation foundation. Phase 6 now focuses on the product-level SLA experience and operational workflow:

- SLA policies
- SLA timers
- SLA warnings
- SLA breaches
- SLA dashboard

Implementation boundary:

- Inspect and reuse the existing SLA policy, snapshot, due-time, breach, escalation, audit, and realtime foundations.
- Do not duplicate existing SLA domain models or automation without a concrete requirement.
- Preserve organization scoping and existing authorization boundaries.
- Define warning thresholds and dashboard metrics from the project requirements/SOP before implementation; do not invent business rules.
- Verify each SLA milestone with focused tests, regression E2E coverage, lint, and build before moving forward.

# Next Development Direction

Phase 4 is complete.
Phase 5-A through Phase 5-F are **COMPLETE AND VERIFIED**.
Phase 6-A — SLA Policy Management is **COMPLETE AND VERIFIED**.
Phase 6-B — Ticket SLA Timer Experience is **COMPLETE AND VERIFIED**.
Phase 6-C — SLA Warnings is **COMPLETE AND VERIFIED**.

The current implementation milestone is:

**6-D — SLA Breach Operations**

Continue from the verified repository state and avoid speculative
architecture changes.
