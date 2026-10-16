# TechTicket Implementation Plan

This document tracks the implementation progress of TechTicket.

The roadmap is intentionally incremental: each feature should be
implemented, built, and verified before moving to the next dependent
feature.

# Current Phase

## Phase 7 --- Analytics

**Status: COMPLETE AND VERIFIED**

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

**COMPLETE AND VERIFIED**

Implemented the Employee Dashboard UI at `/reports/employees` and the
organization-scoped reporting endpoint `GET /api/v1/reports/analytics/employees`.
The implementation reuses existing ticket, SLA snapshot, membership, team, and
ticket activity data; no duplicate reporting persistence or Prisma migration
was introduced.

Implemented reporting:

- Assigned tickets, open workload, and resolved tickets
- Average first-response time from `Ticket.createdAt` to
  `TicketSla.firstRespondedAt`
- Average resolution time from `Ticket.createdAt` to `Ticket.resolvedAt`
- Overall SLA compliance and breach metrics, with first-response and resolution
  completion/compliance reported independently
- Reopened-ticket counts derived from recorded `STATUS_CHANGED` activity
  entries transitioning from `RESOLVED`/`CLOSED` to `IN_PROGRESS`/`PENDING`
- Current workload as a live count of assigned `OPEN`, `IN_PROGRESS`, and
  `PENDING` tickets
- Resolution trend grouped by the actual `resolvedAt` date
- Employee workload distribution with proportional bars and numeric counts
- Employee selection and team comparison for authorized organization roles
- Existing report filtering and date-range validation

Metric boundaries:

- Missing or negative first-response/resolution durations are excluded from
  their respective averages; they are not converted to zero-minute samples.
- Resolution trend uses the resolution event date, not the ticket creation date.
- Current workload is a live snapshot and is not restricted by the selected
  report date range/status cohort; applicable dimensions such as team and
  priority can still constrain it.
- Reopen counts are derived from existing audit history; no dedicated reopen
  persistence model was added.

Authorization and organization isolation are enforced server-side:

- `OWNER` and `ADMIN` may view organization-wide employee analytics and compare
  agents/teams within the active organization.
- `AGENT` may view only their own employee metrics; requests to select another
  employee are rejected. Organization-wide employee directories and team
  comparisons are not exposed to agents, and team filtering is limited to
  teams they belong to.
- `REQUESTER` access is denied.
- Employee/team selection is validated against the active organization context;
  the report never trusts a caller-supplied organization ID.

Verification:

```text
Employee Dashboard API E2E      5/5 tests passed
API lint                        0 warnings / 0 errors
API production build            PASS
Frontend TypeScript             PASS
Frontend lint                   PASS
Frontend tests                  15/15 files, 194/194 tests passed
Frontend production build       PASS
Next.js static page generation  17/17 pages passed
Route                           /reports/employees present
Manual UI verification          PASS (user-confirmed)
```

The focused API E2E suite verified organization-scoped metrics and employee
selection, cross-organization isolation, AGENT self-only access, REQUESTER
denial/non-agent selection rejection, and inverted date-range validation.
The user confirmed all verification commands passed and the UI was verified.
This checkpoint records focused Employee Dashboard API E2E coverage; a
post-7-D full API E2E regression total was not supplied.

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

7-F.1 through 7-F.6 are complete and verified. TAT Reports is ready for use.
Phase 7 subsequently completed 7-G Usage Reports, 7-I Exports, and 7-J Full
Analytics Verification; Phase 7 is now complete and verified.

## 7-G --- Usage Reports

**COMPLETE AND VERIFIED**

Implemented the organization-scoped Usage Reports surface at `/reports/usage`, using existing persisted ticket, activity, comment, attachment, approval, and membership data. The report measures organization usage without introducing duplicate reporting persistence.

Implemented reporting:

- Ticket creation volume
- Ticket activity volume
- Comment volume
- Attachment usage
- Approval request volume
- Active users and active agents
- Daily usage trends for supported metrics
- Summary metrics and date-range reporting
- Organization-scoped aggregation and isolation
- Empty-data behavior with zero-filled daily trend buckets
- Usage Reports card linked from the main `/reports` landing page

Metric boundaries:

- Metrics are derived from existing persisted domain data.
- Notification counts are **unavailable** because notification activity is not persisted in a form suitable for this report. The API explicitly identifies this limitation rather than reporting fabricated counts.
- Trend values represent the selected reporting period and use daily buckets.
- Existing authentication, organization scoping, and authorization boundaries remain in effect.
- No duplicate operational data models or persistence were introduced.

Verification:

```text
Usage Reports API E2E             5/5 tests passed
API lint                           PASS
API production build               PASS
Frontend TypeScript                PASS
Frontend lint                      PASS
Frontend tests                     16/16 files, 205/205 tests passed
Frontend production build          PASS
/reports/usage route               VERIFIED
Usage Reports UI                   MANUALLY VERIFIED
/reports navigation link           VERIFIED
Failures                           0
```

The user confirmed that all tests passed and the Usage Reports UI was verified, including the report's integration with the main Reports landing page.

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

**COMPLETE AND VERIFIED**

Implemented controlled exports for analytics/reporting datasets.

Implemented formats:

- CSV
- JSON for machine-readable reporting

Verified requirements:

- Reuses organization-scoped query and metric definitions from on-screen reports
- Preserves supported filters and date ranges
- Enforces authorization server-side
- Prevents cross-organization exports
- Streams export serialization
- Defines stable CSV and JSON field contracts
- Includes export authorization and data-integrity tests
- Neutralizes spreadsheet formula injection in exported CSV text fields

Verification:

- Analytics export E2E tests: 7/7 passed
- Usage report E2E tests passed
- TAT report E2E tests passed
- Backend TypeScript, lint, and production build passed
- Frontend TypeScript, lint, tests, and production build passed
- UI verification completed successfully

Implementation note: Export serialization is streamed, but the existing report payload is assembled in memory before serialization. Batch/cursor-based database streaming for very large exports remains a potential future enhancement.

## 7-J --- Full Analytics Verification

**COMPLETE AND VERIFIED**

Final Phase 7 verification boundary passed:

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
- Manual UI verification
- Final documentation checkpoint

Verification:

- Backend unit tests: 44 passed
- Backend E2E tests: 524 passed
- Frontend tests: 205 passed
- Backend TypeScript, lint, and production build: passed
- Frontend TypeScript, lint, and production build: passed
- Analytics organization isolation, report boundaries, and CSV formula-injection protection: verified
- Analytics UI: manually verified

Phase 7 verification is complete. All required automated checks and manual UI verification have passed.

# Product UI Completion Roadmap

**Status: UI-1 THROUGH UI-7 COMPLETE AND VERIFIED — DEFERRED DEPARTMENT AND SETTINGS FOLLOW-ONS REMAIN PLANNED**

Phase 7 Analytics is complete and verified. The next priority is to close the blueprint-level user-facing gaps so the product's ticketing, approval, library, search, and notification workflows are reachable and use real domain data. Reuse existing APIs, services, query contracts, and authorization rather than introducing duplicate operational models.

The desktop navigation currently uses **Ticket Library** and the Tasks item has been removed. Preserve these decisions: use the Ticket Library label consistently, do not reintroduce Tasks navigation or routes, and keep desktop and mobile navigation aligned.

## UI-1 — Raise a Ticket / Ticket Creation

**COMPLETE AND VERIFIED**

Implemented

- Added clearly visible Raise Ticket actions to the Dashboard and My Tickets page.
- Implemented the canonical /tickets/create route, with title, description, type, priority, and optional product selection.
- Reused the existing POST /api/v1/tickets contract and authenticated organization context.
- Preserved requester/agent creation semantics: the authenticated creator is recorded as the requester.
- Preserved server-side authentication, authorization, and organization isolation. The UI is not treated as the security boundary.
- Added client-side validation for required fields, title length, attachment size, and supported attachment types.
- Implemented pending, validation, API error, and success states.
- Added support for uploading attachments through the existing ticket attachment API after ticket creation.
- Added an Attachments panel to the ticket detail page, displaying attachment metadata and providing a working download action.
- On successful creation, navigate to the new ticket detail page and invalidate relevant React Query data.
- Added frontend validation and API-contract tests, plus API end-to-end coverage for creation, invalid input, authentication, authorization, and organization isolation.

Verification — Passed

- TypeScript: npx tsc --noEmit completed without errors.
- Lint: passed without errors.
- Production build: npm run build completed successfully; /tickets/create was registered in the application route output.
- Frontend tests: ticket creation, validation, and attachment API-contract tests passed.
- API E2E tests: all 6 ticket-creation tests passed, covering successful requester creation, agent creation, invalid input, unauthenticated access, unauthorized organization access, and attempted organization-context override.
- Manual UI verification: completed successfully. Ticket creation works from both Dashboard and My Tickets, successful submission navigates to the ticket detail page, and uploaded attachments are visible and downloadable.
- Confirmed that attachment failures are handled separately from ticket creation, avoiding the need to create a duplicate ticket when an upload fails.

Outcome: UI-1 is complete. The ticket-creation workflow and attachment visibility/download behavior have been verified.

## UI-2 — Complete Core Navigation and Missing Pages

**PENDING Departments — deferred follow-on**

The core navigation and missing-page work has been implemented. Desktop and mobile navigation use a shared definition, and the top-level Approvals, Ticket Library, Users, and Products pages are present. Ticket Library is a persistent knowledge experience, separate from both the operational ticket list and the Ticket Library analytics report. Tasks and the obsolete Case Library navigation entry remain removed.

Implemented:

- **Approvals inbox:** added an organization-scoped inbox query at `GET /api/v1/approvals` with status filtering. It shows approvals assigned to the authenticated user with ticket and requester context, provides loading/error/empty states, links to ticket details, and exposes approve/reject actions with comments. Server-side approval identity, permissions, and organization isolation remain enforced by the API.
- **Ticket Library:** implemented the knowledge/library experience at `/ticket-library`, separate from `/tickets` and `/reports/ticket-library`. It supports persistent article CRUD, search/filtering, tags, product association, and optional linking to an eligible resolved/closed ticket. API access is organization-scoped and protected by server-side authorization.
- **Users directory:** implemented `/users` using the existing organization-membership API. The UI exposes supported membership and role operations to authorized roles and does not imply that adding an existing user by email creates a new account or sends an invitation when the API does not provide that contract.
- **Products management:** implemented `/products` over the existing product CRUD API, including active/inactive lifecycle state and role-gated management operations.
- **Shared navigation and routes:** desktop and mobile navigation share the same definition. The top-bar Settings action points to `/settings`; the new top-level routes are registered and covered by navigation/API-contract smoke tests. Do not reintroduce the removed Tasks item or build `/tasks` unless product scope is explicitly changed.
- **Departments — deferred follow-on:** the audit at `docs-ui2-department-audit.md` confirms there is no `Department` Prisma model or department API. The blueprint does not define department scoping, relationships to users/tickets, hierarchy, or exact manager/role permissions. Do not create a placeholder page, substitute Teams, or add `/departments` to active navigation. Before implementation, define the domain relationships and authorization, then plan the Prisma migration, organization-scoped CRUD API, UI, and tests.

Verification completed:

- Frontend Vitest suite: **227 tests passed across 19 files**, including `navigation-routes.test.ts` (4 tests) and `ui2-api-contracts.test.ts` (6 tests).
- Approval inbox API E2E: **5/5 passed** after fixing route registration and test cleanup.
- Ticket Library API E2E: **6/6 passed** after correcting the test's ticket-status transition setup.
- Backend Vitest suite: **545 tests passed across 38 files**
- Frontend and API TypeScript checks: passed with no reported errors.
- Frontend and API lint: passed; API and web production builds passed.
- Prisma schema formatting and validation passed; the `add_ticket_library` migration was applied locally and Prisma Client generation succeeded.
- Manual navigation and workflow verification: reported complete and working as expected.

## UI-3 — Live Operational Dashboard

**COMPLETE AND VERIFIED**

Replaced the hardcoded `/dashboard` KPIs, invented weekly deltas, placeholder Ticket Trends chart, and hardcoded priority distribution with live, organization-scoped data backed by the existing analytics and ticket APIs.

The operational dashboard now focuses on current workload, actionable priorities, SLA issues, and quick navigation. Historical analysis, detailed filtering, comparisons, and exports remain under `/reports`.

**Implemented:**

- **Live operational KPIs:** Replaced static counts with API-backed ticket metrics, including Open Tickets, In Progress, Resolved / Closed, SLA Breaches, Unassigned Active, and New Tickets (7 days).
- **Valid trend comparisons:** Added a week-over-week comparison for new-ticket volume using equal, complete seven-day windows. Comparison percentages are omitted when a valid prior-period baseline is unavailable. No invented trend values are displayed.
- **Ticket Trends:** Connected the chart to existing persisted ticket-volume trend data. Sparse daily results are normalized to include zero-count calendar days.
- **Priority Distribution:** Replaced hardcoded distribution values with actual API aggregates. `URGENT` maps to the UI label **Urgent** consistently; no separate persisted `Critical` priority was introduced.
- **Quick actions:** Added navigation for Raise Ticket, My Tickets, Ticket Library, Approvals, and relevant SLA breach views.
- **Recently updated tickets:** Uses persisted ticket data and update timestamps rather than fabricated activity.
- **Loading and error states:** Distinguished loading, API failures, unavailable metrics, and genuine zero-data results. API failures do not silently fall back to hardcoded or fabricated counts.
- **Organization and role isolation:** Enforced organization scoping and requester self-scoping on the server for analytics aggregates and ticket-list queries, preventing requesters from widening visibility by supplying another user's `requesterId`.
- **Refresh and responsive behavior:** Added dashboard refresh behavior and responsive presentation for operational use.

**Verification — PASSED:**

- Web TypeScript check: `docker compose exec web npx tsc --noEmit`.
- API TypeScript check: `docker compose exec api npx tsc --noEmit`.
- Web lint: `docker compose exec web npm run lint`.
- API lint: `docker compose exec api npm run lint` — zero warnings and zero errors.
- Web unit/component tests: **236 tests passed across 20 files**, including 9 operational-dashboard tests covering populated data, empty data, priority mapping, comparison baselines, requester scoping, loading/error/unavailable states, and API failures.
- API unit tests: **44 tests passed across 4 files**.
- Full API E2E suite: **546 tests passed across 39 files**.
- Dashboard visibility E2E: passed; requester dashboard aggregates and recent-ticket lists are restricted to the authenticated requester's tickets.
- Analytics dashboard E2E: **20 tests passed**, covering metric correctness, date filtering, priority distribution, ticket-volume trends, empty results, authentication, and organization isolation.
- Web production build: passed. Next.js successfully compiled, completed TypeScript checks, generated static pages, and included `/dashboard` and the expected application routes.
- API production build: `docker compose exec api npm run build` completed successfully.
- Manual verification: completed; the dashboard was checked against seeded live tickets and confirmed to update and operate as expected.

**Definition of done:** Required operational metrics and charts use supported persisted data; comparison windows are valid; priority labels match the persisted enum; loading, error, zero-data, and unavailable states are explicit; organization and requester visibility are enforced server-side; automated tests and production builds pass; and manual dashboard verification is complete.

**Known non-blocking test-environment noise:** The full API E2E run logged Resend `422` errors for test emails using `example.com`, and Vitest printed configuration deprecation warnings. These did not fail the reported test suites and are separate cleanup items, not blockers for UI-3.

## UI-4 — Functional Global Search

**COMPLETE AND VERIFIED**

Implemented the first version of Global Search in the top-bar command menu, using the existing organization-scoped ticket-list API contract. The scope is intentionally ticket search only for this milestone; the follow-up expansion is tracked separately under UI-4.1.

Implemented:

- Controlled, accessible search input with query normalization and debounced requests.
- Ticket search through the existing `GET /api/v1/tickets?search=...` contract and active organization context. The existing API client passes `x-organization-id`; authorization and organization isolation remain enforced server-side.
- Loading, results, no-results, workspace-loading/error, API-error, and no-organization states.
- Keyboard result navigation with Up/Down, Enter to open the selected ticket, and click/tap selection.
- “View all results” navigation to `/tickets` with the normalized search query preserved.
- Escape handling, initial input focus, focus restoration, Ctrl+K/Cmd+K shortcut support, and responsive mobile interaction.
- A bounded result list ordered by most recently updated tickets, reusing the existing ticket API, React Query hook, types, and organization context.
- Query/state and API-contract tests without introducing new backend endpoints or database persistence.

Scope boundary:

- User and Ticket Library search were not added to the command menu in UI-4.
- Ticket Library search already has a supported API contract and is planned as the first UI-4.1 expansion.
- The existing organization-member listing API is restricted to OWNER/ADMIN and does not currently accept a search parameter. UI-4.1B records the approved first-version policy and contract: keep the OWNER/ADMIN boundary, search name/email server-side within the active organization, limit results, and return only fields needed by the command menu.

Verification — PASSED (user-confirmed):

Focused ticket-search tests 21/21 passed
Full frontend test suite 257/257 passed across 21 files
Frontend TypeScript PASS — npx tsc --noEmit
Frontend lint PASS — npm run lint
Frontend production build PASS — npm run build
Next.js static page generation 23/23 pages passed
Manual keyboard verification PASS
Manual mobile verification PASS

Manual keyboard and mobile verification were confirmed complete by the user. No API endpoint, Prisma model, or migration was added for UI-4.

**Definition of done:** Ticket search uses the existing organization-scoped API; result, empty, loading, and error states are explicit; keyboard selection, focus behavior, query-preserving navigation, and mobile interaction work; automated tests, TypeScript, lint, and production build pass; and manual verification is complete.

## UI-4.1 — Global Search Expansion

**COMPLETE AND VERIFIED**

Expanded the existing global command-menu search to support Tickets, Ticket Library articles, and organization users. The implementation reuses existing API clients and routes, preserves ticket and article search behavior, and enforces server-side authorization and organization isolation for user search.

### UI-4.1A — Ticket Library Search Integration

**COMPLETE AND VERIFIED**

The existing Ticket Library API supports search; no new endpoint was required for this integration.

**Confirmed contract:**

- `GET /api/v1/ticket-library` accepts `search`, `page`, `limit`, and optional `productId` query parameters.
- The backend searches article title, problem, resolution, and tags, and constrains queries to `context.organizationId`.
- The existing frontend `getTicketLibraryEntries(organizationId, params)` client sends `x-organization-id`.
- The existing `/ticket-library` page is used for article selection. No unregistered `/ticket-library/:entryId` route is assumed or exposed.

**Implemented:**

- Added Ticket Library articles as a distinct result group in the global search menu, reusing the existing API client, response types, query conventions, and organization context.
- Reused normalized and debounced search input and implemented result handling for tickets and articles.
- Added article selection/navigation through the existing `/ticket-library` page, preserving the search query and selected article context. The selection URL also preserves the article's product context when available.
- Kept keyboard navigation, Enter/click/tap selection, Escape handling, focus behavior, and responsive interaction consistent with the existing command menu.
- Added frontend tests for article-search request construction, missing organization context, empty queries, query normalization, organization scope, API failures, and article selection URLs.
- Extended Ticket Library API E2E coverage to verify search across title, problem, resolution, and tags, alongside organization-isolation and authorization coverage.

**UI-4.1A verification results:**

- **Lint:** PASS — no ESLint warnings or errors reported.
- **TypeScript:** PASS — `npx tsc --noEmit`.
- **Focused frontend search tests:** PASS — 28/28 tests in `ticket-search.test.ts`.
- **Ticket Library API E2E tests:** PASS — 7/7 tests in `ticket-library.e2e-spec.ts`.
- **Frontend test suite at the UI-4.1A checkpoint:** PASS — 264/264 tests across 21 files.
- **Production build:** PASS — Next.js production build completed and all 23 pages were generated successfully.
- **Manual UI verification:** COMPLETE — global search and article selection/navigation work as expected.

The API E2E run emitted non-blocking Vite configuration warnings concerning native config loading and `vite-tsconfig-paths`. These warnings did not fail the reported tests.

### UI-4.1B — User Search Contract and Authorization Policy

**COMPLETE AND VERIFIED**

Implemented the approved user-search authorization policy and server-side search contract by extending the existing `GET /api/v1/members` endpoint. User search does not use an unrestricted global directory, introduce a duplicate search endpoint, or fetch the entire member list for global-search filtering.

**Authorization policy implemented:**

- Only organization `OWNER` and `ADMIN` roles may search organization members, preserving the existing members-directory authorization boundary.
- Other roles are denied by the API and are not offered user results in the global search UI. Frontend visibility is treated as a usability measure, not the security boundary.
- The backend derives organization scope from the authenticated organization context. Search results cannot span organizations, and a caller-supplied organization ID is not used to override authorization.

**Server-side search contract implemented:**

- Extended `GET /api/v1/members` with a `search` query parameter and bounded `limit` parameter.
- Uses database-side, case-insensitive partial matching against member name and email fields.
- Normalizes queries by trimming whitespace and collapsing repeated whitespace.
- Validates search queries to require 2–100 characters after normalization. Invalid supplied queries are rejected through the API's standard validation behavior.
- Enforces a maximum of 8 search results. The API validates the requested limit and cannot return more than 8 results for a valid search request.
- Returns only the user ID, display name, and email address needed for presentation and selection. Search results do not expose authentication tokens, password hashes, or unrelated account/security fields.
- Preserves the existing `GET /api/v1/members` list behavior when `search` is omitted, maintaining compatibility with the current Users management page.
- Uses the existing organization-scoped membership and user data. No new database model or Prisma migration was required.

**Global search integration implemented:**

- Added an Organization Users result group alongside Tickets and Ticket Library articles.
- User results are requested only when the active membership role is `OWNER` or `ADMIN`, and the menu is open with a valid, settled search query.
- Added loading, empty, API-error, and retry states for the user result group. User search failures do not convert ticket or article search failures into empty results.
- Added keyboard navigation and selection through the existing combined result index, including Up/Down, Enter, click/tap, and Escape handling.
- Preserved existing ticket-detail navigation and Ticket Library article navigation.
- Added the Users API client method, minimal `MemberSearchResult` type, query/request helpers, and URL construction helpers.

**Selection/navigation contract implemented:**

- Reuses the existing `/users` page. No user-detail route was added.
- Navigates to URLs such as `/users?search=rahul&selectedUserId=<member-id>`.
- The Users page reads search and selected-member state from the URL.
- Added name/email filtering, URL-backed query updates, selected-member highlighting, scrolling, and focus behavior.
- Changing the directory query clears the previous selection, and existing membership-management controls remain intact.
- A selected user is only highlighted when the user belongs to the active organization's authorized member directory.

**UI-4.1B verification results:**

- **Focused API E2E tests:** PASS — 9/9 tests in `members-directory.e2e-spec.ts`.
- **Authorization coverage:** PASS — OWNER/ADMIN access and AGENT/REQUESTER denial verified.
- **Search behavior:** PASS — name/email matching, case-insensitive search, query validation, and result limits verified.
- **Data minimization:** PASS — search results contain only the approved fields.
- **Organization isolation:** PASS — members outside the active organization are not returned.
- **Focused frontend member-search tests:** PASS — 9/9 tests in `member-search.test.ts`.
- **API TypeScript check:** PASS — `npx tsc --noEmit`.
- **API lint:** PASS — zero warnings and zero errors.
- **Frontend TypeScript check:** PASS — `npx tsc --noEmit`.
- **Frontend lint:** PASS.
- **Full frontend test suite:** PASS — 273/273 tests across 22 files.
- **Full API E2E regression:** PASS — 552/552 tests across 39 files.
- **Frontend production build:** PASS — Next.js production build completed and all 23 pages were generated successfully, including `/users`, `/tickets`, and `/ticket-library`.
- **API production build:** PASS — `npm run build` / NestJS production build.
- **Manual UI verification:** COMPLETE — the user confirmed that the UI works as expected.

The API E2E runs emitted non-blocking Vite configuration warnings and Resend HTTP 422 logs for test messages sent to `example.com` addresses. The full API E2E suite passed all 552 tests. These test-environment warnings and email-provider logs did not constitute failed test assertions.

### UI-4.1 Verification

**Ticket Library search — completed and verified:**

- Frontend API-contract and search tests for normalization, request construction, pagination/result limits, empty states, API failures, organization scope, and selection URLs.
- API E2E coverage for supported article fields, authentication and membership, role restrictions, and organization isolation.
- Combined ticket/article result-group behavior and article selection/navigation.
- Frontend TypeScript, lint, focused tests, full frontend test suite, and production build.
- Manual UI verification completed successfully.

**User search — completed and verified:**

- Implemented the OWNER/ADMIN-only server-side search contract with name/email partial matching, active-organization scoping, query validation, an eight-result cap, and minimal response fields.
- Verified API authorization, query validation, result limits, response data minimization, and cross-organization isolation.
- Implemented role-aware user-result visibility, loading/empty/error states, and selection/navigation through the existing `/users` page.
- Verified keyboard navigation, selected-member focus/highlight behavior, query preservation, and integration with ticket and Ticket Library search.
- Focused API and frontend tests, full frontend tests, full API E2E regression, TypeScript, lint, production builds, and manual UI verification passed.

**Definition of done:** Each enabled result type uses an existing or explicitly implemented server-side contract; all queries are scoped to the active organization and authorized role; no placeholder or unregistered links are exposed; each group has clear loading, error, and empty behavior; keyboard and responsive interaction remain accessible; automated checks and production builds pass; and manual verification is complete.

**Outcome:** UI-4.1 is complete and verified. Global search supports Tickets, Ticket Library articles, and authorized organization-member search while preserving the established route, authorization, and organization-isolation boundaries.

## UI-5 — Notification Center

**COMPLETE AND VERIFIED**

The notification center now supports persistent notification history and read state, reuses the existing event and realtime infrastructure, and scopes notifications to the intended recipient and active organization.

### Implemented

- Audited the notification schema, event delivery, recipient scoping, and API capabilities before implementation.
- Added persistent notification storage and APIs for retrieving notifications, tracking unread state, and marking notifications as read.
- Connected the top-bar notification bell to a notification dropdown/inbox.
- Displayed notification titles, messages, creation times, unread indicators, and supported related-entity navigation links.
- Implemented an accurate unread count and read/unread presentation.
- Reused existing event delivery and realtime infrastructure to keep notification state updated.
- Added loading, error, empty, and realtime-update states.
- Enforced recipient and organization isolation so users cannot access notifications intended for another user or organization.

### Verification

- **API TypeScript check, lint, and build:** Passed.
- **API E2E tests:** 40 test files passed; 557 tests passed.
- **Web TypeScript check, lint, and production build:** Passed.
- **Web tests:** 23 test files passed; 277 tests passed.
- **Recipient and organization isolation:** Verified through API and realtime tests, including notification routing and cross-organization isolation.
- **Read-state and realtime behavior:** Covered by notification integration and realtime tests.
- **Manual verification:** Completed. The notification UI and expected interactions were verified to work as expected.

**Verification note:** The API E2E logs contain non-blocking Resend `422` errors because some test fixtures use `example.com` email addresses. The test suites nevertheless passed. Test email configuration can be cleaned up separately.

**Outcome:** UI-5 is complete. No outstanding notification-center implementation or verification tasks remain for this milestone.

## UI-6 — Settings and Profile Navigation

**COMPLETE AND VERIFIED**

The Settings landing page now provides navigation to supported configuration pages, and the top-right Settings action navigates to `/settings`. The existing SLA Policies functionality remains intact. The blueprint and current implementation were audited to distinguish working configuration from features that still require implementation.

### Implemented

- Verified and retained the top-right Settings link to `/settings`.
- Preserved the existing SLA Policies page and its functionality, including first-response and resolution targets, policy lifecycle controls, and role-based management permissions.
- Expanded the Settings landing page with cards for supported pages:
  - **SLA Policies** — existing organization-scoped SLA configuration.
  - **Users & Memberships** — existing organization membership and role management.
  - **Products** — existing organization-scoped product catalog management.
  - **Your Profile** — personal account profile management.
- Added a **Planned** configuration section for unsupported settings instead of linking to empty pages:
  - **Organization Profile** — organization details exist in the data model, but a dedicated update API and editing page remain unimplemented.
  - **Team Management** — team models exist, but dedicated team-management UI and management APIs remain unimplemented.
  - **Notification Preferences** — the notification center exists, but persistent per-user notification preferences and their settings API remain unimplemented.
- Implemented the `/profile` route using the authenticated user's Better Auth session and supported user fields.
- Added profile editing for the user's display name and optional profile-image URL.
- Displayed the user's email address, email verification status, and account creation date as read-only account details.
- Added Profile navigation to the account menu while retaining the existing theme toggle and sign-out behavior.
- Updated the profile and account-menu avatars to display a valid saved profile image, falling back to user initials when the image URL is empty.
- Retained server-side `OWNER`/`ADMIN` authorization for administrative membership, product, and SLA policy mutations. Profile updates use the authenticated user's own Better Auth account rather than an arbitrary user ID.

### Verification

- **Focused UI-6 tests:** 5 tests passed.
- **Frontend tests:** 24 test files passed; 282 tests passed.
- **API authorization/regression tests:** 3 E2E test files passed; 98 tests passed across SLA policy, member directory, and product APIs.
- **Frontend TypeScript check:** Passed.
- **Frontend lint:** Passed with no reported errors.
- **Production build:** Passed; the `/profile` route was generated successfully.
- **Navigation and route coverage:** Verified the Settings action, Settings and SLA Policies routes, Profile route, and account-menu Profile link.
- **SLA policy regression:** Existing SLA policy tests passed, including role restrictions and organization isolation.
- **Profile-image behavior:** Manually verified that a valid saved URL displays an image and an empty URL falls back to initials.
- **Manual walkthrough:** Completed for Settings and Profile.

**Outcome:** UI-6 is complete. Unsupported organization profile editing, team management, and notification preferences remain explicitly planned rather than being exposed as nonfunctional settings pages.

## UI-7 — UI Consistency, Accessibility, and Dead-action Sweep

**COMPLETE AND VERIFIED**

Audited and refined navigation, shared interaction patterns, accessibility behavior, and ticket-detail workflows. Reused the existing API contracts and TanStack Query/API-client paths wherever possible; no duplicate operational data model was introduced.

### Implemented

- Audited desktop sidebar, mobile navigation, top-bar actions, account menu, global search entry points, and ticket-detail panels for dead controls and missing routes.
- Kept desktop and mobile navigation aligned through the shared navigation definition and standardized **Ticket Library** as the navigation label.
- Removed the nonfunctional desktop sidebar collapse control rather than exposing an action that did not work.
- Refined the mobile navigation drawer with accessible labeling and state attributes, Escape-key dismissal, focus trapping, and focus restoration to the trigger.
- Refined account-menu interaction behavior, including Escape/outside-click dismissal and visible keyboard focus, while retaining working profile, theme, and sign-out actions.
- Added/standardized reusable page and compact variants for shared loading, error, and empty states so embedded workflow panels use appropriate feedback presentation.
- Completed the ticket-detail layout with workflow, relationships, attachments, SLA context, and breach-history panels.
- Reused the relationship API client and query hook for ticket relationship loading; retained supported relationship creation/deletion operations and organization-scoped backend authorization.
- Refined attachments to support upload, download, and permission-aware deletion with loading, error, empty, and success feedback.
- Retained ticket status, assignment/team assignment, comments, activity history/pagination, approvals, and SLA information in the ticket-detail workflows.
- Added UI consistency/source-contract tests and relationship API-client contract tests; added ticket-relations E2E coverage.
- Resolved a React duplicate-key console warning by giving the ticket-detail sibling panels distinct keys (`workflow-${ticket.id}`, `relations-${ticket.id}`, and `attachments-${ticket.id}`). Each panel still remounts when the ticket ID changes, but sibling keys are now unique.

### Verification — PASSED (user-confirmed)

```text
Frontend Vitest suite             26 files, 292/292 tests passed
UI-7 consistency tests            7/7 passed
Ticket relationship API tests     3/3 passed
Frontend TypeScript check         PASS — npx tsc --noEmit
Frontend lint                     PASS — npm run lint
API E2E regression                41 files, 564/564 tests passed
Ticket relationship E2E           7/7 tests passed
Manual UI verification            PASS — user-confirmed
```

The frontend production build passed at the prior UI-7 verification checkpoint. The final duplicate-key correction was frontend-only; after that correction, the user reran and confirmed the complete frontend test suite, TypeScript check, lint, and manual UI verification. The final key correction did not require an API behavior change.

The full API E2E run emitted non-blocking Resend HTTP 422 logs because existing test fixtures use `example.com` recipients, plus Vite configuration warnings. All 564 API test assertions passed; these messages did not produce test failures.

**Outcome:** UI-7 is complete and verified. The known deferred follow-ons—department domain/API design, organization profile editing, dedicated team-management UI/APIs, and persisted notification preferences—remain separately planned and were not represented as working UI-7 functionality.

## Implementation Order

The original milestone sequence has been completed through UI-7:

1. UI-1 — Ticket creation / raising tickets — **COMPLETE AND VERIFIED**.
2. UI-2 — Core navigation, Approvals inbox, Ticket Library, Users, Products, and department audit — **CORE UI COMPLETE AND VERIFIED**; Departments remain a deferred follow-on pending domain and authorization design.
3. UI-3 — Live operational Dashboard — **COMPLETE AND VERIFIED**.
4. UI-4 — Functional global ticket search — **COMPLETE AND VERIFIED**.
5. UI-4.1 — Ticket Library and authorized organization-user search expansion — **COMPLETE AND VERIFIED**.
6. UI-5 — Notification center — **COMPLETE AND VERIFIED**.
7. UI-6 — Settings and Profile navigation — **COMPLETE AND VERIFIED**; organization profile editing, dedicated team management, and notification preferences remain planned.
8. UI-7 — UI consistency, accessibility, and dead-action sweep — **COMPLETE AND VERIFIED**.

**Next planned milestone:** Phase 8 — Production Hardening, as outlined below. Deferred domain/settings items should be prioritized explicitly and designed before implementation; they are not implicitly included in the completed UI milestones.

Do not begin a milestone by assuming an endpoint or persisted model exists. Inspect the blueprint, current route tree, schema, API contract, and permissions first. Reuse verified services, preserve organization isolation, and document unsupported functionality explicitly.

**Definition of complete:** the user-facing workflow is reachable, uses real domain/API data, respects authorization and organization boundaries, supports loading/error/empty states, has appropriate automated coverage, passes the required quality gates, and has been manually verified in the browser.

# Phase 8 --- Production Hardening

**PLANNED — AFTER OPERATIONAL UI COMPLETION**

- Unit and integration test coverage gaps
- Full E2E regression and CI enforcement
- Security audit and authorization review
- Performance testing
- Database/index optimization
- Structured logging and monitoring
- Backups and restore testing
- CI/CD pipeline
- Production Docker and deployment validation

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
Phase 7-D Employee Dashboard          COMPLETE AND VERIFIED
Phase 7-E SLA Reports UI              COMPLETE AND VERIFIED
Phase 7-F TAT Reports                 COMPLETE AND VERIFIED
Phase 7-G Usage Reports                 COMPLETE AND VERIFIED
Phase 7-H Ticket Library Reports       COMPLETE AND VERIFIED
Phase 7-I Exports                       COMPLETE AND VERIFIED
Phase 7-J Full Analytics Verification   COMPLETE AND VERIFIED
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

Phase 7 — Analytics subsequently completed and is now COMPLETE AND VERIFIED.

# Next Development Direction

Phase 4 is complete.
Phase 5-A through Phase 5-F are **COMPLETE AND VERIFIED**.
Phase 6-A through Phase 6-F are **COMPLETE AND VERIFIED**.
Phase 7-A through 7-J are **COMPLETE AND VERIFIED**, including Usage Reports,
Ticket Library Reports, Exports, and Full Analytics Verification.

Product UI Completion milestones UI-1 through UI-7 are **COMPLETE AND VERIFIED**.
The desktop and mobile navigation use the **Ticket Library** label, and Tasks
remains removed. Preserve these decisions across future changes.

The next planned milestone is **Phase 8 — Production Hardening**, covering
regression/CI enforcement, security and authorization review, performance,
database/index optimization, observability, backup/restore validation, CI/CD,
and production deployment validation. Departments, organization profile editing,
dedicated team management, and notification preferences remain deferred follow-ons
that require explicit domain/contract design and prioritization.
