---
phase: quick-260415-1d3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .env.local
  - .env.example
  - src/lib/google/places.ts
  - src/components/shipping/AddressAutocomplete.tsx
  - src/components/shipping/ShipmentForm.tsx
  - src/app/layout.tsx
autonomous: false
requirements:
  - QM-AUTOCOMPLETE-01
  - QM-AUTOCOMPLETE-02
  - QM-AUTOCOMPLETE-03
  - QM-AUTOCOMPLETE-04
  - QM-AUTOCOMPLETE-05
user_setup:
  - service: google-cloud-platform
    why: "Places API (New) for address autocomplete"
    env_vars:
      - name: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        source: "Google Cloud Console -> APIs & Services -> Credentials -> Create API key"
    dashboard_config:
      - task: "Enable 'Places API (New)' and 'Maps JavaScript API' on the project"
        location: "Google Cloud Console -> APIs & Services -> Library"
      - task: "Restrict key to HTTP referrers (localhost:3000, production domain) and to Places API + Maps JavaScript API"
        location: "Google Cloud Console -> APIs & Services -> Credentials -> [key] -> Edit"
      - task: "Confirm billing is enabled on the project ($200/mo free tier covers typical usage)"
        location: "Google Cloud Console -> Billing"

must_haves:
  truths:
    - "User typing in Address Line 1 sees a dropdown of address suggestions within ~300ms"
    - "Selecting a suggestion populates addressLine1, city, state, and zip fields"
    - "Form still works if API key is missing or Places API fails (falls back to plain input)"
    - "Suggestions are restricted to US addresses (phase scope: US-only shipping)"
    - "Mobile keyboard does not cover the suggestion list on iOS/Android"
  artifacts:
    - path: "src/lib/google/places.ts"
      provides: "Google Maps JS loader + session token + getPlaceDetails helper"
      exports: ["loadGoogleMaps", "createSessionToken", "getPlacePredictions", "getPlaceDetails"]
    - path: "src/components/shipping/AddressAutocomplete.tsx"
      provides: "Controlled autocomplete input backed by Places API with fallback"
      min_lines: 100
    - path: ".env.example"
      contains: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
  key_links:
    - from: "src/components/shipping/ShipmentForm.tsx"
      to: "src/components/shipping/AddressAutocomplete.tsx"
      via: "replaces <Input id='addressLine1' ...> with <AddressAutocomplete .../>"
      pattern: "AddressAutocomplete"
    - from: "src/components/shipping/AddressAutocomplete.tsx"
      to: "src/lib/google/places.ts"
      via: "import { loadGoogleMaps, getPlacePredictions, getPlaceDetails }"
      pattern: "from ['\"]@/lib/google/places['\"]"
---

<objective>
Add Google Places autocomplete to the shipping address form so users (especially on mobile)
can type a partial address and select a full validated address in 1-2 taps. All four shipping
fields (line 1, city, state, zip) are populated from the selected place.

Purpose: Cut shipment creation time on mobile and reduce typos that break EasyPost validation.
Output: AddressAutocomplete component wired into ShipmentForm with graceful fallback.
</objective>

<execution_context>
@/Users/rfmstaff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rfmstaff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/shipping/ShipmentForm.tsx
@src/components/ui/input.tsx
@src/components/ui/label.tsx

<interfaces>
<!-- ShipmentForm currently renders plain <Input> controls for the four address fields.
     We replace only addressLine1's input with AddressAutocomplete. City/state/zip remain
     plain inputs but are controlled-from-parent when a suggestion is selected. -->

Current field names (MUST be preserved — server action reads these):
- name="addressLine1" (required)
- name="addressLine2"
- name="city" (required)
- name="state" (Select, required) — two-letter US state code
- name="zip" (required)

defaultValue sources (keep behavior):
- websiteOrder?.shippingAddressLine1 || prefillOrder?.shippingAddress?.line1 || ''
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Places API loader + helpers + env wiring</name>
  <files>
    src/lib/google/places.ts,
    src/lib/google/places.test.ts,
    .env.example,
    .env.local
  </files>
  <behavior>
    - loadGoogleMaps() returns a cached Promise resolving to the google.maps namespace; repeated calls inject the script only once
    - loadGoogleMaps() rejects with a typed MissingApiKeyError when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is empty
    - createSessionToken() returns a new google.maps.places.AutocompleteSessionToken each call (for billing optimization)
    - getPlacePredictions({ input, sessionToken, signal }) returns [] when input.length < 3
    - getPlacePredictions restricts to componentRestrictions: { country: 'us' } and types: ['address']
    - getPlaceDetails(placeId, sessionToken) returns a normalized { line1, city, state, zip } object; state is the 2-letter short_name
    - All helpers honor an AbortSignal for debounce cancellation
  </behavior>
  <action>
    1. Create `src/lib/google/places.ts`:
       - `loadGoogleMaps()`: script-tag loader for `https://maps.googleapis.com/maps/api/js?key={KEY}&libraries=places&v=weekly&loading=async`. Use a module-level promise cache so multiple mounts share one script.
       - Export `MissingApiKeyError` class.
       - `createSessionToken()`: returns `new google.maps.places.AutocompleteSessionToken()`.
       - `getPlacePredictions({ input, sessionToken, signal })`: wraps `AutocompleteService.getPlacePredictions` in a Promise; returns `[]` for input < 3 chars. Use componentRestrictions `{ country: 'us' }`, types `['address']`. If signal.aborted, reject with AbortError.
       - `getPlaceDetails(placeId, sessionToken)`: uses `PlacesService` (needs a hidden div). Request fields: `['address_components', 'formatted_address']`. Parse address_components into `{ line1: streetNumber + ' ' + route, line2: '', city: locality || sublocality, state: administrative_area_level_1.short_name, zip: postal_code }`.
    2. Create `src/lib/google/places.test.ts` (Vitest):
       - Mock `window.google` to cover the behavior list above.
       - Cover missing-key rejection, caching, sub-3-char short-circuit, address_components parsing (incl. missing locality fallback to sublocality).
    3. Append to `.env.example`:
       ```
       # Google Places (address autocomplete on shipping forms)
       # Enable "Places API (New)" + "Maps JavaScript API", restrict to HTTP referrers.
       NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
       ```
    4. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=` stub to `.env.local` (value left blank; user fills in at checkpoint).
    Library choice: use the native Google Maps JS API directly (no wrapper like `@react-google-maps/api`) — keeps bundle small and avoids version churn.
  </action>
  <verify>
    <automated>cd apps/command-center && npm test -- src/lib/google/places.test.ts --run</automated>
  </verify>
  <done>
    All places.ts unit tests pass. `.env.example` contains the new key. `.env.local` has the stub line.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: AddressAutocomplete component + wire into ShipmentForm</name>
  <files>
    src/components/shipping/AddressAutocomplete.tsx,
    src/components/shipping/AddressAutocomplete.test.tsx,
    src/components/shipping/ShipmentForm.tsx
  </files>
  <behavior>
    - Renders an <Input> (name="addressLine1") identical to the existing one when API key missing (graceful fallback, no console error spam)
    - On input >= 3 chars, debounces 250ms then fetches predictions; shows dropdown of up to 5 items
    - Selecting a prediction calls getPlaceDetails and invokes onAddressSelect({ line1, city, state, zip })
    - Keyboard nav: ArrowDown/ArrowUp moves highlight, Enter selects, Escape closes
    - Dropdown closes on outside click and on blur (with 150ms delay so click on suggestion fires first)
    - On mobile (< 640px), dropdown uses `position: fixed` at bottom of viewport above keyboard with max-height 40vh and overflow-y auto
    - aria-autocomplete="list", aria-activedescendant, role="combobox"/"listbox"/"option" set correctly
    - In-flight requests are aborted when the user keeps typing
  </behavior>
  <action>
    1. Create `src/components/shipping/AddressAutocomplete.tsx`:
       - Props: `{ id: string; name: string; defaultValue?: string; required?: boolean; onAddressSelect: (addr: { line1: string; city: string; state: string; zip: string }) => void; className?: string }`
       - Internal state: `query`, `predictions`, `highlighted`, `open`, `loading`.
       - useEffect: call `loadGoogleMaps()` on mount; on MissingApiKeyError set `fallback=true` and skip further work.
       - Debounced fetch via `useEffect` watching `query` with a 250ms `setTimeout` + `AbortController`.
       - Session token created once per mount; recreated after a selection (Google billing guidance).
       - Tailwind: dropdown uses `absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md` on desktop, `sm:absolute fixed inset-x-2 bottom-2 sm:inset-auto sm:bottom-auto max-h-[40vh] overflow-y-auto` on mobile.
       - Input style: match existing `Input` component (reuse it for the visual).
       - Render a plain fallback `<Input name={name} defaultValue={defaultValue} required={required} />` when `fallback` is true.
    2. Create `src/components/shipping/AddressAutocomplete.test.tsx` (Vitest + RTL):
       - Renders plain input when `loadGoogleMaps` rejects with MissingApiKeyError.
       - Debounces: typing "123 Ma" fires one predictions call after 250ms, not seven.
       - Arrow keys + Enter select the highlighted prediction and call `onAddressSelect` with parsed fields.
       - Abort: typing fast cancels in-flight predictions (verify AbortController.abort called).
    3. Edit `src/components/shipping/ShipmentForm.tsx`:
       - Convert city/state/zip to controlled inputs driven by `useState` (seeded from existing defaultValue logic).
       - Replace the `addressLine1` `<Input>` with `<AddressAutocomplete id="addressLine1" name="addressLine1" required defaultValue={...same expression...} onAddressSelect={(a) => { setLine1(a.line1); setCity(a.city); setState(a.state); setZip(a.zip); }} />`.
       - Keep addressLine2 as plain input.
       - Do NOT change field `name` attributes or the server action contract.
  </action>
  <verify>
    <automated>cd apps/command-center && npm test -- src/components/shipping/AddressAutocomplete.test.tsx --run && npm run typecheck</automated>
  </verify>
  <done>
    Component tests pass. Typecheck passes. ShipmentForm compiles and field names are unchanged.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Configure API key in GCP and verify end-to-end on mobile</name>
  <what-built>
    Google Places loader, AddressAutocomplete component with fallback + mobile layout + keyboard nav,
    wired into the shipping form. Env stub present but empty.
  </what-built>
  <how-to-verify>
    1. In Google Cloud Console: enable "Places API (New)" and "Maps JavaScript API", create an API key,
       restrict to HTTP referrers `http://localhost:3000/*` + your production domain, restrict to those two APIs,
       and confirm billing is enabled.
    2. Paste the key into `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...` and restart `npm run dev`.
    3. Visit `/dashboard/shipping` -> create shipment from a website order (or blank form).
    4. In Address Line 1, type `1600 Amphi` — confirm suggestions appear within ~500ms.
    5. Select "1600 Amphitheatre Parkway, Mountain View, CA, USA" — confirm Address Line 1, City ("Mountain View"), State ("CA"), ZIP ("94043") all auto-populate.
    6. Open DevTools device mode (iPhone 14 Pro). Tap the Address Line 1 field, type `350 5th Ave`, confirm the suggestion list sits above the on-screen keyboard and is scrollable.
    7. Clear `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env.local`, restart dev server, confirm the form still submits successfully with a plain text input (fallback).
    8. Restore the key.
    9. Network tab check: rapid typing ("123 main st") should produce ~1 predictions request after you stop typing, not one per keystroke.
  </how-to-verify>
  <resume-signal>Type "approved" when all 9 checks pass, or describe failures.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> Google Places API | API key is public (NEXT_PUBLIC_), exposed in client bundle |
| Places response -> ShipmentForm state | Untrusted structured address flows into form fields |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-qm1d3-01 | Information Disclosure | NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | mitigate | Restrict key in GCP to HTTP referrers (localhost + prod domain) and to Places API + Maps JS API only. Enforced at checkpoint. |
| T-qm1d3-02 | Denial of Service (billing) | Places API usage | mitigate | Session tokens reused per-session; 3-char minimum input; 250ms debounce; AbortController cancels in-flight. GCP billing alert recommended at checkpoint. |
| T-qm1d3-03 | Tampering | Place details payload | mitigate | Treat address_components as untrusted; use only short_name for state, coerce to string, and let existing server-side zod validation on the shipment action re-validate. |
| T-qm1d3-04 | Spoofing | Script injection via Maps loader | accept | Script URL is hardcoded to maps.googleapis.com; key is referrer-restricted. |
</threat_model>

<verification>
- `npm test -- src/lib/google src/components/shipping/AddressAutocomplete --run` passes
- `npm run typecheck` passes
- `npm run lint` passes
- Manual checkpoint (Task 3) verifies end-to-end including mobile layout and fallback
- No change to ShipmentForm's form field `name` attributes (server action contract preserved)
</verification>

<success_criteria>
- User can type a partial US address in shipping Address Line 1 and pick from a suggestion list
- Selecting a suggestion populates line1, city, state, zip
- Form works without an API key (plain input fallback)
- Mobile viewport renders the suggestion list usably (not hidden by keyboard)
- All unit tests and typecheck pass
</success_criteria>

<output>
After completion, create `.planning/quick/260415-1d3-implement-google-maps-places-a/SUMMARY.md`
with files touched, API key setup steps performed, and any deviations from the plan.
</output>
