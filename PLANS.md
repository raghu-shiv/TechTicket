# TechTicket Implementation Plan

This document tracks the implementation progress of TechTicket.

The roadmap is intentionally incremental: each feature should be
implemented, built, and verified before moving to the next dependent
feature.

# Current Phase

## Phase 3-F --- Ticketing Core

### Status: In Progress

The ticketing backend foundation and core workflows are substantially
implemented.

# Completed Work

## 3-F-1 --- Ticket Database Model

**Status: COMPLETE**

Implemented ticket persistence using Prisma/PostgreSQL.

Ticket fields include:

-   Ticket ID
-   Ticket number
-   Organization
-   Requester
-   Assignee
-   Team
-   Title
-   Description
-   Status
-   Priority
-   Type
-   Created timestamp
-   Updated timestamp
-   Resolved timestamp
-   Closed timestamp

Indexes are present for organization-scoped ticket queries and common
filtering dimensions.

## 3-F-2 --- Ticket CRUD

**Status: COMPLETE**

Implemented:

-   Create ticket
-   List tickets
-   Get ticket
-   Update ticket
-   Delete ticket

Ticket numbers are generated in the service layer.

### Known limitation

The current ticket-number generation approach is not fully atomic under
high concurrency. This has been acknowledged and is not being treated as
solved production-grade sequencing yet.

## 3-F-3 --- Ticket Assignment

**Status: COMPLETE AND VERIFIED**

Implemented:

-   Assignee assignment
-   Team assignment
-   Clearing assignments
-   Organization membership validation
-   Active-team validation
-   Team membership validation
-   Prevention of assigning `REQUESTER` users

Endpoint:

``` text
PATCH /api/v1/tickets/:ticketId/assignment
```

Allowed roles:

``` text
OWNER
ADMIN
AGENT
```

## 3-F-4 --- Ticket Status Workflow

**Status: COMPLETE AND VERIFIED**

Implemented allowed transitions:

``` text
OPEN -> IN_PROGRESS
OPEN -> PENDING

IN_PROGRESS -> PENDING
IN_PROGRESS -> RESOLVED

PENDING -> IN_PROGRESS
PENDING -> RESOLVED

RESOLVED -> CLOSED
RESOLVED -> IN_PROGRESS

CLOSED -> none
```

Implemented timestamp behavior:

-   `RESOLVED` sets `resolvedAt`.
-   `CLOSED` sets `closedAt`.
-   Reopening from `RESOLVED` clears `resolvedAt` and `closedAt`.
-   `CLOSED` cannot be reopened.
-   Same-status transitions return an error.

## 3-F-5 --- Ticket Filtering / Pagination

**Status: COMPLETE AND VERIFIED**

Implemented organization-scoped ticket list pagination and filtering.

Supported query parameters include:

``` text
page
limit
status
priority
type
assigneeId
teamId
requesterId
```

Maximum page size:

``` text
100
```

Results are ordered newest first.

## 3-F-6 --- Ticket Comments

**Status: COMPLETE AND VERIFIED**

Ticket comments support:

-   Public comments
-   Internal comments
-   Listing
-   Creation
-   Editing
-   Deletion

Internal comments are restricted to `OWNER`, `ADMIN`, and `AGENT`;
requesters only see public comments.

## Attachments

### Attachment Database Model

**Status: COMPLETE**

Implemented `TicketAttachment` persistence with ticket, uploader, file
name, object key, MIME type, size, and creation timestamp.

### Object Storage Layer

**Status: COMPLETE AND VERIFIED**

Implemented MinIO-backed storage abstraction.

Development bucket:

``` text
ticket-attachments
```

### Multipart Attachment Upload

**Status: COMPLETE AND VERIFIED**

Implemented multipart upload using Multer with attachment validation.

Maximum configured attachment size:

``` text
10 MB
```

### Attachment Listing

**Status: COMPLETE AND VERIFIED**

Implemented:

``` text
GET /api/v1/tickets/:ticketId/attachments
```

### Attachment Download + Deletion

**Status: COMPLETE AND VERIFIED**

Implemented:

-   Attachment download
-   Correct MIME type response
-   Original filename preservation
-   Attachment deletion
-   MinIO object cleanup
-   PostgreSQL metadata cleanup
-   Cross-ticket isolation
-   Cross-organization isolation

## Approval Workflow

### 4-E --- Approval Audit/Activity Integration

**Status: COMPLETE AND VERIFIED --- 2026-09-22**

Approval lifecycle events are integrated with the existing ticket
activity/audit history infrastructure.

Implemented activity types:

``` text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

Verification used ticket `TKT-000001` and confirmed:

-   Admin/requester successfully requested approval from the designated
    Agent (`201 Created`).
-   The approval was retrievable in `PENDING` state and included
    `ticketNumber: TKT-000001`.
-   The requester/Admin attempting to approve the request was rejected
    with `403 Forbidden`.
-   The designated Agent successfully approved the request
    (`201 Created`).
-   A second approval cycle was successfully rejected by the designated
    Agent.
-   A third approval cycle was successfully cancelled by the designated
    Agent.
-   Ticket activity history contained all four approval lifecycle
    activity types.
-   Activity metadata included `approvalId`, `ticketNumber`,
    `approverId`, `status`, and `comment`, with actor and timestamp
    information.
-   Approval activity reused the existing ticket activity infrastructure
    rather than introducing a separate audit system.

> Automatic ticket-status transitions based on approval outcomes remain
> intentionally deferred/configurable because the SOP does not yet
> define those business rules.

### 4-F --- Approval Notification Integration

**Status: COMPLETE AND VERIFIED --- 2026-09-23**

Approval lifecycle events are integrated with the existing Redis/BullMQ
email notification infrastructure.

Implemented:

-   Approval notification event contract includes `approvalId`,
    `ticketId`, `ticketNumber`, `organizationId`, `actorId`,
    `requesterId`, `approverId`, status, comment, and event timestamp.
-   Notification handlers subscribe to:
    -   `approval.requested`
    -   `approval.approved`
    -   `approval.rejected`
    -   `approval.cancelled`
-   Recipient routing:
    -   `REQUESTED` -\> approver
    -   `APPROVED` -\> requester
    -   `REJECTED` -\> requester
    -   `CANCELLED` -\> approver
-   Approval notifications use the human-readable ticket number, such as
    `TKT-000001`.
-   Notification jobs carry `organizationId`.
-   The notification worker validates recipient organization membership
    before resolving email addresses.
-   Existing ticket notification producers provide `organizationId` to
    the shared notification queue.
-   No separate notification-type enum was introduced because the
    existing notification architecture is event-based.

#### 4-F.6 Verification

Verification was completed against `TKT-000001`.

Confirmed:

-   `REQUESTED`: notification routed to the approver, organization
    context was correct, and `TKT-000001` was used.
-   `APPROVED`: notification routed to the requester, organization
    context was correct, and `TKT-000001` was used.
-   `REJECTED`: notification routed to the requester, organization
    context was correct, and `TKT-000001` was used.
-   `CANCELLED`: notification routed to the approver, organization
    context was correct, and `TKT-000001` was used.
-   Cross-organization recipients were excluded by notification-worker
    membership validation.
-   A single tested approval lifecycle operation produced one
    notification job rather than duplicate notification jobs.
-   Live provider delivery was successfully verified with the Resend
    test recipient `delivered@resend.dev`.
-   The requester test address `admin@example.com` was correctly
    resolved for approval notifications, but Resend's development
    environment rejected delivery to the `example.com` address with HTTP
    `422`; this was a provider test-environment restriction rather than
    a recipient-routing failure.
-   Existing notification behavior remained compatible after adding
    organization context to the shared queue job.
-   Backend build completed successfully with `0 errors`.

#### 4-F.7 Build

**Status: COMPLETE AND VERIFIED**

``` text
docker compose exec api npm run build
Found 0 errors.
```

#### 4-F.8 Documentation

**Status: COMPLETE --- 2026-09-23**

Updated:

-   `PLANS.md`
-   `README.md`

The approval notification integration, organization-scoped recipient
validation, verification results, and current testing limitation are
documented in both project documents.

# Upcoming Roadmap

## 3-G --- Search / Filtering / Pagination Expansion

**Status: COMPLETE AND VERIFIED**

Completed capabilities include:

-   Ticket keyword search
-   Created-date range filtering
-   Controlled sorting
-   PostgreSQL full-text search for title/description
-   Ticket-number partial matching
-   Additional relationship support
-   Advanced filtering including unassigned and updated-date filters
-   Organization-scoped filtering and pagination

Known limitation:

-   No dedicated PostgreSQL `tsvector`/GIN index has been added yet;
    this remains a future performance optimization.

## Part 3-H --- SLA & Automation

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

-   SLA policies
-   Priority-based SLA
-   Organization-specific SLA policies
-   Ticket SLA snapshots
-   First-response SLA tracking
-   Resolution SLA tracking
-   SLA due-time calculation
-   SLA breach detection
-   SLA reopen behavior
-   SLA breach escalation persistence
-   SLA breach event emission
-   SLA breach audit activities

## Part 3-I --- Ticket Activity, Audit History & Notifications

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

-   Ticket activity/audit history persistence
-   Organization-scoped activity retrieval
-   Ticket creation/update activities
-   Priority/status/assignee/team activities
-   Comment-added/updated/deleted activities
-   SLA breach activities
-   Assignment notifications
-   Status-change notifications
-   Comment notifications
-   Email notification infrastructure using Resend
-   Redis/BullMQ notification queue and worker
-   Recipient de-duplication and actor exclusion
-   Approval notification integration from Part 4-F

Known presentation/testing note:

-   Resend's development/testing environment rejects arbitrary
    `example.com` recipients. `delivered@resend.dev` was used for live
    provider delivery verification.
-   Some older ticket notification presentation wording/ticket-ID
    cleanup remains a separate future polish item.

# Recommended Development Phases

## Phase 1 --- Foundation

-   Monorepo
-   Docker
-   Next.js
-   NestJS
-   PostgreSQL
-   Redis
-   Prisma
-   CI
-   ESLint
-   Prettier
-   Environment management
-   UI foundation

## Phase 2 --- Identity

-   Login
-   Logout
-   Refresh tokens
-   Users
-   Roles
-   Permissions
-   Profile

## Phase 3 --- Ticket Core

-   Create ticket
-   Ticket list
-   Ticket details
-   Assignment
-   Status
-   Priority
-   Comments
-   Attachments
-   History

## Phase 4 --- Workflow

-   Approvals
-   Approval notifications
-   Unassigned queue
-   Junior cases
-   Case history
-   Notifications
-   Realtime updates

## Phase 5 --- Productivity

-   Tasks
-   Task templates
-   Case library
-   Saved filters

## Phase 6 --- SLA

-   SLA policies
-   SLA timers
-   SLA warnings
-   SLA breaches
-   SLA dashboard

## Phase 7 --- Analytics

-   Dashboard
-   Product dashboard
-   Employee dashboard
-   SLA reports
-   TAT reports
-   Usage reports
-   Case library reports
-   Attendance reports
-   Exports

## Phase 8 --- Production Hardening

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

# Engineering Rules for Remaining Work

For each remaining feature:

1.  Inspect the current implementation before changing it.
2.  Make the smallest change required for the feature.
3.  Preserve organization scoping.
4.  Preserve role-based authorization.
5.  Reuse existing services and modules where appropriate.
6.  Avoid introducing unnecessary dependencies.
7.  Run a backend build after implementation.
8.  Run focused API verification.
9.  Only mark a roadmap item complete after verification.
10. Record known limitations instead of silently treating them as
    solved.

# Current Project Checkpoint

At the latest verified checkpoint:

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
Approval notifications (4-F)      COMPLETE AND VERIFIED
Activity API                      COMPLETE
Notifications                     COMPLETE
Email infrastructure              COMPLETE
Redis-backed jobs                 COMPLETE
```

The backend currently builds successfully with `0 errors` and the NestJS
application starts successfully with the approval and ticket activity
endpoints registered.
