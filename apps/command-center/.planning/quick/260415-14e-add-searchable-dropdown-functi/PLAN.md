---
phase: quick-260415-14e
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/searchable-select.tsx
  - src/components/sales/SaleForm.tsx
  - src/components/production/BatchForm.tsx
  - src/components/events/QuickSaleForm.tsx
  - src/components/inventory/AddProductForm.tsx
  - src/components/inventory/TransferForm.tsx
  - src/components/inventory/StockAdjustmentForm.tsx
  - src/components/inventory/InventoryTransferForm.tsx
  - src/components/finance/StandaloneInvoiceForm.tsx
  - src/components/pricing/PriceCalculator.tsx
  - src/components/orders/OperatorOrderForm.tsx
  - src/components/sales/SaleEditModal.tsx
autonomous: false
requirements:
  - Mobile catalog dropdowns must be typeable/searchable
  - Scroll must continue to work on mobile when list exceeds viewport
  - Keyboard navigation preserved for desktop users

must_haves:
  truths:
    - "User can click a catalog dropdown, type a few characters, and see only matching items"
    - "User can scroll through all filtered (or unfiltered) items on mobile without the list collapsing"
    - "Selecting an item closes the dropdown and populates the form field exactly like the current Select"
    - "Keyboard users can arrow-navigate filtered results and press Enter to select"
    - "Empty filter state shows 'No results' instead of breaking layout"
  artifacts:
    - path: "src/components/ui/searchable-select.tsx"
      provides: "SearchableSelect component with type-to-filter + scrollable list"
      exports: ["SearchableSelect", "SearchableSelectOption"]
  key_links:
    - from: "catalog forms (SaleForm, BatchForm, etc.)"
      to: "SearchableSelect"
      via: "drop-in replacement for product/catalog <Select>"
      pattern: "import.*SearchableSelect.*from.*ui/searchable-select"
---

<objective>
Replace catalog-item `<Select>` usages with a new `SearchableSelect` component that supports:
- Type-to-filter input at the top of the open dropdown
- Full scrollable result list (mobile + desktop)
- Same controlled-value API as the existing Radix Select (value / onValueChange)

Purpose: After catalog expansion, mobile users struggle to locate products in long, scroll-only dropdowns. A search input makes large catalogs usable without breaking existing form logic.

Output: New reusable component + catalog product pickers migrated to use it.
</objective>

<context>
@src/components/ui/select.tsx
@src/components/sales/SaleForm.tsx
@src/components/production/BatchForm.tsx

<interfaces>
Existing Radix Select wrapper (src/components/ui/select.tsx) exports:
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator

Usage pattern in catalog forms:
```tsx
<Select value={productId} onValueChange={setProductId}>
  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
  <SelectContent>
    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
  </SelectContent>
</Select>
```

New component target API (drop-in compatible shape):
```tsx
<SearchableSelect
  value={productId}
  onValueChange={setProductId}
  placeholder="Select product"
  searchPlaceholder="Search catalog..."
  options={products.map(p => ({ value: p.id, label: p.name, keywords: [p.sku] }))}
  emptyMessage="No products found"
/>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build SearchableSelect component</name>
  <files>src/components/ui/searchable-select.tsx</files>
  <behavior>
    - Renders a trigger matching existing SelectTrigger styles (height h-9, border, rounded-md)
    - On open, shows sticky search <input> at top of the content panel
    - Filters options case-insensitively against label + optional keywords[]
    - Renders remaining options in a scrollable container (max-h-[60vh] sm:max-h-96, overflow-y-auto, -webkit-overflow-scrolling: touch)
    - Selecting an option calls onValueChange(value) and closes the panel
    - Arrow Up/Down moves highlight; Enter selects highlighted; Escape closes
    - When filtered list is empty, shows emptyMessage (default "No results")
    - Works inside dialogs/sheets (uses Portal, z-50, click-outside-to-close)
  </behavior>
  <action>
    Create `src/components/ui/searchable-select.tsx` as a new client component ("use client").

    Implementation approach — build on Radix Popover (not Radix Select, which does not support arbitrary input inside its content panel):
    1. If `@radix-ui/react-popover` is not in package.json, install it first: `npm install @radix-ui/react-popover`.
    2. Compose Popover.Root / Popover.Trigger / Popover.Content.
    3. Trigger renders a button styled identically to `SelectTrigger` in `src/components/ui/select.tsx` (reuse the same className string) showing the selected option's label or the placeholder, plus a ChevronDown icon from lucide-react.
    4. Inside Popover.Content, render:
       - A search `<input>` at the top (sticky top-0, bg-popover, border-b) with value tied to local `query` state, autoFocus, inputMode="search".
       - A `<div role="listbox">` with `className="max-h-[60vh] sm:max-h-96 overflow-y-auto overscroll-contain"` containing filtered options.
       - Each option as a `<button role="option">` styled like `SelectItem`, with `aria-selected` when value matches and data-highlighted when it is the keyboard-highlighted index.
       - Empty state when filtered list is zero: `<div className="px-2 py-4 text-sm text-muted-foreground text-center">{emptyMessage}</div>`.
    5. Filtering: lowercase match of `query` against `option.label` and any strings in `option.keywords`.
    6. Keyboard handler on the input: ArrowDown/ArrowUp update `highlightedIndex` (clamped), Enter selects options[highlightedIndex], Escape closes popover.
    7. On mobile (detected via `window.matchMedia('(max-width: 640px)')`), set Popover.Content `sideOffset={4}` and width to `var(--radix-popover-trigger-width)` so it pins under the trigger full-width.
    8. Export `SearchableSelect` as default named export plus `SearchableSelectOption` type: `{ value: string; label: string; keywords?: string[]; disabled?: boolean }`.
    9. Props: `value: string | undefined`, `onValueChange: (v: string) => void`, `options: SearchableSelectOption[]`, `placeholder?: string`, `searchPlaceholder?: string`, `emptyMessage?: string`, `disabled?: boolean`, `className?: string`, `id?: string`, `name?: string`.
    10. Do NOT modify `src/components/ui/select.tsx` — leave it alone for non-catalog usages (status, channel, etc.).
  </action>
  <verify>
    <automated>cd "/Users/rfmstaff/Desktop/THE VAULT/01_Projects/JHB_MANAGEMENT_SOFTWARE/apps/command-center" && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "searchable-select" || echo "OK"</automated>
  </verify>
  <done>
    File exists, typechecks, exports SearchableSelect + SearchableSelectOption, uses Radix Popover, contains search input, empty state, keyboard handlers.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Migrate catalog product pickers to SearchableSelect</name>
  <files>
    src/components/sales/SaleForm.tsx,
    src/components/production/BatchForm.tsx,
    src/components/events/QuickSaleForm.tsx,
    src/components/inventory/AddProductForm.tsx,
    src/components/inventory/TransferForm.tsx,
    src/components/inventory/StockAdjustmentForm.tsx,
    src/components/inventory/InventoryTransferForm.tsx,
    src/components/finance/StandaloneInvoiceForm.tsx,
    src/components/pricing/PriceCalculator.tsx,
    src/components/orders/OperatorOrderForm.tsx,
    src/components/sales/SaleEditModal.tsx
  </files>
  <action>
    In each file, locate the `<Select>` whose options come from the product/catalog list (typically iterating `products`, `catalog`, `items`, or `skus`). Do NOT change selects for status, channel, location, unit, or other short enums — only catalog/product selects.

    For each catalog select:
    1. Replace the `<Select>...<SelectContent>{products.map(...)}</SelectContent></Select>` block with:
       ```tsx
       <SearchableSelect
         value={<existing value>}
         onValueChange={<existing setter>}
         placeholder={<existing placeholder, e.g. "Select product">}
         searchPlaceholder="Search catalog..."
         emptyMessage="No products found"
         options={products.map(p => ({
           value: p.id,
           label: p.name,
           keywords: [p.sku, p.category].filter(Boolean) as string[],
         }))}
       />
       ```
    2. Add import: `import { SearchableSelect } from "@/components/ui/searchable-select"`.
    3. Remove now-unused `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` imports ONLY if no other select remains in the file. If other selects remain (status, channel, location), keep those imports and leave those selects untouched.
    4. Keep react-hook-form integration intact: if the Select was inside a `<Controller>` / `form.register` setup, wire SearchableSelect's value/onValueChange to the same field.controller props.

    Do not refactor form logic, validation, or styling beyond the swap.
  </action>
  <verify>
    <automated>cd "/Users/rfmstaff/Desktop/THE VAULT/01_Projects/JHB_MANAGEMENT_SOFTWARE/apps/command-center" && npx tsc --noEmit && npm run lint 2>&1 | tail -20</automated>
  </verify>
  <done>
    All 11 files compile + lint clean. Every catalog product Select replaced. Non-catalog Selects untouched. No unused imports.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Mobile + desktop manual verification</name>
  <what-built>
    SearchableSelect component and 11 catalog forms migrated to use it.
  </what-built>
  <how-to-verify>
    Desktop (Chrome DevTools, default viewport):
    1. `npm run dev` and navigate to /sales/new (SaleForm).
    2. Click the product dropdown — search input should be focused, full catalog scrollable below.
    3. Type 3 characters matching a product — list narrows live.
    4. Arrow Down twice, press Enter — item selected, dropdown closes, form field populated.
    5. Reopen, press Escape — closes without changing value.

    Mobile (DevTools device toolbar, iPhone 14 Pro or similar):
    1. Same form, tap product dropdown.
    2. Virtual keyboard should appear (search input autoFocus). Type a query — list filters.
    3. Clear query, scroll the full catalog list with touch — scrolling must work, not bounce the popover closed.
    4. Tap an item — selection works, popover closes.
    5. Rotate to landscape — popover still pinned under trigger, scroll still works.

    Other forms spot-check (mobile):
    - /production/batches/new (BatchForm)
    - /inventory/transfers/new (TransferForm)
    - /events (QuickSaleForm)

    Confirm: no regressions on status/channel/location dropdowns (still use regular Select).
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` clean
- `npm run lint` clean
- Manual: search filters, scroll works on mobile, keyboard nav works on desktop, non-catalog Selects unchanged
</verification>

<success_criteria>
- SearchableSelect component exists at src/components/ui/searchable-select.tsx
- All 11 catalog forms use SearchableSelect for product pickers
- Mobile users can type-to-filter and scroll long catalog lists
- Desktop keyboard flow preserved
- No changes to non-catalog Select usages (status, channel, location, unit)
</success_criteria>

<output>
After completion, create `.planning/quick/260415-14e-add-searchable-dropdown-functi/SUMMARY.md` noting files changed and any mobile quirks discovered during checkpoint.
</output>
