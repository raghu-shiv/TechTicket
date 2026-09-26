# TechTicket Implementation Plan

This document tracks the implementation progress of TechTicket.

The roadmap is intentionally incremental: each feature should be
implemented, built, and verified before moving to the next dependent
feature.

# Current Phase

## Phase 4 --- Workflow / Approval & Reliability Checkpoint

### Status: COMPLETE AND VERIFIED --- 2026-09-24

The implemented Phase 4 workflow scope through **4-G** is complete and
verified. This includes approval workflow, approval audit/activity
integration, approval notifications, notification reliability testing,
ticket regression testing, full API E2E regression, lint verification,
and production-build verification.

This completion does **not** claim that future Phase 4 roadmap items
such as Realtime/WebSockets, Unassigned Queue, or Ticket
History Refinement are implemented.

# Phase 3 --- Ticket Core

## 3-F --- Ticketing Core

**Status: COMPLETE**

Implemented and verified:

- Ticket database model and PostgreSQL persistence
- Ticket CRUD
- Ticket assignment and team assignment
- Ticket status workflow
- Ticket filtering and pagination
- Public/internal comments
- Ticket attachments
- MinIO-backed object storage
- Ticket activity/audit history
- Ticket relations
- Advanced search/filtering
- SLA automation

Known limitation:

- Current ticket-number generation is not fully atomic under high
  concurrency. This remains a future production-hardening item.

## 3-G --- Search / Filtering / Pagination Expansion

**Status: COMPLETE AND VERIFIED**

Implemented:

- Ticket keyword search
- Created-date filtering
- Controlled sorting
- PostgreSQL full-text search
- Ticket-number partial matching
- Relationship filtering
- Unassigned and updated-date filtering
- Organization-scoped pagination/filtering

Known limitation:

- No dedicated PostgreSQL `tsvector`/GIN index has been added yet.

## 3-H --- SLA & Automation

**Status: COMPLETE AND VERIFIED**

Implemented:

- SLA policies
- Priority-based SLA
- Organization-specific policies
- Ticket SLA snapshots
- First-response and resolution SLA tracking
- SLA due-time calculation
- Breach detection
- Reopen behavior
- Breach escalation persistence
- Breach event emission
- Breach audit activities

## 3-I --- Ticket Activity, Audit History & Notifications

**Status: COMPLETE AND VERIFIED**

Implemented:

- Ticket activity/audit history
- Organization-scoped activity retrieval
- Ticket lifecycle activities
- Comment activities
- SLA breach activities
- Assignment/status/comment notifications
- Resend email infrastructure
- Redis/BullMQ queue and worker
- Recipient de-duplication and actor exclusion
- Approval notification integration
- Notification processor organization isolation
- Notification E2E coverage

Known testing note:

- Resend's development/testing environment rejects arbitrary
  `example.com` recipients. `delivered@resend.dev` was used for live
  provider verification.
- Some older notification presentation wording remains a future polish
  item.

# Phase 4 --- Workflow

## 4-A --- Approval Database Model

**Status: COMPLETE**

`TicketApproval` persistence and required relationships are implemented.

## 4-B --- Approval Domain / Service / Permission Model

**Status: COMPLETE**

Approval domain behavior, service logic, and permission requirements are
implemented.

## 4-C --- Approval API / Controller Layer

**Status: COMPLETE**

Approval API endpoints are implemented.

## 4-D --- Approval Workflow Integration

**Status: COMPLETE AND VERIFIED**

Approval creation and lifecycle operations are integrated with the
ticket domain.

## 4-E --- Approval Audit / Activity Integration

**Status: COMPLETE AND VERIFIED --- 2026-09-22**

Approval lifecycle events use the existing ticket activity
infrastructure.

Activity types:

```text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

Verified:

- Approval request creation and pending retrieval
- Authorization boundaries
- Agent approval, rejection, and cancellation
- Complete approval activity history
- Approval metadata including approval ID, ticket number, approver,
  status, comment, actor, and timestamp

Automatic ticket-status transitions from approval outcomes remain
deferred/configurable because those business rules are not defined by
the SOP.

## 4-F --- Approval Notification Integration

**Status: COMPLETE AND VERIFIED --- 2026-09-23**

Approval lifecycle events use the existing Redis/BullMQ email
infrastructure.

Recipient routing:

```text
REQUESTED  -> approver
APPROVED   -> requester
REJECTED   -> requester
CANCELLED  -> approver
```

Implemented:

- Approval notification event contract
- Four approval lifecycle notification events
- Organization-scoped notification jobs
- Organization membership validation in the worker
- Human-readable ticket numbers in notification content
- Compatibility with existing ticket notification producers

Live Resend delivery was verified with `delivered@resend.dev`.

`admin@example.com` was correctly resolved, but Resend rejected that
`example.com` address with HTTP 422 in its development environment. This
is a provider test-environment restriction rather than a
recipient-routing failure.

# 4-G --- Integration & Reliability Testing

**Status: COMPLETE AND VERIFIED --- 2026-09-24**

## 4-G.1 --- Test Infrastructure

**COMPLETE**

Vitest E2E infrastructure and test setup are in place.

## 4-G.2 --- Health + Authentication Tests

**COMPLETE AND VERIFIED**

Verified health, authentication flows, authenticated API access, and
valid Better Auth session behavior.

## 4-G.3 --- Organization / RBAC Tests

**COMPLETE AND VERIFIED**

Verified organization context, membership boundaries, permission/role
authorization, and organization-scoped access.

## 4-G.4 --- Approval API Tests

**COMPLETE AND VERIFIED**

Verified approval creation, retrieval, authorization, lifecycle actions,
cancellation, invalid states, and organization boundaries.

## 4-G.5 --- Notification Integration & Reliability Tests

**COMPLETE AND VERIFIED**

Verified:

- Notification queue/job foundation
- Approval notification integration
- Notification payloads and recipients
- All supported approval notification events
- Cancellation notification
- Queue processor behavior
- Organization isolation
- Deterministic test cleanup
- Full E2E regression

Processor tests cover valid recipients, cross-organization recipients,
invalid recipients, and unsupported notification jobs.

Notification tests avoid destructive global BullMQ cleanup that can
interfere with active workers or locked jobs.

## 4-G.6 --- Ticket Regression Tests

**COMPLETE AND VERIFIED**

Dedicated `test/ticket.e2e-spec.ts` coverage protects:

- Ticket creation
- Retrieval/details
- List/search/filtering/pagination
- Authorization and organization isolation
- Assignment/team assignment
- Status workflow
- Comments/history
- Attachments
- Approval/ticket interaction
- Validation and error paths

Verified dedicated ticket result:

```text
test/ticket.e2e-spec.ts
56/56 tests passed
```

## 4-G.7 --- Full API E2E Test Run

**COMPLETE AND VERIFIED --- 2026-09-24**

Command:

```text
docker compose exec api npm run test:e2e
```

Result:

```text
Test Files  8 passed (8)
Tests       108 passed (108)
Failures    0
Duration    35.70s
```

## 4-G.8 --- Lint

**COMPLETE AND VERIFIED --- 2026-09-24**

Command:

```text
docker compose exec api npm run lint
```

Result:

```text
Found 0 warnings and 0 errors.
Finished in 380ms on 101 files with 96 rules using 16 threads.
```

The seven previous warnings were removed with minimal
behavior-preserving cleanup:

- Four unused catch parameters in `storage.service.ts`
- Two unused catch parameters in `ticket-attachments.service.ts`
- One empty `auth.middleware.ts` file

## 4-G.9 --- Production Build

**COMPLETE AND VERIFIED --- 2026-09-24**

Command:

```text
docker compose exec api npm run build
```

Result:

```text
Found 0 errors.
```

## 4-G.10 --- Final Verification + Documentation

**COMPLETE AND VERIFIED --- 2026-09-24**

Final checkpoint:

```text
E2E test files       8/8 passed
E2E tests            108/108 passed
Lint                 0 warnings / 0 errors
Production build     0 errors
```

`PLANS.md` and `README.md` were updated to reflect this verified
checkpoint.

# Phase 4 Completion Boundary

Completed implemented/verified scope:

- Approval data model
- Approval service/API
- Approval permissions
- Approval workflow integration
- Approval audit/activity integration
- Approval lifecycle notifications
- Notification processor tests
- Notification organization isolation
- Notification test cleanup
- Notification E2E regression
- Ticket regression testing
- Full API E2E verification
- Lint verification
- Production build verification

Still planned:

- Realtime / WebSockets
- Unassigned queue
- Ticket history refinement

# Recommended Development Phases

## Phase 1 --- Foundation

- Monorepo
- Docker
- Next.js
- NestJS
- PostgreSQL
- Redis
- Prisma
- CI
- ESLint
- Prettier
- Environment management
- UI foundation

## Phase 2 --- Identity

- Login
- Logout
- Refresh tokens
- Users
- Roles
- Permissions
- Profile

## Phase 3 --- Ticket Core

- Create ticket
- Ticket list
- Ticket details
- Assignment
- Status
- Priority
- Comments
- Attachments
- History

## Phase 4 --- Workflow

- Approvals
- Approval notifications
- Unassigned queue
- Ticket history
- Notifications
- Realtime updates

## Phase 5 --- Productivity

- Ticket library
- Saved filters

## Phase 6 --- SLA

- SLA policies
- SLA timers
- SLA warnings
- SLA breaches
- SLA dashboard

## Phase 7 --- Analytics

- Dashboard
- Product dashboard
- Employee dashboard
- SLA reports
- TAT reports
- Usage reports
- Ticket library reports
- Exports

## Phase 8 --- Production Hardening

- Unit tests
- Integration tests
- E2E tests
- Security audit
- Performance testing
- Database optimization
- Logging
- Monitoring
- Backups
- CI/CD
- Production Docker

# Engineering Rules

For each remaining feature:

1.  Inspect the current implementation before changing it.
2.  Make the smallest change required.
3.  Preserve organization scoping.
4.  Preserve role-based authorization.
5.  Reuse existing services/modules where appropriate.
6.  Avoid unnecessary dependencies.
7.  Run a backend build.
8.  Run focused API verification.
9.  Run relevant E2E regression tests.
10. Only mark an item complete after verification.
11. Record known limitations explicitly.
12. Do not invent approval or SLA business rules not defined by the SOP.
13. Keep asynchronous notification processing organization-scoped.
14. Avoid destructive test cleanup that can interfere with running
    workers.

# Current Project Checkpoint

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

# Latest Verification Commands

```powershell
docker compose exec api npm run test:e2e
docker compose exec api npm run lint
docker compose exec api npm run build
```

All three commands have been verified successfully at the latest
checkpoint.

# Next Development Direction

Phase 4-G is complete. Continue with the roadmap rather than introducing
speculative architecture.

Remaining workflow candidates:

- Realtime / WebSockets
- Unassigned queue
- Ticket history refinement

After the remaining workflow scope, proceed into Productivity,
Analytics, and Production Hardening.
