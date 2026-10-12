# UI-2 audit finding — Departments

The current TechTicket Prisma schema has `Organization`, `Membership`, `Team`, `TeamMember`, `Ticket`, and `Product`, but no `Department` model. The current API modules likewise do not expose a department controller or service.

The reference blueprint includes a department entity (name, code, description, manager, and active/inactive state) and lists `/departments` in its API and Next.js route maps. However, it does not fully establish whether departments are organization-scoped, how users/tickets map to them, whether departments have a hierarchy, or the exact manager/role permissions.

**Decision for UI-2:** do not create a fake department page and do not substitute Teams. Do not add `/departments` to active navigation. Track Department Management as follow-on domain/API/UI work that must define its relationships and authorization before a Prisma migration, scoped CRUD API, UI, and tests are implemented.
