# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system
built as a modular monorepo. The project uses a Docker-first development
workflow with organization-scoped authentication/authorization, ticket
workflows, comments, attachments, SLA automation, notifications, and
approval workflows.

## Current Status

**Phase 4 — Workflow is complete and verified through Phase 4-J — Ticket
History Refinement. Phase 5-A through Phase 5-F are COMPLETE AND VERIFIED.
Phase 6-A through Phase 6-F — SLA Policy Management, Ticket SLA Timer
Experience, SLA Warnings, SLA Breach Operations, SLA Dashboard, and Full SLA
Verification — are COMPLETE AND VERIFIED. Phase 7-A through 7-C.4 — Analytics
Foundation, Analytics Dashboard, and Product Analytics — are COMPLETE AND
VERIFIED. Phase 7-E.1 through 7-E.10 — SLA Reports —, Phase 7-F — TAT
Reports —, and Phase 7-H — Ticket Library Reports — are COMPLETE AND VERIFIED.**

Phase 7 — Analytics remains in progress overall. The next implementation is
7-D — Employee Dashboard. TAT Reports remains a separate reporting surface for
actual elapsed operational time, explicitly distinguished from SLA target
duration and compliance.

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
-   SLA breach operations with verified authorization and organization
    isolation
-   Analytics foundation and organization-scoped reporting queries
-   Analytics dashboard with verified KPI aggregation and ticket-volume
    visualization
-   Product taxonomy with organization-scoped Product CRUD
-   Ticket-to-Product assignment, clearing, filtering, and response metadata
-   Product organization-isolation and authorization E2E coverage
-   TAT Reports API and UI, including organization-scoped actual-elapsed-time
    metrics, trends, dimensional breakdowns, and resolved-ticket drill-down
-   Ticket Library Reports API and UI, including shared-query filtered counts,
    status/priority/team/assignee facets, created/updated date buckets, saved-
    filter matching counts, and filter-preserving drill-down into `/tickets`

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

## Reporting

The reporting surface currently includes:

- `/reports` — Reports landing page and analytics dashboards
- `/reports/sla` — operational SLA Dashboard for active, at-risk, breached,
  and resolved SLA ticket views
- `/reports/sla-reports` — SLA compliance and breach reporting, including
  summary metrics, trends, priority/team/assignee breakdowns, and analysis

The SLA Dashboard and SLA Reports are separate surfaces. Both reuse existing
organization-scoped ticket/SLA data; SLA Reports do not introduce duplicate
SLA persistence. Frontend TypeScript, lint, 175 tests across 13 test files,
and the production build passed for the current SLA Reports UI checkpoint.
Manual browser verification of filters, visualizations, and drill-down behavior
remains recommended. Some breach-analysis links include a `view` query
parameter; preselection of that view in the operational dashboard is not
claimed as verified.

The reporting surface also includes **TAT Reports** at `/reports/tat`. TAT
measures actual elapsed time between authoritative operational timestamps:
`TicketSla.firstRespondedAt - Ticket.createdAt` for first response and
`Ticket.resolvedAt - Ticket.createdAt` for resolution. It is not the SLA target
duration, remaining time, compliance rate, or breach status. The report
provides average/median/percentile metrics, daily trends, priority/team/assignee/
product breakdowns, shared filters, and paginated resolved-ticket drill-down.
Missing endpoint timestamps and negative durations are excluded from duration
samples. The drill-down pagination total counts only rows eligible for that
list, while the summary resolved-ticket count retains its broader cohort
meaning. Organization scoping is preserved. Focused TAT API E2E passed 12/12;
frontend TypeScript and production build passed, `/reports/tat` appeared in
route generation, the UI was manually verified, and the user confirmed the full
API E2E suite passes.

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

### Previous Phase 5-F Verification Baseline

The following results are retained as the Phase 5-F checkpoint and are not
the updated full-suite totals after TAT Reports was added.

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
test/tat-report.e2e-spec.ts
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
docker compose exec web npx tsc --noEmit
docker compose exec web npm run lint
docker compose exec web npm run test
docker compose exec web npm run build
```

The repository contains dedicated Saved Filter E2E coverage for context,
organization/user isolation, validation, and persistence. Runtime Docker
execution is still required before this milestone can be marked
**COMPLETE AND VERIFIED**.

## Phase 6 --- SLA

**Status: IN PROGRESS — Phase 6-D COMPLETE AND VERIFIED**

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

**COMPLETE AND VERIFIED**

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

- 6-D.1 — Breach operational data/API contract — **COMPLETE AND VERIFIED**
- 6-D.2 — Ticket breach indicators — **COMPLETE AND VERIFIED**
- 6-D.3 — Breach filtering — **COMPLETE AND VERIFIED**
- 6-D.4 — Breach history/activity presentation — **COMPLETE AND VERIFIED**
- 6-D.5 — Escalation record exposure where required — **COMPLETE AND VERIFIED**
- 6-D.6 — Realtime breach presentation — **COMPLETE AND VERIFIED**
- 6-D.7 — Breach authorization and organization isolation — **COMPLETE AND VERIFIED**
- 6-D.8 — Full 6-D verification — **COMPLETE AND VERIFIED**

#### 6-D.7 / 6-D.8 Verification Checkpoint

**COMPLETE AND VERIFIED — 2026-10-05**

Authorization and organization isolation use the existing authenticated
organization context and ticket access boundaries. No duplicate
breach-specific permission model was introduced.

Verified realtime security behavior includes:

- Unauthenticated realtime connections rejected.
- Invalid sessions rejected.
- Non-member organization connections rejected.
- Sockets joined only to their authenticated organization and own user
  rooms.
- Cross-organization ticket-room access rejected.
- Ticket-level realtime access revalidated through the ticket service.
- User-room access restricted to the authenticated user.
- Realtime broadcast targets prevented from crossing organization
  boundaries.
- SLA breach events scoped to the originating organization and ticket
  rooms.

6-D.8 final verification boundary:

- Frontend TypeScript: PASS
- Frontend tests: PASS
- Frontend lint: PASS
- Frontend production build: PASS
- Backend realtime/security unit and E2E coverage: PASS
- SLA breach API/realtime coverage: PASS
- Organization isolation coverage: PASS
- Authorization coverage: PASS

Manual browser SLA-breach generation remains deferred because the current
UI does not yet expose a ticket-creation path. This does not block the
automated 6-D authorization, isolation, API, and realtime verification
boundary.

### 6-E — SLA Dashboard

**COMPLETE AND VERIFIED — 2026-10-05**

The SLA Dashboard is a read-only operational reporting surface built on
the existing SLA snapshot and ticket domain.

Implemented:

- Server-side SLA metrics and aggregation
- Paginated SLA ticket drill-down
- Active, at-risk, breached, and resolved views
- First-response and resolution compliance metrics
- First-response and resolution breach views
- Priority, team, and created-date filtering
- Organization-scoped reporting
- Ticket detail navigation
- `/reports` reporting landing page
- `/reports/sla` SLA Dashboard route
- Frontend API client and React Query integration
- Dedicated SLA dashboard frontend tests

The dashboard deliberately reuses the existing `TicketSla` data and does
not introduce a duplicate SLA reporting model. Existing SLA warning,
breach, escalation, audit, and realtime semantics remain unchanged.

Frontend verification:

```text
TypeScript           PASS
Lint                 PASS
Test Files           7/7 passed
Tests                86/86 passed
Production build     SUCCESS
Failures             0
```

The `/reports` page is the reporting entry point. The SLA Dashboard is the
first implemented report; future reports are explicitly presented as
coming soon rather than using fabricated metrics.

### Phase 6-F — Full SLA Verification

**COMPLETE AND VERIFIED — 2026-10-05**

```text
Backend unit tests             3/3 files, 29/29 tests passed
Focused SLA Dashboard E2E      25/25 tests passed
SLA Breach Operations E2E      2/2 tests passed
SLA Policy E2E                  43/43 tests passed
Realtime SLA E2E                3/3 tests passed
Realtime room routing E2E       6/6 tests passed
Realtime broadcaster E2E       13/13 tests passed
Full API E2E                    24/24 files, 319/319 tests passed
API failures                    0
API lint                        0 warnings / 0 errors
API production build            SUCCESS
Frontend TypeScript             PASS
Frontend lint                   PASS
Frontend tests                  7/7 files, 86/86 tests passed
Frontend production build       SUCCESS
```

Phase 6 — SLA is complete and verified. Phase 7 — Analytics remains in progress overall; 7-A through 7-C.4, 7-E.1 through 7-E.10, and 7-F TAT Reports are complete and verified.

## Phase 7 — Analytics

**Status: IN PROGRESS**

Phase 7 turns the existing ticket, activity, SLA, assignment, organization,
and ticket-library data into organization-scoped analytics and reporting.
Analytics should reuse existing domain data and services rather than create
duplicate operational models.

### 7-A — Analytics Foundation

**COMPLETE AND VERIFIED**

Implemented organization-scoped reporting/query boundaries, reusable
server-side aggregation services, supported filters, pagination/drill-down
contracts, and analytics API foundations.

Verification:

```text
Analytics Foundation E2E    28/28 tests passed
API lint                    0 warnings / 0 errors
API production build        SUCCESS
```

### 7-B — Analytics Dashboard

**COMPLETE AND VERIFIED**

Implemented the executive/operations overview using existing ticket and SLA
data, including ticket KPIs, SLA/TAT metrics, ticket volume over time,
priority distribution, team workload, and assignee workload.

The ticket-volume visualization normalizes sparse daily API results across the
selected date range so zero-count days remain visible.

Verification:

```text
Frontend test files          8/8 passed
Frontend tests               108/108 passed
Frontend TypeScript          PASS
Frontend lint                PASS
Frontend production build    SUCCESS
API Analytics Dashboard E2E  20/20 tests passed
API lint                     PASS
API production build         SUCCESS
```

### 7-C — Product Analytics

The Product Dashboard required a defined product taxonomy in the ticket
domain. Because the repository previously had no Product model or Ticket
product relationship, the taxonomy foundation was implemented first rather
than treating `TicketType` as a product/category surrogate.

#### 7-C.0 — Product Taxonomy Foundation

**COMPLETE AND VERIFIED**

Implemented:

- Organization-scoped `Product` Prisma model
- Organization-scoped unique product names
- Active/inactive product lifecycle
- Nullable `Ticket.productId` relationship
- Organization-scoped Product CRUD API
- ADMIN/OWNER product-management authorization
- Product validation and duplicate-name protection
- Ticket create/update support for products
- Ticket product clearing
- Ticket-list filtering by product
- Product metadata in ticket responses
- Inactive-product assignment protection
- Cross-organization product protection
- Product ticket counts

Verification:

```text
Product E2E                   46/46 tests passed
API unit tests                29/29 tests passed
API lint                      0 warnings / 0 errors
API TypeScript check          PASS
API production build          SUCCESS
```

The API TypeScript check was also used to correct the API TypeScript project
boundary so production source is separated from Vitest/Jest test files.

#### 7-C.1 — Product Dashboard API

**COMPLETE AND VERIFIED**

Implemented and verified the organization-scoped Product Dashboard reporting
API, including product volume, active/resolved metrics, priority distribution,
SLA/TAT metrics, trends, product filtering, inactive-product historical
reporting, unclassified-ticket handling, and organization isolation.

#### 7-C.2 — Product Dashboard UI

**COMPLETE AND VERIFIED**

Implemented the Product Analytics Dashboard at `/reports` with product/date
filtering, workload and volume comparison, SLA/TAT metrics, priority
distribution, trends, and product drill-down.

#### 7-C.3 — Product Drill-down

**COMPLETE AND VERIFIED**

Connected product analytics to the existing organization-scoped Ticket Library
using the URL-backed `productId` filter without introducing a duplicate
reporting endpoint.

#### 7-C.4 — Product Verification

**COMPLETE AND VERIFIED**

Verified aggregation correctness, authorization, organization isolation,
empty/no-data behavior, filters, inactive-product reporting, drill-down,
frontend contracts, TypeScript/lint/tests, production builds, and analytics
regression compatibility.

### 7-D — Employee Dashboard

**NEXT IMPLEMENTATION — PLANNED**

Agent/employee performance and workload reporting.

### 7-E — SLA Reports

**COMPLETE AND VERIFIED**

The dedicated `/reports/sla-reports` route provides SLA summary KPIs, trends,
priority/team/assignee breakdowns, first-response versus resolution SLA
comparison, filters, breach/at-risk analysis, and drill-down links. The
operational SLA Dashboard remains at `/reports/sla`.

Frontend verification: TypeScript PASS, lint PASS, 175 tests passed across 13
test files, and production build PASS. Manual browser verification remains
recommended; dashboard view-query preselection is not claimed as verified.

### 7-F — TAT Reports

**COMPLETE AND VERIFIED**

The dedicated `/reports/tat` page is linked from `/reports` and reports actual
elapsed operational time independently of SLA compliance.

Metric definitions:

- **Time to first response:** `TicketSla.firstRespondedAt - Ticket.createdAt`.
- **Time to resolution:** `Ticket.resolvedAt - Ticket.createdAt`.
- **Statistics:** average, median/P50, and supported percentiles calculated from
  eligible ticket-level durations.
- **Dimensions:** priority, team, assignee, and product.
- **Trend:** daily buckets based on ticket creation date.
- **Drill-down:** paginated resolved-ticket rows using actual resolution time.

Missing endpoint timestamps are excluded from the relevant duration sample;
negative elapsed durations are excluded as invalid. These cases are not
converted into zero-minute samples. The summary resolved-ticket count is kept
separate from the drill-down pagination total: the latter counts only resolved
tickets with valid non-negative resolution durations and uses the same predicate
as the returned rows. Shared analytics filters, authentication, authorization,
and organization isolation are preserved. No duplicate operational persistence
was introduced.

Verification:

```text
Focused TAT API E2E       12/12 tests passed
Full API E2E              PASS (user-confirmed; exact total not recorded here)
Frontend TypeScript       PASS
Frontend production build PASS
Next.js route             /reports/tat present
UI                        Manually verified
```

The test output includes Vite configuration warnings and Resend HTTP 422 logs
for `example.com` test recipients. The user confirmed that all tests pass; these
messages were not reported as failed test assertions.

### 7-G — Usage Reports

**PLANNED**

Organization usage analytics from persisted ticket, activity, comment,
attachment, approval, notification, and supported user-activity data.

### 7-H — Ticket Library Reports

**COMPLETE AND VERIFIED**

Implemented the dedicated `/reports/ticket-library` page using the existing
organization-scoped Ticket Library query model.

Implemented:

- Ticket count breakdowns by status, priority, team, and assignee
- Created-date or updated-date trend buckets
- Unassigned-ticket and unassigned-team counts
- Live matching-ticket counts for each saved filter
- Filtered totals using the same shared predicate as Ticket Library results
- Search, status, priority, type, product, team, assignee, requester, created
  and updated date ranges, unassigned, unassigned-team, and SLA-breached filters
- Filter-preserving facet drill-down links into `/tickets`
- URL-backed filters, organization isolation, and inverted date-range validation
- Reports navigation integration and dedicated frontend/API tests

Saved-filter counts reflect each saved filter's current matching ticket count,
not historical usage events. No duplicate ticket persistence or independent
filtering source of truth was introduced.

Verification:

```text
Focused Ticket Library Reports API E2E   2/2 tests passed
Full API E2E regression                  31 files, 506/506 tests passed
Frontend drill-down tests                6/6 tests passed
Full frontend test suite                 15 files, 194/194 tests passed
API lint                                 0 warnings / 0 errors
API production build                     PASS
Frontend TypeScript check                PASS
Frontend lint                            PASS
Frontend production build                PASS
Static page generation                   16/16 pages passed
Route                                    /reports/ticket-library present
Manual UI verification                   PASS (user-confirmed)
```

The full API E2E run logged non-failing Resend HTTP 422 messages for
`example.com` test recipients; all 506 test assertions passed. The user
confirmed that the UI was verified and behaved as expected.

### 7-I — Exports

**PLANNED**

Controlled CSV, XLSX where justified, and JSON exports using the same
organization-scoped metric/query definitions as on-screen reports.

### 7-J — Full Analytics Verification

**PLANNED**

Final Phase 7 verification will cover analytics tests, report E2E coverage,
organization isolation, permissions, date/time boundaries, empty states,
aggregation correctness, drill-downs, exports, backend/frontend lint,
TypeScript, builds, full regression, and documentation.

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

-   7-A Analytics Foundation --- **COMPLETE AND VERIFIED**
-   7-B Analytics Dashboard --- **COMPLETE AND VERIFIED**
-   7-C.0 Product Taxonomy Foundation --- **COMPLETE AND VERIFIED**
-   7-C.1 Product Dashboard API --- **COMPLETE AND VERIFIED**
-   7-C.2 Product Dashboard UI --- **COMPLETE AND VERIFIED**
-   7-C.3 Product Drill-down --- **COMPLETE AND VERIFIED**
-   7-C.4 Product Verification --- **COMPLETE AND VERIFIED**
-   7-D Employee Dashboard --- **PLANNED**
-   7-E SLA Reports --- **COMPLETE AND VERIFIED**
-   7-F TAT Reports --- **COMPLETE AND VERIFIED**
-   7-G Usage Reports --- **PLANNED**
-   7-H Ticket Library Reports --- **COMPLETE AND VERIFIED**
-   7-I Exports --- **PLANNED**
-   7-J Full Analytics Verification --- **PLANNED**

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
Phase 6-C SLA Warnings            COMPLETE AND VERIFIED
Phase 6-D SLA Breach Operations   COMPLETE AND VERIFIED
Phase 6-E SLA Dashboard            COMPLETE AND VERIFIED
Phase 6-F Full SLA Verification    COMPLETE AND VERIFIED
Phase 7-A Analytics Foundation     COMPLETE AND VERIFIED
Phase 7-B Analytics Dashboard      COMPLETE AND VERIFIED
Phase 7-C.0 Product Taxonomy        COMPLETE AND VERIFIED
Phase 7-C.1 Product Dashboard API    COMPLETE AND VERIFIED
Phase 7-C.2 Product Dashboard UI     COMPLETE AND VERIFIED
Phase 7-C.3 Product Drill-down        COMPLETE AND VERIFIED
Phase 7-C.4 Product Verification      COMPLETE AND VERIFIED
Phase 7-E SLA Reports UI              COMPLETE AND VERIFIED
Phase 7-F TAT Reports                 COMPLETE AND VERIFIED
Phase 7-H Ticket Library Reports       COMPLETE AND VERIFIED
```

## Phase 6 — SLA

**Status: COMPLETE AND VERIFIED**

Phase 3-H established the underlying SLA automation foundation. Phase 6
focuses on the product-level SLA experience and operational workflow.
Phase 6-F is complete and verified; Phase 7 Analytics is now the active roadmap.

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
Phase 6-A through Phase 6-F are **COMPLETE AND VERIFIED**.
Phase 7-A through 7-C.4 are **COMPLETE AND VERIFIED**.
Phase 7-E.1 through 7-E.10 — SLA Reports — are **COMPLETE AND VERIFIED**.
Phase 7-F — TAT Reports — is **COMPLETE AND VERIFIED**.
Phase 7-H — Ticket Library Reports — is **COMPLETE AND VERIFIED**.

Phase 7 remains in progress overall. The next implementation is **7-D —
Employee Dashboard**, covering employee workload and performance reporting
within the existing organization and permission boundaries. 7-G Usage Reports,
7-I Exports, and 7-J Full Analytics Verification remain planned for later.
