# TechTicket

TechTicket is a full-stack, multi-tenant ticketing and support system
built as a modular monorepo. The project uses a Docker-first development
workflow with organization-scoped authentication/authorization, ticket
workflows, comments, attachments, SLA automation, notifications, and
approval workflows.

## Current Status

**Backend foundation, ticket core, search/filtering, attachments, SLA
foundations, notifications, approval workflow, and notification
integration/reliability testing are implemented and verified.**

The latest verified backend state includes:

- Organization-scoped authentication and authorization
- Ticket CRUD, assignment, status workflow, comments, and attachments
- Ticket search, date filtering, sorting, relationships, and advanced
  filtering
- MinIO-backed attachment storage with verified upload, listing,
  download, and deletion
- SLA policies, priority-based targets, timers, breach detection, and
  escalation
- Ticket activity/audit history
- Notifications and Redis/BullMQ-backed jobs
- Approval workflow with verified audit/activity integration
- Approval lifecycle notifications with organization-scoped recipient
  validation
- Notification queue processor tests
- Notification organization-isolation tests
- Deterministic notification test cleanup
- Notification E2E regression coverage

See [`PLANS.md`](./PLANS.md) for the detailed progress tracker and
complete roadmap.

## Approval Workflow

The approval workflow is implemented around `TicketApproval` with these
states:

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

### 4-E --- Approval Audit/Activity Integration

**COMPLETE AND VERIFIED --- 2026-09-22**

The existing ticket activity infrastructure records:

```text
APPROVAL_REQUESTED
APPROVAL_APPROVED
APPROVAL_REJECTED
APPROVAL_CANCELLED
```

End-to-end verification on `TKT-000001` confirmed:

- Admin/requester can request approval from the designated Agent.
- The approval is created as `PENDING` and can be retrieved with its
  human-readable ticket number.
- The requester cannot approve the request.
- The designated Agent can approve the request.
- Fresh approvals can be rejected and cancelled by the designated Agent.
- Ticket activity history contains the complete approval lifecycle.
- Activity metadata contains approval ID, ticket number, approver ID,
  status, comment, actor, and timestamp information.
- Approval activity reuses the existing ticket activity/event
  infrastructure.

Automatic ticket-status transitions resulting from approval outcomes are
intentionally not assumed; those business rules remain configurable
until the SOP defines them.

### 4-F --- Approval Notification Integration

**COMPLETE AND VERIFIED --- 2026-09-23**

Approval lifecycle notifications use the existing event-driven
Redis/BullMQ email infrastructure.

Recipient routing is:

```text
REQUESTED  -> approver
APPROVED   -> requester
REJECTED   -> requester
CANCELLED  -> approver
```

Approval notification jobs carry the organization ID, and the
notification worker validates that recipients belong to the event
organization before resolving their email addresses. Notification
content uses the human-readable ticket number, such as `TKT-000001`.

Verification on `TKT-000001` confirmed:

- All four approval lifecycle notification routes.
- Correct organization context.
- Human-readable ticket number in notification subjects/content.
- Cross-organization recipients are excluded.
- A tested lifecycle operation produces one notification job rather
  than duplicate jobs.
- Live Resend delivery works with `delivered@resend.dev`.
- `admin@example.com` was correctly resolved for requester
  notifications, but Resend's development environment rejects
  `example.com` recipients with HTTP `422`; this is a provider testing
  restriction.
- Existing ticket notification behavior remains compatible after
  organization context was added to the shared queue job.
- Backend build completed successfully with `0 errors`.

No separate notification-type enum was introduced because the existing
notification architecture is event-based.

## Notification Testing

### 4-G.5 --- Notification Integration & Reliability Tests

**COMPLETE AND VERIFIED --- 2026-09-23**

The notification testing phase covers:

- Approval notification events
- Notification queue integration
- Notification payloads
- Notification recipients
- Approval cancellation notifications
- Notification queue processor behavior
- Organization isolation
- Queue/test cleanup
- Full E2E regression

The notification processor tests verify:

- Valid in-organization recipient -> email boundary invoked
- Recipient outside the organization -> rejected
- Invalid recipient IDs -> rejected
- Unsupported notification job -> rejected

Organization isolation tests verify:

- Cross-organization recipients cannot receive a notification for
  another organization.
- Mixed recipient IDs are filtered to the notification job's
  organization.
- A user belonging to multiple organizations is handled according to
  the organization attached to the notification job.

Notification tests intentionally avoid destructive global BullMQ
cleanup because active jobs may be locked by the live worker.

Tests identify their own jobs deterministically and exclude pre-existing
job IDs where necessary.

The notification E2E tests were also executed repeatedly to verify that
they do not depend on stale queue state from a previous test run.

### External Email Provider Note

Some notification E2E tests use `@example.com` test addresses.

When the real Resend boundary is exercised, Resend can return HTTP `422`
because `example.com` is not accepted as a real recipient domain.

This is expected test-environment/provider behavior for those tests.
The queue assertions can still pass.

Processor tests mock `EmailService.send()` where provider-independent
processor behavior is being tested.

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
3. Validate state transitions rather than allowing arbitrary status
   changes.
4. Keep attachment metadata and object storage lifecycle synchronized.
5. Prefer small, verifiable implementation steps.
6. Verify each feature through API/build tests before moving to the
   next roadmap item.
7. Avoid speculative architecture changes that are not required by the
   current feature.
8. Reuse existing activity/event infrastructure for audit and
   notifications.
9. Do not invent approval rules or automatic ticket-status transitions
   that are not defined by the SOP.
10. Preserve organization validation across asynchronous notification
    processing.
11. Keep regression tests deterministic and independent.
12. Avoid destructive queue cleanup when live BullMQ workers may hold
    job locks.
13. Do not change production behavior solely to satisfy a regression
    test; verify the existing contract first.

## Testing

The API uses Vitest for E2E testing.

Run the complete API E2E suite inside Docker:

```powershell
docker compose exec api npm run test:e2e
```

Run a specific E2E file:

```powershell
docker compose exec api npm run test:e2e -- test/<file>.e2e-spec.ts
```

The current E2E test suite includes:

```text
test/approval.e2e-spec.ts
test/auth.e2e-spec.ts
test/health.e2e-spec.ts
test/notification-organization-isolation.e2e-spec.ts
test/notification-processor.e2e-spec.ts
test/notification.e2e-spec.ts
test/organization.e2e-spec.ts
```

Ticket behavior is now covered by a dedicated ticket E2E regression suite,
in addition to the existing approval, notification, and organization coverage.

## Current Development Step

### 4-G.6 --- Ticket Regression Tests

**COMPLETE AND VERIFIED**

The ticket domain is implemented and now covered by a dedicated ticket E2E regression specification.

The purpose of 4-G.6 was to create a focused regression suite around the
ticket domain without changing established business behavior. This regression
checkpoint is now complete and verified.

Verified coverage:

1. Ticket creation
2. Ticket retrieval/details
3. Ticket list, filtering, and pagination
4. Ticket authorization
5. Organization isolation
6. Assignment and workflow
7. Status transitions
8. Comments and history
9. Attachments
10. Approval interactions
11. Validation and error paths
12. Full API E2E regression

Verified result:

- `docker compose exec api npm run test:e2e` completed successfully.
- 8 E2E test files passed.
- 108 tests passed with 0 failures.
- `test/ticket.e2e-spec.ts` passed all 56 tests.
- `test/approval.e2e-spec.ts` passed all 24 tests.
- Validation/error paths (4-G.6.11) passed.
- Full ticket + API E2E regression (4-G.6.12) passed.

The dedicated regression suite now covers the ticket API and related approval,
organization, authentication, health, and notification integration paths.

Production behavior should not be changed solely to make a regression
test pass.

## Roadmap

The implementation roadmap and completion status are maintained in
[`PLANS.md`](./PLANS.md).

### Phase 3 --- Ticket Core

- Ticket database model --- **COMPLETE**
- Ticket CRUD --- **COMPLETE**
- Ticket assignment --- **COMPLETE AND VERIFIED**
- Ticket status workflow --- **COMPLETE AND VERIFIED**
- Ticket filtering/pagination --- **COMPLETE AND VERIFIED**
- Ticket comments --- **COMPLETE AND VERIFIED**
- Ticket attachments --- **COMPLETE AND VERIFIED**
- Ticket relations --- **COMPLETE**
- Advanced ticket search/filtering --- **COMPLETE AND VERIFIED**
- SLA automation --- **COMPLETE AND VERIFIED**
- Ticket activity/audit history --- **COMPLETE AND VERIFIED**

### Phase 4 --- Workflow

- Approval data model --- **COMPLETE**
- Approval service/API --- **COMPLETE**
- Pending approval helpers --- **COMPLETE**
- Approval audit/activity integration (4-E) --- **COMPLETE AND
  VERIFIED**
- Approval notification integration (4-F) --- **COMPLETE AND VERIFIED**
- Notification integration/reliability tests (4-G.5) --- **COMPLETE AND
  VERIFIED**
- Ticket regression tests (4-G.6) --- **COMPLETE AND VERIFIED**
- Realtime / WebSockets --- planned
- Unassigned queue --- planned
- Junior cases --- planned
- Case history refinement --- planned

### Part 3-H --- SLA & Automation

- SLA policies --- **COMPLETE**
- First-response SLA --- **COMPLETE**
- Resolution SLA --- **COMPLETE**
- SLA timers/deadlines --- **COMPLETE**
- Breach detection --- **COMPLETE**
- Escalation --- **COMPLETE**
- Priority-based SLA --- **COMPLETE**
- Organization-specific policies --- **COMPLETE**

### Part 3-I --- Audit & Notifications

- Ticket activity/audit history --- **COMPLETE**
- Assignment notifications --- **COMPLETE**
- Status-change notifications --- **COMPLETE**
- Comment notifications --- **COMPLETE**
- Email notification infrastructure --- **COMPLETE**
- Redis-backed jobs --- **COMPLETE**
- Approval activity integration --- **COMPLETE AND VERIFIED**
- Approval notification integration --- **COMPLETE AND VERIFIED**
- Notification processor testing --- **COMPLETE AND VERIFIED**
- Notification organization isolation --- **COMPLETE AND VERIFIED**
- Notification test cleanup --- **COMPLETE**
- Notification E2E regression --- **COMPLETE**

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
Approval audit/activity (4-E)     COMPLETE AND VERIFIED
Approval notifications (4-F)      COMPLETE AND VERIFIED
Activity API                      COMPLETE
Notifications                     COMPLETE
Notification processor tests      COMPLETE
Notification organization tests   COMPLETE
Notification test cleanup         COMPLETE
Notification E2E regression       COMPLETE
Email infrastructure              COMPLETE
Redis-backed jobs                 COMPLETE
Ticket regression tests           COMPLETE AND VERIFIED
```

The backend currently builds successfully with `0 errors` and the NestJS
application starts successfully with the approval and ticket activity
endpoints registered.

The next implementation/testing focus is the roadmap item following **4-G.6 --- Ticket Regression Tests**.
