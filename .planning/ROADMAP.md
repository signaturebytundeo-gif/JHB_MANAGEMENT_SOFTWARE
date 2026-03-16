# Roadmap: JHB Command Center

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-03-12) — [Archive](milestones/v1.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-03-12</summary>

- [x] Phase 1: Foundation & Authentication (4/4 plans) — completed 2026-02-14
- [x] Phase 2: Production & Quality Control (4/4 plans) — completed 2026-02-17
- [x] Phase 3: Inventory Management (4/4 plans) — completed 2026-03-06
- [x] Phase 4: Order Management (4/4 plans) — completed 2026-03-11
- [x] Phase 5: Sales Channels & CRM (4/4 plans) — completed 2026-03-12
- [x] Phase 6: Financial Management (3/3 plans) — completed 2026-03-12
- [x] Phase 7: Dashboards & Reporting (3/3 plans) — completed 2026-03-12
- [x] Phase 8: Document Management (3/3 plans) — completed 2026-03-12

</details>

### Phase 13: Fulfillment Tracking

**Goal:** Operators can record a UPS tracking number when shipping an order and it persists on the order record
**Depends on:** Phase 12 (template exists so shipped email can be wired in next phase)
**Plans:** 1 plan

Plans:
- [ ] 13-01-PLAN.md — Make tracking number optional in FulfillmentModal + verify end-to-end

### Phase 14: Notification Triggers

**Goal:** Customers automatically receive the right branded email at each order lifecycle milestone
**Depends on:** Phase 12 (templates), Phase 13 (tracking number on record)
**Plans:** 2 plans

Plans:
- [ ] 14-01-PLAN.md — Create delivery email template, send function, schema field, and Slack notification
- [ ] 14-02-PLAN.md — Wire delivery email into updateOrderStatus + verify all three triggers end-to-end

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 4/4 | Complete | 2026-02-14 |
| 2. Production & Quality Control | v1.0 | 4/4 | Complete | 2026-02-17 |
| 3. Inventory Management | v1.0 | 4/4 | Complete | 2026-03-06 |
| 4. Order Management | v1.0 | 4/4 | Complete | 2026-03-11 |
| 5. Sales Channels & CRM | v1.0 | 4/4 | Complete | 2026-03-12 |
| 6. Financial Management | v1.0 | 3/3 | Complete | 2026-03-12 |
| 7. Dashboards & Reporting | v1.0 | 3/3 | Complete | 2026-03-12 |
| 8. Document Management | v1.0 | 3/3 | Complete | 2026-03-12 |
| 13. Fulfillment Tracking | v1.2 | 0/1 | Planning | — |
| 14. Notification Triggers | v1.2 | 0/2 | Planning | — |
