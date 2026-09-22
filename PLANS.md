# TechTicket Implementation Plan

This document tracks the implementation progress of TechTicket.

The roadmap is intentionally incremental: each feature should be implemented, built, and verified before moving to the next dependent feature.

# Current Phase

## Phase 3-F — Ticketing Core

### Status: In Progress

The ticketing backend foundation and core workflows are substantially implemented.

# Completed Work

## 3-F-1 — Ticket Database Model

**Status: COMPLETE**

Implemented ticket persistence using Prisma/PostgreSQL.

Ticket fields include:

- Ticket ID
- Ticket number
- Organization
- Requester
- Assignee
- Team
- Title
- Description
- Status
- Priority
- Type
- Created timestamp
- Updated timestamp
- Resolved timestamp
- Closed timestamp

Indexes are present for organization-scoped ticket queries and common filtering dimensions.

## 3-F-2 — Ticket CRUD

**Status: COMPLETE**

Implemented:

- Create ticket
- List tickets
- Get ticket
- Update ticket
- Delete ticket

Ticket numbers are generated in the service layer.

### Known limitation

The current ticket-number generation approach is not fully atomic under high concurrency. This has been acknowledged and is not being treated as solved production-grade sequencing yet.

## 3-F-3 — Ticket Assignment

**Status: COMPLETE AND VERIFIED**

Implemented:

- Assignee assignment
- Team assignment
- Clearing assignments
- Organization membership validation
- Active-team validation
- Team membership validation
- Prevention of assigning `REQUESTER` users

Endpoint:

```text
PATCH /api/v1/tickets/:ticketId/assignment
```

Allowed roles:

```text
OWNER
ADMIN
AGENT
```

Verified behavior includes both successful assignments and validation failures.

## 3-F-4 — Ticket Status Workflow

**Status: COMPLETE AND VERIFIED**

Implemented allowed transitions:

```text
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

- `RESOLVED` sets `resolvedAt`.
- `CLOSED` sets `closedAt`.
- Reopening from `RESOLVED` clears `resolvedAt` and `closedAt`.
- `CLOSED` cannot be reopened.
- Same-status transitions return an error.

Endpoint:

```text
PATCH /api/v1/tickets/:ticketId/status
```

Allowed roles:

```text
OWNER
ADMIN
AGENT
```

Verified test sequence included:

```text
OPEN -> IN_PROGRESS       200
IN_PROGRESS -> RESOLVED   200
RESOLVED -> RESOLVED      400
RESOLVED -> CLOSED        200
CLOSED -> OPEN            400
```

## 3-F-5 — Ticket Filtering / Pagination

**Status: COMPLETE AND VERIFIED**

Implemented ticket list pagination and filtering.

Supported query parameters:

```text
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

```text
100
```

Results are ordered newest first.

Response metadata:

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5
}
```

The user verified the filtering/pagination behavior as working.

> Note: the broader roadmap may later contain additional search/filtering work. This implementation already provides the currently verified ticket-list filtering and pagination foundation.

# Comments

## 3-F-6 — Ticket Comments

**Status: COMPLETE AND VERIFIED**

Ticket comments support:

- Public comments
- Internal comments
- Listing
- Creation
- Editing
- Deletion

Rules verified:

- Internal comments are visible to `OWNER`, `ADMIN`, and `AGENT`.
- Requesters only see public comments.
- Requesters cannot create internal comments.
- Comment type is immutable during editing.
- Users can manage their own comments.
- `OWNER` and `ADMIN` have elevated comment-management permissions.

Endpoints:

```text
GET    /api/v1/tickets/:ticketId/comments
POST   /api/v1/tickets/:ticketId/comments
PATCH  /api/v1/tickets/:ticketId/comments/:commentId
DELETE /api/v1/tickets/:ticketId/comments/:commentId
```

# Attachments

## 3-F-6 — Attachment Database Model

**Status: COMPLETE**

Implemented `TicketAttachment` persistence.

Stored metadata:

```text
id
ticketId
uploadedById
fileName
objectKey
mimeType
size
createdAt
```

The attachment belongs to a ticket and tracks the uploading user.

Indexes include:

```text
(ticketId, createdAt)
uploadedById
```

## 3-F-6.x — Object Storage Layer

**Status: COMPLETE AND VERIFIED**

Implemented a storage abstraction backed by MinIO.

Current storage service capabilities:

- Ensure bucket exists
- Upload object
- Retrieve object
- Delete object

Development MinIO configuration is provided through Docker Compose.

Bucket:

```text
ticket-attachments
```

## 3-F-6.x — Multipart Attachment Upload

**Status: COMPLETE AND VERIFIED**

Implemented multipart upload using Multer.

The API accepts:

```text
multipart/form-data
```

with:

```text
file
```

The current implementation validates attachment size/type and stores the object in MinIO before persisting attachment metadata.

Maximum configured attachment size:

```text
10 MB
```

The API uses:

```text
Express.Multer.File
```

for the uploaded-file type, with `@types/multer` providing the Express/Multer type augmentation.

## 3-F-6.9 — Attachment Listing

**Status: COMPLETE AND VERIFIED**

Implemented:

```text
GET /api/v1/tickets/:ticketId/attachments
```

The endpoint returns organization-scoped attachment metadata for the ticket, including uploader information.

Verified response contains:

- Attachment ID
- Ticket ID
- Uploaded-by user ID
- File name
- MIME type
- Size
- Creation timestamp
- Uploader name
- Uploader email

The `objectKey` is intentionally not exposed in the listing response.

## 3-F-6.10 — Attachment Download + Deletion

**Status: COMPLETE AND VERIFIED**

Implemented:

- Attachment download
- Correct MIME type response
- Original filename preservation
- Attachment deletion
- MinIO object cleanup
- PostgreSQL attachment metadata cleanup
- Cross-ticket isolation
- Cross-organization isolation

Endpoints:

```text
GET    /api/v1/tickets/:ticketId/attachments/:attachmentId
DELETE /api/v1/tickets/:ticketId/attachments/:attachmentId
```

The download endpoint returns the stored file without exposing the internal MinIO `objectKey`.

Deletion removes both the MinIO object and the corresponding PostgreSQL metadata. The implementation also includes compensating cleanup logic to reduce the risk of inconsistent storage/database state if metadata deletion fails.

### Verification

Verified against the test attachment:

```text
Attachment ID:
cmtsx8uim0001pq0ut95e094w

Ticket ID:
cmtsl5wwj0001ru0uutn1p53p

Organization ID:
cmtiswnad0000ru0u2xww8leb
```

Results:

- Download returned `200 OK`.
- Downloaded content matched the original file.
- `Content-Type` was `text/plain`.
- `Content-Disposition` preserved `attachment-test.txt`.
- `Content-Length` was `34`.
- Access using a different ticket ID returned `404 Attachment not found`.
- Access using an unauthorized organization returned `403 Forbidden`.
- Deletion returned `200 OK` with `deleted: true`.
- Attachment listing after deletion returned `[]`.
- Downloading the deleted attachment returned `404 Attachment not found`.
- The deleted object was independently confirmed absent from the MinIO `attachments` folder.

**3-F-6.10 is fully complete and verified.**

# Upcoming Roadmap

## 3-G — Search / Filtering / Pagination Expansion

**Status: IN PROGRESS**

Basic ticket filtering and pagination are already implemented and verified under the ticketing core.

### 3-G-1 — Ticket Search

**Status: COMPLETE AND VERIFIED**

Implemented keyword search across:

- `ticketNumber`
- `title`
- `description`

Search behavior:

- Case-insensitive
- Partial-match (`contains`)
- Whitespace-only search is treated as no search filter
- Compatible with existing filtering and pagination
- Remains organization-scoped

Query parameter:

```text
search
```

Example:

```text
GET /api/v1/tickets?search=VPN
```

Verification:

- Existing ticket listing returned `200 OK`.
- Exact ticket-number search returned the expected ticket.
- Case-insensitive search returned the expected ticket.
- Partial ticket-number search returned the expected ticket.
- Search combined with `status=RESOLVED` correctly returned no results because the test ticket is `CLOSED`.
- Search combined with `status=CLOSED` correctly returned the ticket.
- Search with pagination returned correct page and total metadata.
- Whitespace-only search behaved like the normal ticket listing.
- A nonexistent search term returned an empty result with `total: 0`.
- Unauthorized organization access returned `403 Forbidden`.

The backend build completed successfully with `0 errors`.

**3-G-1 is fully complete and verified.**

### 3-G-2 — Ticket Created Date Range Filtering

**Status: COMPLETE AND VERIFIED**

Implemented ticket creation-date filtering using:

- `createdFrom`
- `createdTo`

Date behavior:

- Inclusive date range filtering on `Ticket.createdAt`
- Date-only `createdTo` includes the full UTC calendar day
- `createdFrom` and `createdTo` can be used independently
- Rejects ranges where `createdFrom` is later than `createdTo` with `400 Bad Request`
- Invalid date values are rejected by DTO validation
- Compatible with existing search, filtering, and pagination
- Remains organization-scoped

Verification:

- `createdFrom=2026-09-08` returned the existing test ticket.
- `createdTo=2026-09-08` returned the existing test ticket.
- `createdFrom=2026-09-08&createdTo=2026-09-08` returned the existing test ticket.
- `createdFrom=2026-09-09` returned no results.
- `createdTo=2026-09-07` returned no results.
- An inverted date range returned `400 Bad Request`.
- An invalid date value returned `400 Bad Request`.
- Search combined with the date range returned the expected results.
- Date filtering combined with pagination returned correct metadata.
- Backend build completed successfully with `0 errors`.

**3-G-2 is fully complete and verified.**

### 3-G-3 — Sorting Options

**Status: COMPLETE AND VERIFIED**

Implemented controlled sorting for ticket listing.

Supported `sortBy` values:

- `createdAt`
- `updatedAt`
- `priority`
- `status`
- `title`

Supported `sortOrder` values:

- `asc`
- `desc`

Default behavior remains:

- `createdAt DESC`

Sorting is:

- validated through an explicit allow-list
- organization-scoped
- compatible with existing search
- compatible with created-date filtering
- compatible with existing status/priority/type/assignee/team/requester filters
- compatible with pagination

Invalid `sortBy` or `sortOrder` values return `400 Bad Request`.

Verification:

- Default sorting returned `200 OK`.
- `createdAt ASC` returned `200 OK`.
- `updatedAt DESC` returned `200 OK`.
- `priority ASC` returned `200 OK`.
- `status ASC` returned `200 OK`.
- `title ASC` returned `200 OK`.
- Invalid `sortBy` returned `400 Bad Request`.
- Invalid `sortOrder` returned `400 Bad Request`.
- Sorting combined with search, created-date filtering, and pagination returned `200 OK` with correct metadata.
- Backend build completed successfully with `0 errors`.
- The current test dataset contains one ticket, so relative ordering between multiple records was not independently demonstrated.

### 3-G-4 — Full-Text Search

**Status: COMPLETE AND VERIFIED**

Upgraded ticket search from substring matching on `title` and `description` to PostgreSQL full-text search using Prisma's PostgreSQL FTS support. `ticketNumber` retains partial case-insensitive matching.

Search behavior:

- PostgreSQL `fullTextSearchPostgres` preview feature enabled in Prisma Client.
- `title` and `description` use full-text search.
- Multi-word searches require all supplied terms to be present across the combined searchable ticket content.
- Search terms are normalized and FTS operator characters are sanitized.
- Partial `ticketNumber` matching is preserved.
- Existing organization scoping, filters, date ranges, sorting, and pagination remain intact.

Verification:

- `VPN` returned the expected ticket.
- `vpn` returned the expected ticket.
- `connection` returned the expected ticket.
- `database` returned no results.
- `corporate VPN` returned the expected ticket.
- `corporate network` returned the expected ticket across title/description content.
- `corporate xyz` returned no results.
- `network xyz` returned no results.
- Partial `TKT-0000` returned the expected ticket.
- Search combined with `status=CLOSED` returned the expected ticket.
- The backend build completed successfully with `0 errors`.

Known limitation:

- No dedicated PostgreSQL `tsvector`/GIN index has been added yet. This is a future performance optimization rather than a functional requirement for 3-G-4.

**3-G-4 is fully complete and verified.**

### 3-G-5 — Additional Ticket Relationships

**Status: COMPLETE AND VERIFIED**

Implemented explicit ticket-to-ticket relationships while preserving organization isolation and the existing authorization model.

Implemented relationship types:

```text
RELATED
DUPLICATE
PARENT
BLOCKS
```

Implemented:

- Explicit Prisma ticket relationship model with separate outgoing and incoming relations.
- Relationship listing for a ticket.
- Relationship creation between tickets in the same organization.
- Relationship removal.
- Self-relation prevention.
- Cross-organization relationship prevention.
- Same-direction duplicate prevention.
- Inverse duplicate prevention for all supported relationship types.
- Related-ticket information in API responses without exposing unnecessary internal fields.
- Organization-scoped access.
- Existing role-based authorization model.
- `OWNER`, `ADMIN`, and `AGENT` can create and remove relationships.
- `REQUESTER` access to relationship mutations is rejected with `403 Forbidden`.

Endpoints:

```text
GET    /api/v1/tickets/:ticketId/relations
POST   /api/v1/tickets/:ticketId/relations
DELETE /api/v1/tickets/:ticketId/relations/:relationId
```

Verification included:

- Successful relationship creation and listing.
- Duplicate `RELATED` rejection.
- Inverse `RELATED` rejection.
- Self-relation rejection.
- `PARENT` relationship creation and inverse rejection.
- `BLOCKS` relationship creation and inverse rejection.
- Relationship deletion.
- Missing organization context rejected with `401 Unauthorized`.
- `REQUESTER` relationship creation rejected with `403 Forbidden`.
- `REQUESTER` relationship deletion rejected with `403 Forbidden`.
- Backend build completed successfully with `0 errors`.

Known design note:

- Relationship deletion is currently source-ticket scoped: the requested `ticketId` must be the relationship's `fromTicketId`. This is an intentional API behavior to review if bidirectional deletion semantics are required later.

**3-G-5 is fully complete and verified.**

### 3-G-6 — Advanced Ticket Filtering

**Status: COMPLETE AND VERIFIED**

Extended the existing organization-scoped ticket listing with practical filters that were missing from the existing implementation.

Added query parameters:

```text
unassigned
unassignedTeam
updatedFrom
updatedTo
```

Implemented behavior:

- `unassigned=true` returns tickets with no assignee.
- `unassigned=false` returns tickets with an assignee.
- `unassignedTeam=true` returns tickets with no team.
- `unassignedTeam=false` returns tickets with a team.
- `updatedFrom` filters tickets by `updatedAt >= updatedFrom`.
- `updatedTo` filters tickets by `updatedAt <= updatedTo`.
- Date-only `updatedTo` values include the complete UTC day through `23:59:59.999Z`.
- Inverted `updatedFrom` / `updatedTo` ranges return `400 Bad Request`.
- `assigneeId` cannot be combined with `unassigned`.
- `teamId` cannot be combined with `unassignedTeam`.
- Invalid boolean values for `unassigned` and `unassignedTeam` are rejected with `400 Bad Request`.
- Existing status, priority, type, assignee, team, requester, search, created-date filtering, sorting, and pagination remain compatible.
- Existing organization scoping remains enforced through the ticket query's `organizationId` condition.

Verification:

- `unassigned=true` returned TKT-000002.
- `unassigned=false` returned TKT-000001.
- `unassignedTeam=true` returned TKT-000002.
- `unassignedTeam=false` returned TKT-000001.
- Invalid `unassigned=abc` returned `400 Bad Request`.
- `assigneeId + unassigned` returned `400 Bad Request`.
- `teamId + unassignedTeam` returned `400 Bad Request`.
- `updatedFrom=2026-09-09` returned TKT-000002.
- `updatedTo=2026-09-09` returned TKT-000001.
- `updatedFrom=2026-09-10&updatedTo=2026-09-10` returned TKT-000002.
- Inverted updated-date range returned `400 Bad Request`.
- Updated-date filtering combined with `status=OPEN&priority=HIGH` returned TKT-000002.
- Pagination combined with `unassigned=true&limit=1` returned correct data and metadata.
- Pagination combined with `unassignedTeam=true&limit=1` returned correct data and metadata.
- Backend build completed successfully with `0 errors`.

Known scope decision:

- No additional speculative filters were added. The existing endpoint now provides a sufficiently broad operational filtering surface without unnecessary query parameters.

**3-G-6 is fully complete and verified.**

### Part 3-H — SLA & Automation

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

- SLA policies
- Priority-based SLA
- Organization-specific SLA policies
- Ticket SLA snapshots
- First-response SLA tracking
- Resolution SLA tracking
- SLA due-time calculation
- SLA breach detection
- SLA reopen behavior
- SLA breach escalation persistence
- SLA breach event emission
- SLA breach audit activities

Verification completed:

- SLA policy management and organization scoping.
- Ticket-level SLA snapshots preserve SLA values for the ticket.
- First-response and resolution due timestamps are calculated.
- First-response tracking is updated by the first qualifying comment.
- Resolution SLA behavior across resolution and reopening is verified.
- Scheduled SLA breach detection is running.
- `SlaEscalation` records are persisted with unique escalation types.
- First-response and resolution breach events are emitted.
- SLA breach audit activities are persisted by `TicketActivityEventsService`.
- A fresh SLA test produced both `FIRST_RESPONSE_BREACH` and `RESOLUTION_BREACH` escalation records.
- Corresponding `SLA_FIRST_RESPONSE_BREACHED` and `SLA_RESOLUTION_BREACHED` activities were verified in PostgreSQL and through the activity API.
- Backend build completed successfully with `0 errors`.

**3-H is fully complete and verified.**

### Part 3-I — Ticket Activity, Audit History & Notifications

**Status: AUDIT HISTORY COMPLETE AND VERIFIED**

Completed:

- Ticket activity/audit history persistence.
- Organization-scoped ticket activity retrieval.
- Ticket creation activity.
- General ticket update activity with changed-field metadata.
- Priority-change activity.
- Status-change activity.
- Assignee-change activity.
- Team-change activity.
- Comment-added activity.
- Comment-updated activity.
- Comment-deleted activity.
- SLA first-response breach activity.
- SLA resolution breach activity.
- Actor information for user-generated activities.
- System-generated SLA activities with no actor.
- Chronological activity API.

Verification completed:

- Ticket update produced `TICKET_UPDATED`.
- Priority change produced `PRIORITY_CHANGED`.
- Status change produced `STATUS_CHANGED`.
- Assignee change produced `ASSIGNEE_CHANGED`.
- Team change produced `TEAM_CHANGED`.
- Comment creation produced `COMMENT_ADDED`.
- Comment editing produced `COMMENT_UPDATED`.
- Comment deletion produced `COMMENT_DELETED`.
- Deleted comments retained their audit activities.
- `GET /api/v1/tickets/:ticketId/activity` returned the complete chronological history.
- Fresh SLA breach testing produced both escalation records and corresponding audit activities.
- Backend build completed successfully with `0 errors`.

**3-I audit history is fully complete and verified.**

### Part 3-I Notifications

**Status: COMPLETE AND VERIFIED**

Implemented:

- Assignment notification events.
- Status-change notification events.
- Comment-added notification events.
- Comment-updated notification events.
- Comment-deleted notification events.
- Email notification infrastructure using `EmailService`.
- Resend email-provider integration.
- BullMQ notification queue backed by Redis.
- Queue producer and worker/processor for email notification jobs.
- Recipient resolution for requester and assignee notifications.
- Actor exclusion so users are not notified about their own actions.
- Recipient de-duplication.
- Queue retry configuration using `3` attempts with exponential backoff starting at `5000ms`.
- Queued email delivery processing through the notification worker.

Comment notification coverage verified:

- Public comment added -> requester/assignee recipients, subject to actor exclusion.
- Internal comment added -> assignee recipient, requester excluded.
- Public comment updated -> requester/assignee recipients, subject to actor exclusion.
- Internal comment updated -> assignee recipient, requester excluded.
- Public comment deleted -> requester/assignee recipients, subject to actor exclusion.
- Internal comment deleted -> assignee recipient, requester excluded.

Verification completed:

- Redis connectivity verified with `redis-cli ping` returning `PONG`.
- Assignment notification was queued, processed, and delivered through Resend.
- Status-change notifications were queued, processed, and delivered through Resend.
- Comment-added notifications were queued, processed, and delivered through Resend for both `PUBLIC` and `INTERNAL` comments.
- Comment-updated notifications were queued, processed, and delivered through Resend for both `PUBLIC` and `INTERNAL` comments.
- Comment-deleted notifications were queued, processed, and delivered through Resend for both `PUBLIC` and `INTERNAL` comments.
- BullMQ jobs `3` through `11` completed successfully during the verification sequence.
- Actor exclusion was verified across the tested notification flows.
- Backend build completed successfully with `0 errors`.

Known testing note:

- Resend's development/testing environment rejects arbitrary `example.com` recipients. `delivered@resend.dev` was used for live provider-delivery verification, and the normal test-user email addresses were restored afterward.

Known presentation cleanup:

- Comment email wording currently contains an awkward phrase equivalent to `There has been a added comment`; this should be cleaned up later.
- Notification subjects/body currently use the internal ticket database ID instead of the user-facing ticket number such as `TKT-000005`.
- These are presentation improvements and do not indicate a failure in the notification event, queue, or delivery flow.

**3-I Notifications is fully complete and verified, including Redis/BullMQ-backed notification jobs.**

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
- Unassigned queue
- Junior cases
- Case history
- Notifications
- Realtime updates

## Phase 5 — Productivity

- Tasks
- Task templates
- Case library
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
- Case library reports
- Attendance reports
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

# Engineering Rules for Remaining Work

For each remaining feature:

1. Inspect the current implementation before changing it.
2. Make the smallest change required for the feature.
3. Preserve organization scoping.
4. Preserve role-based authorization.
5. Reuse existing services and modules where appropriate.
6. Avoid introducing unnecessary dependencies.
7. Run a backend build after implementation.
8. Run focused API verification.
9. Only mark a roadmap item complete after verification.
10. Record known limitations instead of silently treating them as solved.

# Current Project Checkpoint

At the latest verified checkpoint:

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
Activity API                      COMPLETE
Notifications                     COMPLETE
Email infrastructure              COMPLETE
Redis-backed jobs                 COMPLETE
```

The backend currently builds successfully with `0 errors` and the NestJS application starts successfully with the ticket activity endpoint registered.
