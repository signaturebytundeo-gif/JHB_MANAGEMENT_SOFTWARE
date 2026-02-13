# Domain Pitfalls

**Domain:** Food Manufacturing Operations Management
**Researched:** 2026-02-13
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Inventory Race Conditions

**What goes wrong:** Two users simultaneously allocate the same inventory — overselling, negative stock, or phantom inventory. Particularly dangerous with multi-location operations.

**Why it happens:** Developers use read-then-write patterns without proper transaction isolation. Check stock level, confirm sufficient, then deduct — but between check and deduct, another process takes the same units.

**Prevention:**
- Use `prisma.$transaction()` with serializable isolation for all inventory mutations
- Implement optimistic locking with version counters on stock level records
- Add database CHECK constraint: `quantity >= 0` on stock levels
- Queue concurrent inventory operations for the same SKU/location
- Never trust client-side quantity validation alone

**Warning signs:** Negative inventory values, customer complaints about "in stock" items being unavailable, inventory counts not matching system.

**Phase to address:** Phase 1 (Foundation) — database constraints. Phase 2 (Inventory) — transaction patterns.

---

### Pitfall 2: FIFO Enforcement Breaks Across Locations

**What goes wrong:** FIFO works within a single location but fails when inventory is transferred between locations or when co-packer batches arrive. System allocates newer local batches instead of older transferred ones.

**Why it happens:** FIFO logic only considers `createdAt` at the current location, not the original batch production date. Transferred inventory gets a new "received" timestamp, losing FIFO ordering.

**Prevention:**
- Track `originalProductionDate` separately from `receivedAtLocationDate`
- FIFO allocation always uses `originalProductionDate` regardless of transfers
- When splitting lots across locations, maintain batch genealogy (parent-child)
- Create FIFO allocation tests covering: same-location, transferred stock, co-packer receipts, mixed scenarios

**Warning signs:** Old product sitting in one location while newer product ships from another. Expiration-date complaints from customers.

**Phase to address:** Phase 2 (Inventory) — core FIFO logic must handle multi-location from day one.

---

### Pitfall 3: Batch Traceability Gaps

**What goes wrong:** FDA requires forward and backward traceability within 24 hours during a recall. System tracks batches but gaps exist: raw materials not linked to batches, co-packer lot numbers not mapped, lot splits/merges not recorded.

**Why it happens:** Traceability seems simple (batch → product → customer) but the full chain is: supplier lot → raw material receipt → batch ingredients → production batch → finished goods lot → inventory movements → order items → customer shipments. Missing any link breaks the chain.

**Prevention:**
- Design traceability as a first-class concern in the data model, not an afterthought
- Every `InventoryMovement` must reference its source (batchId, orderId, transferId)
- Link raw material lots to batches via `BatchIngredient` with supplier lot numbers
- Co-packer batches must map: internal lot ↔ co-packer lot number
- Build a "mock recall" query that traces forward (batch → all customers) and backward (customer → all ingredients)
- Batch records immutable — never deletable, retained 2+ years

**Warning signs:** Can't answer "which customers received batch 021326?" in under an hour. Co-packer lot numbers stored in notes fields instead of structured data.

**Phase to address:** Phase 1 (Data Model) — traceability relationships must be in the schema from the start. Retrofitting is extremely painful.

---

### Pitfall 4: Financial Approval Bypass

**What goes wrong:** Approval workflows enforced in UI but not in API/service layer. Users or integrations bypass approval by calling APIs directly. Status changes happen without corresponding approval records.

**Why it happens:** Developers implement approval checks in frontend forms but not in backend services. Or implement a state machine but allow "admin override" that bypasses it entirely.

**Prevention:**
- Implement state machine at service layer — UI calls services, never DB directly
- Approval thresholds in configuration, not hardcoded
- Separate approval recording from state changes (immutable approval entries)
- API endpoints validate approval state, not just UI
- No "admin override" that bypasses approvals — require dual authorization instead
- Audit log all approval attempts (successful and denied)

**Warning signs:** Transactions marked "approved" with no approver records. Same user as creator and approver. Status changes without approval trail.

**Phase to address:** Phase 3 (Financial) — before any financial operations go live. But state machine architecture should be designed in Phase 1.

---

## Moderate Pitfalls

### Pitfall 5: Multi-Channel Pricing Spaghetti

**What goes wrong:** Simple price lookup becomes tangled when wholesale cash differs from Net 30, volume discounts apply differently per channel, and promotional pricing overlaps. Each requirement added as "one more IF statement."

**Prevention:**
- Design pricing as a composable rule system from the start:
  1. Base price (by SKU + channel)
  2. Customer-specific override (if exists)
  3. Volume tier adjustment
  4. Payment term adjustment
  5. Promotional discount (time-bound)
- Store pricing calculations with breakdown, not just final price
- Never allow manual price overrides without reason codes
- Test with matrix of all channel + payment term + volume combinations

**Phase to address:** Phase 2-3 (Order Management) — before multi-channel sales go live.

---

### Pitfall 6: Subscription Edge Cases

**What goes wrong:** Subscription handles happy path but fails on: pausing mid-cycle, cancellation with 30-day notice, prorating quantity changes, failed payments with grace period, loyalty rewards during pause.

**Prevention:**
- Model subscriptions as state machines: active, paused, pending_cancellation, cancelled, payment_failed, grace_period
- Store subscription history as events (created, paused, resumed, cancelled, etc.)
- Implement cancellation policy as configuration (notice_period_days: 30)
- Handle pausing explicitly with pause_start_date, pause_end_date
- Payment failures trigger grace period with retry schedule (day 3, 7, 14, 21, then pause)
- Loyalty rewards have earned_date and expiration_date, independent of subscription state

**Phase to address:** Phase 4 (Subscription Management) — but state machine patterns should be consistent with earlier phases.

---

### Pitfall 7: Co-Packer Integration as Afterthought

**What goes wrong:** System built assuming all production is internal, then co-packer support bolted on. Co-packer lot numbers don't integrate, QC workflows differ, traceability has manual gaps.

**Prevention:**
- Design production module with pluggable sources from the start (in-house, co-packer)
- Co-packer batches store: internal batch code + their lot number + receiving date
- QC workflow supports both: internal testing (data entry) and external COA (document upload + approval)
- Co-packer partner list configurable in settings (add without code changes)
- Traceability queries must traverse co-packer relationships

**Phase to address:** Phase 2 (Production) — co-packer architecture designed even if not all features built immediately.

---

### Pitfall 8: Soft Deletes Done Wrong

**What goes wrong:** Batch records must be retained 2+ years (FDA). Soft deletes (deleted_at column) added but queries don't filter deleted records, unique constraints break, reports include deleted data.

**Prevention:**
- For truly immutable records (batches, financial transactions), don't soft delete — use status (ACTIVE, ARCHIVED, INACTIVE)
- For deletable records, use database views that filter deleted rows
- Unique constraints use partial indexes: `WHERE deleted_at IS NULL`
- Document retention policy: what can be deleted vs. only inactivated
- Batch records: never deletable, period. Mark as ARCHIVED after retention period.

**Phase to address:** Phase 1 (Foundation) — deletion strategy must be part of initial schema design.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation / Data Model | Traceability gaps, missing audit trail | Design all entity relationships with traceability in mind |
| Production / Batch Tracking | Co-packer integration afterthought | Support in-house + co-packer from day one |
| Inventory / FIFO | Race conditions, FIFO breaking across locations | Database constraints + transaction isolation + multi-location FIFO tests |
| Order Management | Pricing complexity, overselling | Composable pricing engine + inventory transactions |
| Financial / Approvals | Approval bypass via API | Service-layer enforcement, not UI-only |
| Subscriptions | Edge case explosion | State machine with explicit states and transitions |
| Reporting | Performance degradation at scale | Indexes on all foreign keys, pre-computed aggregates for dashboards |

## "Looks Done But Isn't" Checklist

- [ ] Inventory tracking: Verify CHECK constraint prevents negative stock at DB level
- [ ] FIFO: Test with transferred inventory, co-packer batches, and mixed scenarios
- [ ] Batch traceability: Run mock recall — trace forward AND backward in under 1 hour
- [ ] Financial approvals: Attempt bypass via API — verify service layer blocks it
- [ ] Multi-channel pricing: Test all channel + payment term + volume combinations
- [ ] Subscription cancellation: Verify 30-day notice period handles edge cases
- [ ] Soft deletes: Verify all queries filter deleted records by default
- [ ] Concurrency: Test simultaneous inventory operations for same SKU

---
*Pitfalls research for: JHB Command Center*
*Researched: 2026-02-13*
