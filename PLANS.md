# TechTicket Implementation Plan

This document tracks the implementation roadmap and verified progress for TechTicket. Each feature is implemented incrementally and verified before dependent work proceeds.

## Current Phase

### Phase 4 — Workflow

**Phase 4-J — Ticket History Refinement: COMPLETE AND VERIFIED**

Completed workflow scope:

- Phase 4-G — Integration & Reliability Testing
- Phase 4-H — Realtime / WebSockets
- Phase 4-I — Unassigned Queue
- Phase 4-J — Ticket History Refinement

### Current roadmap

- Phase 4-J — Ticket History Refinement: **COMPLETE AND VERIFIED**
- Phase 5 — Productivity: **PLANNED**
- Phase 6 — SLA: **PLANNED**
- Phase 7 — Analytics: **PLANNED**
- Phase 8 — Production Hardening: **PLANNED**

---

# Phase 3 — Ticket Core

## 3-F — Ticketing Core

**Status: COMPLETE**

Implemented:

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

- Ticket-number generation is not fully atomic under high concurrency. This remains a future production-hardening item.

## 3-G — Search / Filtering / Pagination Expansion

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

## 3-H — SLA & Automation

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

## 3-I — Ticket Activity, Audit History & Notifications

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

---

# Phase 4 — Workflow

## 4-A — Approval Database Model

**Status: COMPLETE**

`TicketApproval` persistence and required relationships are implemented.

## 4-B — Approval Domain / Service / Permission Model

**Status: COMPLETE**

Approval domain behavior, service logic, and permission requirements are implemented.

## 4-C — Approval API / Controller Layer

**Status: COMPLETE**

Approval API endpoints are implemented.

## 4-D — Approval Workflow Integration

**Status: COMPLETE AND VERIFIED**

Approval creation and lifecycle operations are integrated with the ticket domain.

## 4-E — Approval Audit / Activity Integration

**Status: COMPLETE AND VERIFIED**

Approval lifecycle events use the existing ticket activity infrastructure.

Activity types:

```text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

## 4-F — Approval Notification Integration

**Status: COMPLETE AND VERIFIED**

Approval lifecycle events use the existing Redis/BullMQ email infrastructure.

Recipient routing:

```text
REQUESTED  -> approver
APPROVED   -> requester
REJECTED   -> requester
CANCELLED  -> approver
```

## 4-G — Integration & Reliability Testing

**Status: COMPLETE AND VERIFIED**

Verified:

- Test infrastructure
- Health and authentication
- Organization/RBAC boundaries
- Approval API behavior
- Notification integration and processor behavior
- Ticket regression coverage
- Full API E2E regression
- Lint
- Production build
- Final documentation checkpoint

## 4-H — Realtime / WebSockets

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

- Authenticated organization rooms
- Organization membership enforcement
- Cross-organization isolation
- Secure ticket rooms
- Ticket ownership validation
- Ticket room lifecycle behavior
- Domain event broadcasting
- Ticket lifecycle realtime events
- Approval lifecycle realtime events
- SLA breach realtime events
- Notification-created realtime events
- User-room authorization
- Focused realtime routing/security E2E coverage
- Realtime hardening and lifecycle cleanup
- Full lint/build/E2E verification

## 4-I — Unassigned Queue

**Status: COMPLETE AND VERIFIED**

The unassigned queue uses the existing ticket assignment model (`assigneeId = null`) and does not introduce a separate queue data model.

Completed:

- 4-I.1 — Define unassigned queue behavior
- 4-I.2 — Verify current unassigned ticket filtering
- 4-I.3 — Dedicated unassigned-queue API coverage
- 4-I.4 — Authorization and organization-isolation coverage
- 4-I.5 — Sorting/pagination/filter interaction coverage
- 4-I.6 — Assignment transition coverage
- 4-I.7 — Realtime queue membership changes
- 4-I.8 — Full verification

Queue membership transitions:

```text
UNASSIGNED -> assign   -> removed from unassigned queue
ASSIGNED   -> unassign -> added to unassigned queue
```

## 4-J — Ticket History Refinement

**Status: COMPLETE AND VERIFIED**

Completed:

- 4-J.1 — Derived activity categories
- 4-J.2 — Timeline metadata
- 4-J.3 — Human-readable event descriptions
- 4-J.4 — Actor presentation
- 4-J.5 — History filtering
- 4-J.6 — Pagination
- 4-J.7 — Realtime history integration
- 4-J.8 — Full verification

Ticket history supports:

- Derived activity categories
- Human-readable activity descriptions
- Timeline date/time/timestamp metadata
- Actor presentation data
- Type/category/actor filtering
- Paginated history responses
- Realtime activity-history events
- Organization and ticket scoping
- REST and realtime regression coverage

Final Phase 4-J verification:

```text
E2E test files       17/17 passed
E2E tests            208/208 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

---

# Recommended Development Phases

## Phase 1 — Foundation

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

## Phase 2 — Identity

- Login
- Logout
- Refresh tokens
- Users
- Roles
- Permissions
- Profile

## Phase 3 — Ticket Core

- Create ticket
- Ticket list
- Ticket details
- Assignment
- Status
- Priority
- Comments
- Attachments
- History

## Phase 4 — Workflow

- Approvals
- Approval notifications
- Unassigned queue
- Ticket history
- Notifications
- Realtime updates

## Phase 5 — Productivity

- Ticket library
- Saved filters

## Phase 6 — SLA

- SLA policies
- SLA timers
- SLA warnings
- SLA breaches
- SLA dashboard

## Phase 7 — Analytics

- Dashboard
- Product dashboard
- Employee dashboard
- SLA reports
- TAT reports
- Usage reports
- Ticket library reports
- Exports

## Phase 8 — Production Hardening

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

---

# Engineering Rules

For each remaining feature:

1. Inspect the current implementation before changing it.
2. Make the smallest change required.
3. Preserve organization scoping.
4. Preserve role-based authorization.
5. Reuse existing services/modules where appropriate.
6. Avoid unnecessary dependencies.
7. Run a backend build.
8. Run focused API verification.
9. Run relevant E2E regression tests.
10. Mark an item complete only after verification.
11. Record known limitations explicitly.
12. Do not invent approval or SLA business rules not defined by the SOP.
13. Keep asynchronous notification processing organization-scoped.
14. Avoid destructive test cleanup that can interfere with running workers.

---

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

# Latest Verification Commands

```powershell
docker compose exec api npm run test:e2e
docker compose exec api npm run lint
docker compose exec api npm run build
```

Latest full verification:

```text
E2E test files       17/17 passed
E2E tests            208/208 passed
Lint                 0 warnings / 0 errors
Production build     SUCCESS
```

# Next Development Direction

Phase 4 is complete through ticket-history refinement.

The next planned implementation area is **Phase 5 — Productivity**, beginning with the ticket library and saved filters.

Continue from the verified repository state and avoid speculative architecture changes.
