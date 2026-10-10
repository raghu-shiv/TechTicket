# TechTicket Implementation Plan

This document tracks the implementation progress of TechTicket.

The roadmap is intentionally incremental: each feature should be
implemented, built, and verified before moving to the next dependent
feature.

# Current Phase

## Phase 7 --- Analytics

**Status: IN PROGRESS**

Phase 7 turns the existing ticket, activity, SLA, assignment, organization,
and ticket-library data into organization-scoped analytics and reporting.
Analytics should reuse existing domain data and services rather than create
duplicate operational models.

## 7-A --- Analytics Foundation

**COMPLETE AND VERIFIED**

Implemented:

- Analytics metric dictionary and KPI ownership
- Organization-scoped reporting/query boundaries
- Reusable date-range and ticket-dimension query normalization
- Reusable server-side aggregation/query services
- Pagination and drill-down contracts
- Empty/no-data behavior
- Analytics API module/controller/service boundaries
- Focused E2E coverage for organization isolation and metric correctness

Verification:

```text
Analytics Foundation E2E    28/28 tests passed
API lint                    0 warnings / 0 errors
API production build        SUCCESS
```

## 7-B --- Analytics Dashboard

**COMPLETE AND VERIFIED**

Executive/operations overview using existing ticket and SLA data.

Implemented:

- Total tickets
- Open/active tickets
- Resolved/closed tickets
- Unassigned tickets
- SLA compliance and breach metrics
- First-response performance
- Resolution/TAT performance
- Ticket volume over time
- Priority distribution
- Team workload
- Assignee workload
- Supported date-range and ticket filters
- Sparse volume-trend normalization for selected date ranges
- Server-side aggregation with frontend chart presentation
- `/reports` analytics dashboard integration

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

## 7-C --- Product Analytics

The Product Dashboard required an explicit product taxonomy in the ticket
domain. Because the repository previously had no Product model or Ticket
product relationship, the taxonomy foundation was implemented first rather
than treating `TicketType` as a product/category surrogate.

### 7-C.0 --- Product Taxonomy Foundation

**COMPLETE AND VERIFIED**

Implemented:

- `Product` Prisma model with organization ownership
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

Product lifecycle:

```text
Create → ACTIVE/INACTIVE
Deactivate → INACTIVE
Reactivate → ACTIVE
Delete → INACTIVE products only
```

Verification:

```text
Product E2E                   46/46 tests passed
API unit tests                29/29 tests passed
API lint                      0 warnings / 0 errors
API TypeScript check          PASS
API production build          SUCCESS
```

The API TypeScript check required an explicit `apps/api/tsconfig.json`
include/exclude boundary so NestJS production source is separated from
Vitest/Jest test files.

### 7-C.1 --- Product Dashboard API

**COMPLETED & VERIFIED**

Implemented and verified the organization-scoped Product Dashboard reporting API.

Completed reporting:

- Ticket volume by product
- Open vs resolved/closed by product
- Priority distribution by product
- SLA compliance by product
- SLA breach rate by product
- Average/median TAT by product
- Reopen rate deferred because the current activity/domain model does not provide a dedicated, reliable reopen metric
- Trend analysis over time
- Organization-scoped filtering and aggregation
- Product filtering
- Historical reporting for inactive products
- Exclusion of unclassified tickets from product-level metrics
- Organization isolation / cross-tenant protection
- Authentication protection
- Date-range filtering
- Product-level server-side aggregation
- Product Dashboard API response contract
- Regression compatibility with Analytics Dashboard and Analytics Foundation APIs

**Verification:**

- Prisma Client generation: PASS
- TypeScript compilation: PASS
- API lint: PASS — 0 warnings, 0 errors
- API build: PASS
- Product Dashboard E2E: **12/12 tests passed**
- Analytics Dashboard + Foundation E2E regression: **48/48 tests passed**
- API unit tests: **29/29 tests passed**

### 7-C.2 --- Product Dashboard UI

**COMPLETE & VERIFIED**

Implemented the Product Analytics Dashboard using the verified Product
Dashboard API and existing analytics UI patterns.

Completed functionality includes:

- Product analytics dashboard integrated at `/reports`
- Product selector and date-range filtering
- Organization-scoped product analytics
- Product volume and workload comparison
- Active vs resolved/closed ticket metrics
- SLA tracking, breach, compliance, and compliance-rate metrics
- TAT metrics including average and median resolution time
- Priority distribution by product
- Product-specific ticket volume trends
- Product drill-down links into the Ticket Library using `productId`
- Inactive products preserved in historical analytics
- Unclassified tickets handled separately from product-level metrics

Frontend verification completed successfully:

- TypeScript: `npx tsc --noEmit` — PASS
- ESLint: `npm run lint` — PASS
- Vitest: **9 test files, 123 tests — PASS**
- Production build: `npm run build` — PASS
- Next.js: **16.3.3**
- Static page generation: **13/13 — PASS**
- `/reports` route builds successfully
- `/tickets` route builds successfully

### 7-C.3 --- Product Drill-down

**COMPLETE & VERIFIED**

Connected product-level analytics to the organization-scoped Ticket Library
using the existing Product filter and URL-backed ticket query model.

Implemented:

- Product Dashboard "View tickets" drill-down links
- Product detail "Open Ticket Library" drill-down
- Canonical product-to-ticket-library URL construction via `productId`
- Ticket Library hydration of the `productId` query parameter
- Organization-scoped ticket retrieval through the existing Ticket Library API
- Product filter preservation through URL-backed filtering and pagination
- Active Product filter presentation in the Ticket Library
- Inactive-product labeling in the Product filter
- Product filter clearing/reset behavior
- Dedicated product drill-down utility tests
- No duplicate product-ticket reporting endpoint introduced; the existing
  organization-scoped Ticket Library remains the operational source of truth

Verification:

Frontend TypeScript PASS
Frontend ESLint PASS — 0 warnings / 0 errors
Frontend tests 10/10 files, 134/134 tests passed
Frontend production build SUCCESS
Next.js 16.3.3
Static page generation 13/13 — PASS

### 7-C.4 --- Product Verification

**COMPLETE & VERIFIED**

Final Product Analytics verification completed across backend aggregation,
authorization, organization isolation, empty/no-data behavior, filtering,
historical inactive-product reporting, product drill-down, frontend contracts,
and production quality gates.

Verified:

- Product ticket-volume aggregation
- Active vs resolved/closed metrics
- Priority distribution
- SLA tracking, breach, and compliance metrics
- Average and median TAT
- Product trend aggregation
- Unclassified-ticket handling
- Inactive-product historical reporting
- Product filtering
- Combined product/date filtering
- Zero-ticket product dimensions
- Empty/no-data behavior
- Organization isolation
- Authentication protection
- Invalid date-range handling
- Ticket Library product drill-down
- Frontend product analytics contracts
- Frontend drill-down URL behavior
- Frontend TypeScript
- Frontend ESLint
- Frontend tests
- Frontend production build
- Backend lint
- Backend TypeScript/build
- Analytics regression compatibility

No duplicate Product Analytics or Ticket Library endpoint was introduced.
The existing organization-scoped Ticket Library remains the operational
source of truth for product drill-down.

Verification:

Product Dashboard E2E PASS
Analytics regression PASS
Backend TypeScript PASS
Backend ESLint PASS — 0 warnings / 0 errors
Backend production build PASS
Frontend TypeScript PASS
Frontend ESLint PASS — 0 warnings / 0 errors
Frontend tests PASS
Frontend production build PASS
Failures 0

## 7-D --- Employee Dashboard

**NEXT IMPLEMENTATION — PLANNED**

Agent/employee performance and workload reporting.

Planned reporting:

- Assigned ticket volume
- Open workload
- Resolved volume
- Unassigned-to-assigned workload flow
- First-response performance
- Resolution/TAT performance
- SLA compliance
- SLA breach count
- Average and median resolution time
- Reopen volume/rate where supported by existing data
- Workload distribution across employees
- Team comparison where authorized

Employee analytics must preserve organization and permission boundaries.

## 7-E --- SLA Reports

**COMPLETE AND VERIFIED — 7-E.1 THROUGH 7-E.10**

The dedicated SLA Reports surface is complete and uses the existing `TicketSla`
snapshot and SLA dashboard semantics. `/reports/sla` remains the operational
SLA Dashboard; `/reports/sla-reports` is the separate SLA reporting surface.
Frontend TypeScript, lint, 175 tests across 13 test files, and the production
build passed. Manual browser verification remains recommended.

### 7-E.1 --- SLA Reports Foundation + API Contract + Backend Aggregation Design

**COMPLETE AND VERIFIED**

Defined and implemented the SLA reporting foundation before adding individual
report visualizations. The implementation reuses the existing Analytics
module/query infrastructure and existing `TicketSla` snapshot data rather
than introducing duplicate SLA persistence.

Implemented:

- Organization-scoped SLA reporting boundary
- `GET /api/v1/reports/analytics/sla` API contract
- Reuse of existing analytics date-range and ticket-dimension filters
- SLA summary aggregation contract
- First-response vs resolution aggregation contract
- Breach and at-risk aggregation
- Server-side SLA aggregation using the existing `TicketSla` snapshot model
- Empty/no-data behavior
- Authentication and organization authorization
- Organization isolation
- Focused SLA Reports API/E2E contract coverage
- Regression coverage against the existing SLA Dashboard and Analytics
  reporting APIs

Implementation boundary:

- Reused `TicketSla` snapshot fields and existing SLA Dashboard semantics.
- Did not introduce a duplicate SLA reporting model or additional SLA
  persistence.
- Kept actual SLA breach semantics authoritative to the existing
  `firstResponseBreachedAt` and `resolutionBreachedAt` timestamps.
- Preserved the existing organization-scoped authentication and
  authorization boundaries.
- Did not introduce new SLA policy or business rules.
- Kept the SLA Reports API separate from the existing operational
  `/reports/sla/dashboard` drill-down endpoint.

Verification:

SLA Reports API E2E 10/10 tests passed
API lint 0 warnings / 0 errors
API production build SUCCESS

Analytics/SLA regression:
Test files 5/5 passed
Tests 100/100 passed
Failures 0

The regression suite covered:

- SLA Reports API
- SLA Dashboard API
- Product Dashboard API
- Analytics Dashboard API
- Analytics Foundation API

7-E.1 is complete and verified. The foundation is ready for the subsequent
SLA report dimensions, trends, breach analysis, filters, and reporting UI.

### 7-E.2 --- SLA Summary

**COMPLETE AND VERIFIED**

- Overall SLA tracked volume
- Breached volume
- At-risk volume
- Active volume
- Resolved volume
- First-response compliance:
  - Completed
  - Compliant
  - Breached
  - Compliance rate
- Resolution compliance:
  - Completed
  - Compliant
  - Breached
  - Compliance rate

Verification:

- SLA Reports E2E: 15/15 passed
- API lint: 0 warnings, 0 errors
- API build: passed
- Combined analytics/SLA regression: 105/105 passed

### 7-E.3 --- SLA Trend

**COMPLETE AND VERIFIED**

- SLA compliance trend over time
- Daily SLA tracked volume
- Daily breach volume
- Daily breach rate
- First-response compliance trend
- Resolution compliance trend
- First-response vs resolution metrics tracked independently
- Supports createdAt and updatedAt as the trend date field
- Preserves organization-level data isolation
- Reuses existing SLA snapshots and shared analytics query filters
- No new persistence model or Prisma migration required

Verification:

- SLA Reports E2E: 20/20 passed
- API lint: 0 warnings, 0 errors
- API build: passed
- Combined analytics/SLA regression: 110/110 passed

### 7-E.4 --- SLA by Priority

**COMPLETE AND VERIFIED**

- SLA compliance by priority
- Breach volume/rate by priority
- First-response and resolution performance by priority
- Deterministic priority ordering: URGENT → HIGH → MEDIUM → LOW
- Organization-scoped priority aggregation
- Shared analytics priority filtering

Verification:

- SLA Reports E2E: 26/26 passed
- API lint: 0 warnings, 0 errors
- API build: passed
- Combined analytics/SLA regression: 116/116 passed across 5 test files

### 7-E.5 --- SLA by Team

**COMPLETE AND VERIFIED**

- SLA compliance by team
- Breach volume/rate by team
- First-response and resolution performance by team
- Unassigned team bucket
- Deterministic team ordering
- Organization-scoped team aggregation
- Shared `teamId` filtering

Verification:

- SLA Reports E2E: 33/33 passed
- API lint: 0 warnings, 0 errors
- API build: passed
- Combined analytics/SLA regression: 123/123 passed across 5 test files

### 7-E.6 --- SLA by Assignee

**COMPLETE AND VERIFIED**

- Assignee SLA metrics
- Unassigned bucket
- Deterministic ordering
- Organization isolation
- assigneeId filtering

Verification:

- 40/40 focused E2E
- 130/130 combined regression
- Build status
- Current lint warning status

### 7-E.7 --- First Response vs Resolution

**COMPLETE AND VERIFIED**

- Separate first-response compliance metrics
- Separate resolution compliance metrics
- Breach comparison and performance breakdown
- Compliance and breach gap calculations in percentage points
- Null-safe comparison metrics when no completed SLA activity exists
- Organization-scoped first-response vs resolution comparison

Verification:

- SLA Reports E2E: 46/46 passed
- API lint: 0 warnings, 0 errors
- API build: passed
- Combined analytics/SLA regression: 136/136 passed across 5 test files

### 7-E.8 --- Breach Analysis

**COMPLETE AND VERIFIED**

- Breach volume and rate
- At-risk volume and rate
- First-response and resolution breach breakdown
- Breach trends by day
- Breach analysis organization scoping
- SLA performance drill-down through the existing SLA ticket dashboard
- Specialized first-response-breached and resolution-breached drill-down views

Verification:

- SLA Reports E2E: 52/52 passed
- Combined analytics/SLA regression: 142/142 passed across 5 test files
- API lint: 0 warnings, 0 errors
- API build: passed
- Frontend TypeScript: passed
- Frontend tests: 162/162 passed
- Frontend production build: passed

### 7-E.9 --- Filters

**COMPLETE AND VERIFIED**

- Date range and date field filtering (`createdAt` / `updatedAt`)
- Status, priority, ticket type, team, assignee, requester, and product filters
- Assignment filters for unassigned/assigned tickets and tickets without/with a team
- URL-synchronized filter state, reset behavior, and date-range validation
- Organization-scoped filtering and validation, including conflicting filter combinations
- Backend SLA report E2E coverage for filter behavior and organization isolation
- Frontend filter unit tests covering parsing, serialization, API parameters, and date validation

Verification:

- API lint: Passed
- API build: Passed
- SLA report E2E tests: **62 passed**
- Frontend TypeScript check: Passed
- Frontend lint: Passed
- Frontend unit tests: **175 passed across 13 test files**
- Frontend production build: Passed

### 7-E.10 --- SLA Reports UI

**COMPLETE AND VERIFIED**

- Dedicated SLA Reports presentation using the verified SLA analytics API contract
- Summary KPIs for tracked, breached, at-risk, active, and resolved tickets
- SLA trend visualization
- Priority, team, and assignee breakdowns
- First-response versus resolution SLA comparison
- Breach and at-risk analysis with supported drill-down links
- Existing report filters, URL synchronization, and date-range validation
- Separate `/reports/sla-reports` route for SLA reporting
- Preserved `/reports/sla` as the operational SLA Dashboard
- No changes to authoritative SLA persistence or backend aggregation

Verification:

- Frontend TypeScript check: Passed
- Frontend lint: Passed
- Frontend unit tests: **175 passed across 13 test files**
- Frontend production build: Passed
- Next.js route generation: Both SLA routes present

## 7-F --- TAT Reports

**COMPLETE AND VERIFIED — 7-F.1 THROUGH 7-F.6**

Implemented a dedicated Time-to-Action (TAT) reporting surface for actual
elapsed operational time. TAT is distinct from SLA compliance: it measures
how long an operational milestone actually took, while an SLA target is the
allowed or contractual duration used to determine compliance or breach.

### Implementation sequence and completion

#### 7-F.1 — Confirm metric semantics

**COMPLETE**

- First-response TAT is `TicketSla.firstRespondedAt - Ticket.createdAt`.
- Resolution TAT is `Ticket.resolvedAt - Ticket.createdAt`.
- Durations are actual elapsed time in minutes; SLA targets, due times,
  remaining time, compliance, and breach status are not TAT inputs.
- Missing endpoint timestamps are excluded from the relevant metric sample.
- Negative elapsed durations are excluded as invalid.
- First-response and resolution metrics use their own eligible ticket samples.
- Cohort selection uses the report's date-range/date-field and ticket-dimension
  filters.
- Percentiles are calculated from valid ticket-level durations, not from
  averages of grouped values, and are exposed as labelled percentile metrics.

#### 7-F.2 — TAT API contract

**COMPLETE**

- Added `tat-report.types.ts` for the report response contract.
- Added `TatReportQueryDto`, reusing the existing analytics query DTO and
  normalization/filter system.
- Added the organization-scoped `GET /api/v1/reports/analytics/tat` endpoint.
- Preserved the shared analytics date-range and ticket-dimension filter model.

#### 7-F.3 — Aggregations

**COMPLETE**

- Summary metrics for first-response and resolution TAT.
- Average, median/P50, and supported additional percentiles.
- TAT trends over time.
- Breakdowns by priority, team, assignee, and product.
- Eligible sample counts and explicit handling of missing/invalid durations.
- Organization-scoped aggregation and existing analytics filter behavior.

#### 7-F.4 — Resolved-ticket drill-down

**COMPLETE**

- Added resolved-ticket drill-down using actual resolution timestamps and
  elapsed resolution duration.
- The count and paginated rows use the same organization scope and filter
  conditions so totals and returned rows remain consistent.
- Preserved the applicable date and ticket-dimension filters.

#### 7-F.5 — Frontend API and UI

**COMPLETE**

- Added the typed frontend API client and independent React Query hook.
- Added the TAT report UI at `/reports/tat`.
- Added the report landing-page link.
- Added frontend tests for report contracts, query behavior, and UI behavior.

#### 7-F.6 — Verification

**COMPLETE**

Verification results recorded for this milestone:

```text
TAT API E2E                 12/12 tests passed
API lint                    0 warnings / 0 errors
API production build        PASS
Frontend TypeScript         PASS
Frontend lint               PASS
Frontend tests              14 test files, 188/188 tests passed
Frontend production build   PASS
Next.js route generation    /reports/tat present
```

The frontend suite includes 13 focused TAT report tests. Verification covers
the report contract and UI tests, filtering and metric behavior, and the
organization-scoped reporting boundary exercised by the TAT API E2E tests.
The attached full E2E log contains external email-provider `422` log messages
during existing tests; these are application log errors, not reported TAT test
failures.

### Final metric and data boundary

- First-response TAT: `TicketSla.firstRespondedAt - Ticket.createdAt`.
- Resolution TAT: `Ticket.resolvedAt - Ticket.createdAt`.
- Durations are measured in elapsed minutes.
- Missing endpoint timestamps do not become zero-valued samples.
- Negative intervals are excluded as invalid.
- SLA targets and due times are never substituted for actual elapsed TAT.
- Existing ticket, SLA, and product persistence is reused; no duplicate
  operational persistence is introduced.
- Authentication, authorization, and organization isolation remain required.
- The resolved-ticket count and page query share the same organization scope
  and filter conditions.

7-F.1 through 7-F.6 are complete and verified. TAT Reports is ready for use;
Phase 7 as a whole remains in progress until its remaining milestones and the
full Phase 7 verification boundary are completed.

## 7-G --- Usage Reports

**PLANNED**

Organization usage analytics using existing persisted activity and ticket
data.

Potential reporting:

- Ticket creation volume
- Ticket activity volume
- Comment volume
- Attachment usage
- Approval usage
- Notification activity
- Active-user/agent usage where existing data supports it
- Usage trends over time

Only metrics supported by persisted data should be exposed.

## 7-H --- Ticket Library Reports

**COMPLETE AND VERIFIED**

Implemented a dedicated Ticket Library reporting surface at `/reports/ticket-library` using the existing organization-scoped Ticket Library query model as the operational source of truth.

Implemented:

- Ticket counts and breakdowns by status, priority, team, and assignee
- Date-bucket reporting using `createdAt` or `updatedAt`
- Unassigned ticket and unassigned-team counts
- Live matching-ticket counts for saved filters
- Filtered result totals that reuse the Ticket Library query predicate
- Supported filters for search, status, priority, ticket type, product, team, assignee, requester, created/updated date ranges, unassigned state, unassigned team, and SLA-breached state
- Facet drill-down links that preserve the other active filters while changing the selected dimension
- URL-backed filters and drill-down into `/tickets`
- Organization isolation and validation of inverted date ranges
- Dedicated frontend drill-down utility tests and API E2E coverage
- `/reports` integration and the `/reports/ticket-library` route

The report reuses the shared Ticket Library filtering model rather than introducing a duplicate operational ticket query or persistence model. Saved-filter reporting shows each saved filter's current matching ticket count; it is not a historical usage-event metric.

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

The full API E2E run emitted non-failing Resend HTTP 422 logs for `example.com` test recipients; all 506 test assertions passed. The user confirmed all tests passed and the UI behaved as expected.

## 7-I --- Exports

**PLANNED**

Provide controlled exports for analytics/reporting datasets.

Planned formats:

- CSV
- XLSX where justified
- JSON where useful for machine-readable reporting

Export requirements:

- Reuse the same organization-scoped query/metric definitions as on-screen
  reports
- Preserve active filters and date ranges
- Enforce authorization server-side
- Prevent cross-organization exports
- Stream large exports where appropriate
- Define stable column/field contracts
- Add export authorization and data-integrity tests

## 7-J --- Full Analytics Verification

**PLANNED**

Final Phase 7 verification boundary:

- Analytics unit tests
- Focused report E2E tests
- Organization isolation
- Permission coverage
- Date/time boundary cases
- Empty/no-data states
- Aggregation correctness
- Drill-down correctness
- Export correctness
- Backend TypeScript
- Backend lint
- Backend production build
- Frontend TypeScript
- Frontend lint
- Frontend tests
- Frontend production build
- Full regression
- Final documentation checkpoint

Phase 7 should not be marked complete until the complete verification
boundary passes.

# Phase 8 --- Production Hardening

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

# Phase 5 --- Productivity

## 5-A --- Ticket Library

**Status: COMPLETE AND VERIFIED**

Completed:

- 5-A.1 --- Ticket Library API/client contract
- 5-A.2 --- `/tickets` page
- 5-A.3 --- Filtering + sorting
- 5-A.4 --- Pagination
- 5-A.5 --- Ticket-row navigation
- 5-A.6 --- E2E/API/frontend verification

Verification:

```text
API E2E              17/17 files passed
API E2E tests        211/211 passed
Web lint             PASS
Web production build PASS
```

Frontend manual verification included `/tickets`, ticket-row navigation
to `/tickets/:id`, ticket detail rendering, back navigation, direct URL
loading, and controlled invalid-ticket handling.

## 5-B --- Ticket Library UX Refinement

**Status: COMPLETE AND VERIFIED**

Completed:

- Refined ticket-list information hierarchy
- Search/filter presentation
- Active-filter controls
- Responsive behavior
- Useful defaults
- URL-backed filtering, sorting, and pagination
- Existing UI primitive reuse

## 5-C --- Saved Filters Foundation

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

- `SavedFilter` Prisma model
- Organization/user ownership relationships
- `20261002185115_add_saved_filters` migration
- Prisma client generation
- Schema validation
- API build/lint
- Foundation E2E coverage

Conceptual model:

```text
id
organizationId
userId
name
description?
filters
createdAt
updatedAt
```

## 5-D --- Saved Filter API

**Status: COMPLETE AND VERIFIED**

```text
POST  /api/v1/saved-filters
GET   /api/v1/saved-filters
GET   /api/v1/saved-filters/:id
PATCH /api/v1/saved-filters/:id
DELETE /api/v1/saved-filters/:id
```

Completed:

- 5-D.1 --- API contract and DTO validation
- 5-D.2 --- Saved Filter service
- 5-D.3 --- Saved Filter controller
- 5-D.4 --- Authentication and organization context
- 5-D.5 --- E2E isolation/CRUD
- 5-D.6 --- Full verification

### 5-D.5 --- E2E isolation/CRUD

**COMPLETE AND VERIFIED**

Verified same-user/same-organization access, different-user isolation,
organization boundaries, create/update/delete behavior, list ownership
isolation, and server-derived ownership.

### 5-D.6 --- Full Verification

**COMPLETE AND VERIFIED**

Latest checkpoint:

```text
API E2E test files   21/21 passed
API E2E tests        249/249 passed
Failures             0
API lint             0 warnings / 0 errors
API production build SUCCESS
```

## 5-E --- Saved Filter UX

**Status: COMPLETE AND VERIFIED**

Planned scope:

- Save current ticket-library filters
- Saved-filter list
- Apply a saved filter to the current ticket library
- Rename/edit saved filters
- Delete saved filters
- Reset back to the normal ticket library
- Clear visual distinction between the current query and saved query
- Preserve URL-backed filtering, sorting, and pagination
- Reuse the existing Saved Filter API and UI primitives

Design boundary:

```text
Current URL query
      |
      v
Ticket Library current query
      |
      +---- Save current query ----> Saved Filter API
      +---- Apply saved filter ---> URL query
      +---- Reset ---------------> normal /tickets query

Saved Filter API
      |
      v
Saved-filter list
      +---- Rename/edit
      +---- Delete
```

The URL remains the source of truth for the current ticket query. A
saved filter is a named server-side query definition that can be applied
to that query; it is not a competing client-side source of truth.

## 5-F --- Full Phase 5 Verification

**Status: IN PROGRESS**

Verification boundary:

### Backend

- Unit tests
- Full E2E tests
- Lint
- Production build

### Frontend

- Lint
- Production build

### Functional/security verification

- Organization isolation
- Saved-filter ownership
- Invalid saved-filter payloads
- Pagination/filter interaction
- Applying a saved filter reproduces the intended ticket query
- Edit permissions
- Delete permissions
- Save/apply/reset/edit/delete workflow regression
- Current-query vs saved-query behavior

Final verification checkpoint:

```text
Backend unit tests      3/3 test files, 29/29 tests passed
Backend E2E             21/21 test files, 249/249 tests passed
Backend lint            0 warnings / 0 errors
Backend build           SUCCESS
Frontend lint           PASS
Frontend build          SUCCESS
Failures                0
```

Verified functional/security coverage includes organization isolation, saved-filter ownership, invalid payloads, pagination/filter interaction, saved-filter query reproduction, edit permissions, delete permissions, and the complete save/apply/reset/edit/delete workflow.

Known test-environment note: some E2E flows emit Resend HTTP 422/429 logs for `example.com` test recipients or provider rate limits. These logs did not produce failed test assertions; the complete E2E run passed 249/249.

Phase 5 — Productivity is COMPLETE AND VERIFIED.

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
Phase 5-D Saved Filter API         COMPLETE AND VERIFIED
Phase 5-E Saved Filter UX          COMPLETE AND VERIFIED
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

# Verification Commands and Historical Baseline

```powershell
docker compose exec api npm run test:e2e
docker compose exec api npm run lint
docker compose exec api npm run build
docker compose exec web npx tsc --noEmit
docker compose exec web npm run lint
docker compose exec web npm run test
docker compose exec web npm run build
```

Previous Phase 5-F API E2E checkpoint (historical baseline):

```text
E2E test files       21/21 passed
E2E tests            249/249 passed
Failures             0
```

Current frontend/TAT verification:

```text
TypeScript check     PASS
Production build     SUCCESS
/report/tat route     PRESENT
TAT UI               MANUALLY VERIFIED
```

Latest TAT milestone verification:

```text
Focused TAT API E2E  12/12 passed
Full API E2E         PASS (user-confirmed; exact total not recorded here)
Frontend TypeScript  PASS
Frontend build       PASS
TAT route/UI         VERIFIED
```

## Phase 5-F Verification Checklist

```text
Backend unit tests              PASS
Backend E2E tests               PASS
Backend lint                    PASS
Backend production build        PASS
Frontend lint                   PASS
Frontend production build       PASS

Organization isolation          PASS
Saved-filter ownership          PASS
Invalid filter payloads         PASS
Pagination/filter interaction   PASS
Saved-filter query reproduction PASS
Edit permissions                PASS
Delete permissions              PASS
```

# Phase 6 — SLA

**Status: IN PROGRESS — Phase 6-A COMPLETE AND VERIFIED**

Phase 3-H established the underlying SLA automation foundation. Phase 6
focuses on the product-level SLA experience and operational workflow.

## 6-A — SLA Policy Management

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

- 6-A.1 — SLA Foundation Audit & API Contract
- 6-A.2 — SLA Policy API Test Coverage & Contract Hardening
- 6-A.3 — SLA Policy Lifecycle Semantics
- 6-A.4 — Frontend SLA Policy Management Shell
- 6-A.5 — Policy Create/Edit + Target Editing
- 6-A.6 — Activation/Deactivation UX
- 6-A.7 — Frontend Authorization & Organization Isolation
- 6-A.8 — SLA Policy Delete UX
- 6-A Verification — Full Phase 6-A verification

Verified policy lifecycle:

```text
Create → INACTIVE
Activate → ACTIVE
Deactivate → INACTIVE
Delete → INACTIVE policies only
```

Authorization:

```text
View policies:
REQUESTER ✓
AGENT     ✓
ADMIN     ✓
OWNER     ✓

Manage policies:
REQUESTER —
AGENT     —
ADMIN     ✓
OWNER     ✓
```

Management operations include:

- Create
- Edit
- Target editing
- Activate
- Deactivate
- Delete
- Lifecycle confirmation
- Pending/error states
- Organization isolation
- Frontend authorization-aware UX
- Backend authorization as the authoritative security boundary

Delete behavior is explicitly verified:

- ADMIN can delete inactive policies
- OWNER can delete inactive policies
- Active policies cannot be deleted until deactivated
- REQUESTER and AGENT cannot delete policies
- Cross-organization deletion is rejected

Phase 6-A verification completed successfully across:

- Frontend lint
- Frontend TypeScript
- Frontend production build
- SLA Policy E2E
- Full backend E2E
- Backend lint
- Backend production build
- Manual policy lifecycle workflow
- Manual role/authorization workflow
- Manual delete workflow

## 6-B — Ticket SLA Timer Experience

**Status: COMPLETE AND VERIFIED**

Scope:

- Expose existing Ticket SLA snapshot data cleanly to the frontend
- First-response timer
- Resolution timer
- Remaining-time / elapsed-time presentation
- Breached state presentation
- Ticket detail integration
- Library/list SLA indicators where appropriate

Implementation boundary:

- Reuse the existing `TicketSla` snapshot and due-time data.
- Do not introduce duplicate SLA timer or SLA snapshot models.
- Preserve the snapshot semantics captured when the ticket is created.
- Keep organization scoping and existing ticket authorization unchanged.
- Derive presentation state from existing SLA timestamps and breach fields.
- Do not invent SLA warning thresholds in 6-B; warnings belong to 6-C and require defined business rules.
- Keep timer presentation deterministic and testable.
- Verify API contract, frontend behavior, lint, TypeScript, build, and regression E2E before moving to 6-C.

6-B.5 presentation test result:

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

## 6-C — SLA Warnings

**Status: COMPLETE AND VERIFIED**

Implemented and verified:

- 6-C.1 — Define + encode warning threshold
- 6-C.2 — Warning calculation
- 6-C.3 — UI warning indicators
- 6-C.4 — Realtime warning handling
- 6-C.5 — Boundary tests
- 6-C.6 — Full Phase 6-C verification

Warning rule:

> An SLA enters WARNING when 20% or less of the original SLA window
> remains, while the SLA is still before its due time.

The threshold is proportional to the captured SLA duration:

- 15 minutes → final 3 minutes
- 30 minutes → final 6 minutes
- 1 hour → final 12 minutes
- 4 hours → final 48 minutes
- 24 hours → final 4 hours 48 minutes

This is a TechTicket product-design inference for a quick-support/helpdesk
workflow, not an official numeric rule claimed from the referenced Quick
Support product documentation.

Warning is a derived presentation state only. It does not change existing
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
- Existing `breachedAt` → BREACHED
- Warning does not create a database state or Socket.IO warning event

Verification:

```text
Frontend test files  2/2 passed
Frontend tests       43/43 passed
Frontend lint        PASS
Frontend TypeScript  PASS
Frontend build       SUCCESS
Failures             0
```

The warning calculation is derived locally from the existing SLA snapshot
and clock. Existing backend breach detection and realtime breach events
remain authoritative for actual SLA breaches.

## 6-D — SLA Breach Operations

**Status: COMPLETE AND VERIFIED**

Goal:

Turn the existing SLA breach engine into an operational ticket workflow
without changing breach detection or idempotency.

Implementation boundary:

- Reuse existing `TicketSla` breach timestamps.
- Reuse existing `SlaEscalation` records.
- Reuse existing SLA breach audit activities.
- Reuse existing SLA breach realtime events.
- Preserve organization scoping and authorization.
- Do not introduce a duplicate breach model.
- Do not change existing breach detection semantics.
- Preserve `SlaEscalation` idempotency through the existing
  `@@unique([ticketSlaId, type])` constraint and `skipDuplicates` behavior.

### 6-D Milestones

- 6-D.1 — Breach operational data/API contract — **COMPLETE AND VERIFIED**
- 6-D.2 — Ticket breach indicators — **COMPLETE AND VERIFIED**
- 6-D.3 — Breach filtering — **COMPLETE & VERIFIED**
- 6-D.4 — Breach history/activity presentation — **COMPLETE & VERIFIED**
- 6-D.5 — Escalation record exposure where required — **COMPLETE & VERIFIED**
- 6-D.6 — Realtime breach presentation — **COMPLETE AND VERIFIED**
- 6-D.7 — Breach authorization and organization isolation — **COMPLETE AND VERIFIED**
- 6-D.8 — Full 6-D verification — **COMPLETE AND VERIFIED**

### 6-D.7 / 6-D.8 Verification Checkpoint

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

The 6-D implementation and verification boundary is complete. The next
implementation milestone is 6-E — SLA Dashboard.

## 6-E — SLA Dashboard

**COMPLETE AND VERIFIED — 2026-10-05**

The SLA Dashboard is implemented as a read-only operational reporting
surface using the existing `TicketSla` snapshot, ticket, team, assignee,
breach, and resolution data.

Implemented:

- Server-side SLA dashboard aggregation
- Paginated SLA ticket drill-down
- Total, active, at-risk, breached, and resolved metrics
- First-response completion/compliance/breach metrics
- Resolution completion/compliance/breach metrics
- ALL, ACTIVE, AT_RISK, BREACHED, RESOLVED,
  FIRST_RESPONSE_BREACHED, and RESOLUTION_BREACHED views
- Priority, team, and created-date filtering
- Organization-scoped dashboard queries
- Ticket detail links and pagination
- `/reports` reporting landing page
- `/reports/sla` SLA Dashboard route
- Frontend API client and React Query integration
- Dedicated frontend SLA dashboard tests

Implementation boundary:

- Reuse the existing `TicketSla` snapshot and ticket domain.
- Do not introduce a duplicate SLA reporting or queue data model.
- Preserve organization scoping and existing authorization boundaries.
- Preserve existing SLA due-time, warning, breach, escalation, audit, and
  realtime semantics.
- Keep dashboard aggregation server-side.
- Dashboard metric cards/views are intentionally overlapping operational
  dimensions; they are not required to sum to the total.

Verification checkpoint:

```text
Frontend TypeScript       PASS
Frontend lint             PASS
Frontend test files       7/7 passed
Frontend tests            86/86 passed
Frontend production build SUCCESS
Failures                  0
```

The `/reports` landing page provides the reporting navigation boundary for
the implemented SLA Dashboard. Future reports remain explicitly marked as
unavailable rather than presenting fabricated metrics.

## 6-F — Full SLA Verification

**COMPLETE AND VERIFIED — 2026-10-05**

Final SLA verification passed across backend, frontend, authorization,
organization isolation, timer boundaries, warning/breach transitions,
realtime behavior, regression, and production build gates.

### Verification checkpoint

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

### Functional/security verification

Verified:

- Organization isolation
- SLA authorization/permission coverage
- SLA dashboard aggregation and drill-down
- SLA breach operations
- SLA policy lifecycle
- Timer boundary conditions
- 20% warning-threshold boundaries
- Warning/overdue/breach state precedence
- Realtime SLA breach events
- Realtime organization/ticket/user room isolation
- Full API regression
- Frontend SLA regression
- Backend lint and production build
- Frontend TypeScript, lint, tests, and production build

The full E2E run emitted Resend HTTP 422 messages for `example.com`
development/test recipients. These provider-environment messages did not
produce failed test assertions; the complete suite still passed 319/319.

Phase 6 — SLA is now **COMPLETE AND VERIFIED**.

Phase 7 — Analytics is the next implementation phase.

# Next Development Direction

Phase 4 is complete.
Phase 5-A through Phase 5-F are **COMPLETE AND VERIFIED**.
Phase 6-A through Phase 6-F are **COMPLETE AND VERIFIED**.
Phase 7-A through 7-C.4 are **COMPLETE AND VERIFIED**.
Phase 7-E.1 through 7-E.10 — SLA Reports — are **COMPLETE AND VERIFIED**.
Phase 7-F — TAT Reports — is **COMPLETE AND VERIFIED**.
Phase 7-H — Ticket Library Reports — is **COMPLETE AND VERIFIED**.

The next implementation milestone is:

**7-D --- Employee Dashboard**

Agent/employee performance and workload reporting. Planned reporting includes
assigned ticket volume, open workload, resolved volume, unassigned-to-assigned
workload flow, first-response and resolution/TAT performance, SLA compliance
and breach counts, average and median resolution time, reopen metrics where
supported by existing data, employee workload distribution, and authorized
team comparison. Preserve organization and permission boundaries and reuse the
existing ticket, SLA, and analytics domain data.

Phase 7 remains in progress overall. 7-G Usage Reports, 7-I Exports, and 7-J
Full Analytics Verification remain planned for later milestones.
