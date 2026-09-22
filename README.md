# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system being built as a modular monorepo.

The project is currently focused on establishing a reliable backend domain model and API first, with organization-scoped authentication/authorization, ticket workflows, comments, file attachments, and object storage.

## Current Status

**Backend foundation, ticket core, search/filtering, attachments, and Part 3-H SLA foundations are implemented and verified.**

The latest verified backend state includes:

- Organization-scoped authentication and authorization
- Ticket CRUD, assignment, status workflow, comments, and attachments
- Ticket search, date filtering, sorting, relationships, and advanced filtering
- MinIO-backed attachment storage with verified upload, listing, download, and deletion
- SLA policies with priority-based targets
- Organization-specific active SLA policy selection
- Ticket-level SLA snapshots and calculated deadlines
- First-response SLA tracking
- Resolution SLA tracking
- Scheduled SLA breach detection
- Reopen behavior that preserves the original resolution SLA deadline
- SLA data exposed through both individual-ticket and ticket-list APIs

The immediate next implementation step is:

> **3-H — SLA escalation event layer**

The escalation layer will record SLA escalation events and produce notification-ready events without coupling SLA detection directly to email delivery or Redis jobs. Part 3-I will then cover audit history and notifications.

See [`PLANS.md`](./PLANS.md) for the detailed progress tracker and complete roadmap.

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

## Repository Structure

```text
TechTicket/
├── apps/
│   ├── api/                 # NestJS backend
│   └── web/                 # Next.js frontend
├── packages/                # Shared packages
├── docker/
│   ├── api/
│   └── web/
├── prisma/                  # Database schema/migrations as applicable
├── README.md
├── PLANS.md
├── package.json
└── docker-compose.yml
```

The exact application structure is expected to evolve as additional modules are implemented.

## Backend Architecture

The API uses organization-scoped authentication and authorization.

Major backend areas currently include:

```text
apps/api/src/
├── auth/
├── common/
│   ├── organization/
│   └── storage/
├── database/
└── modules/
    ├── health/
    ├── members/
    ├── organizations/
    ├── teams/
    └── tickets/
```

### Authentication

Better Auth handles authentication. The NestJS application exposes the Better Auth handler under:

```text
/api/v1/auth/*
```

Authenticated requests use an `AuthGuard` and `AuthContextService` to establish the current user/session context.

### Organization Context

Requests that operate on organization-owned resources use:

```text
X-Organization-Id: <organization-id>
```

Organization membership and role authorization are enforced through the organization context layer.

Current organization roles:

- `OWNER`
- `ADMIN`
- `AGENT`
- `REQUESTER`

## Ticket Domain

The ticket domain currently supports:

- Ticket creation
- Ticket retrieval
- Ticket updates
- Ticket deletion
- Assignment
- Team assignment
- Status transitions
- Filtering
- Pagination
- Comments
- Internal/public comment visibility
- Attachments
- MinIO object storage
- SLA policies
- Priority-based SLA targets
- First-response and resolution SLA tracking
- SLA deadlines and breach detection
- SLA visibility in ticket APIs

### SLA & Automation

The ticket domain now includes organization-specific SLA policies with priority-based targets.

Current verified SLA behavior includes:

- Active SLA policy selection per organization
- Priority-specific first-response and resolution targets
- SLA snapshot creation when a ticket is created
- Calculated first-response and resolution deadlines
- First-response tracking from qualifying staff responses
- First-response breach detection
- Resolution breach detection
- Reopening a resolved ticket clears `resolvedAt` without resetting the original `resolutionDueAt`
- SLA data exposed by:
  - `GET /api/v1/tickets`
  - `GET /api/v1/tickets/:ticketId`

### Ticket statuses

```text
OPEN
IN_PROGRESS
PENDING
RESOLVED
CLOSED
```

### Ticket priorities

```text
LOW
MEDIUM
HIGH
URGENT
```

### Ticket types

```text
INCIDENT
SERVICE_REQUEST
QUESTION
PROBLEM
```

### Ticket comment types

```text
PUBLIC
INTERNAL
```

## Ticket Status Workflow

The currently implemented workflow is:

```text
OPEN
 ├──> IN_PROGRESS
 └──> PENDING

IN_PROGRESS
 ├──> PENDING
 └──> RESOLVED

PENDING
 ├──> IN_PROGRESS
 └──> RESOLVED

RESOLVED
 ├──> CLOSED
 └──> IN_PROGRESS

CLOSED
 └──> terminal
```

Additional behavior:

- Transitioning to `RESOLVED` sets `resolvedAt`.
- Transitioning to `CLOSED` sets `closedAt`.
- Reopening a `RESOLVED` ticket to `IN_PROGRESS` clears the resolution/closure timestamps.
- `CLOSED` tickets cannot be reopened.
- A transition to the current status is rejected.

## Ticket Assignment

Assignment rules currently include:

- Assignee must belong to the current organization.
- `REQUESTER` users cannot be assigned as ticket agents.
- A team must be active and belong to the current organization.
- When both a team and assignee are specified, the assignee must belong to that team.
- `undefined` leaves an existing assignment unchanged.
- `null` clears an assignment.

Assignment changes are restricted to:

- `OWNER`
- `ADMIN`
- `AGENT`

## Ticket Listing

`GET /api/v1/tickets` supports organization-scoped pagination and filtering.

Supported filters include:

- `status`
- `priority`
- `type`
- `assigneeId`
- `teamId`
- `requesterId`

Pagination uses:

```text
page
limit
```

Maximum page size:

```text
100
```

The response contains:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

For tickets with an associated SLA, each ticket also exposes an `sla` object containing the first-response and resolution targets, deadlines, response timestamp, and breach timestamps. Tickets without an SLA snapshot return `sla: null`.

Tickets are returned newest first.

## Comments

Ticket comments support:

- Public comments
- Internal comments
- Comment creation
- Comment listing
- Comment editing
- Comment deletion

Visibility rules currently include:

- `OWNER`, `ADMIN`, and `AGENT` can see internal comments.
- Requesters only see public comments.
- Requesters cannot create internal comments.
- A comment's type cannot be changed during editing.
- Users can edit/delete their own comments.
- `OWNER` and `ADMIN` can manage comments beyond ownership restrictions.

## Attachments

The attachment system uses:

```text
Client
   │
   │ multipart/form-data
   ▼
NestJS Tickets API
   │
   ├──> PostgreSQL
   │      └── attachment metadata
   │
   └──> MinIO
          └── attachment object
```

### Current attachment metadata

The database stores:

- `id`
- `ticketId`
- `uploadedById`
- `fileName`
- `objectKey`
- `mimeType`
- `size`
- `createdAt`

The MinIO object is identified by its `objectKey`.

### Current verified operations

Attachment upload has been verified with a multipart request and successfully returns persisted attachment metadata.

Attachment listing has also been verified and returns the attachment associated with the ticket.

### Storage configuration

The API uses these environment variables:

```text
MINIO_ENDPOINT
MINIO_PORT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET
```

The development Docker Compose configuration provides MinIO on:

```text
9000  # S3-compatible API
9001  # MinIO console
```

## API Base URL

Development API:

```text
http://localhost:4000/api/v1
```

Development web application:

```text
http://localhost:3000
```

## Docker Development

Start the complete development environment:

```powershell
docker compose up
```

Build and start:

```powershell
docker compose up --build
```

Stop services:

```powershell
docker compose down
```

Follow logs:

```powershell
docker compose logs -f
```

Remove containers and volumes:

```powershell
docker compose down -v
```

## Backend Commands

Run a backend build inside the API container:

```powershell
docker compose exec ticketing-api npm run build
```

Run backend tests:

```powershell
docker compose exec ticketing-api npm test
```

## Database

The project uses Prisma with PostgreSQL.

The development database is exposed through Docker on:

```text
localhost:5432
```

The API container connects to PostgreSQL through the Docker service name.

Prisma migrations are used to evolve the schema.

## Development Principles

The project is being implemented incrementally.

Key principles:

1. Keep organization boundaries enforced at the service/domain layer.
2. Keep authorization explicit.
3. Validate state transitions rather than allowing arbitrary status changes.
4. Keep attachment metadata and object storage lifecycle synchronized.
5. Prefer small, verifiable implementation steps.
6. Verify each feature through API/build tests before moving to the next roadmap item.
7. Avoid speculative architecture changes that are not required by the current feature.

## Roadmap

The implementation roadmap and completion status are maintained in [`PLANS.md`](./PLANS.md).

### Part 3-H — SLA & Automation

- SLA policies — **COMPLETE**
- First-response SLA — **COMPLETE**
- Resolution SLA — **COMPLETE**
- SLA timers/deadlines — **COMPLETE**
- Breach detection — **COMPLETE**
- Escalation — **NEXT**
- Priority-based SLA — **COMPLETE**
- Organization-specific policies — **COMPLETE**

### Part 3-I — Audit & Notifications

After Part 3-H is complete:

- Ticket activity/audit history
- Assignment notifications
- Status-change notifications
- Comment notifications
- Email notification infrastructure
- Redis-backed jobs where appropriate

The next implementation task is:

> **3-H — SLA escalation event layer**
