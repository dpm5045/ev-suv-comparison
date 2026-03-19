Add a new spec field to the vehicle dataset across all entries.

**Field to add:** $ARGUMENTS
(Format: `field_name` or `field_name "Description of the field"`)

## Pre-flight

1. Read `lib/data.ts` to get the current `DetailRow` interface. Verify the field does NOT already exist. If it does, abort and tell the user.

2. Parse the argument:
   - Field name must be `snake_case` (lowercase with underscores)
   - If a description was provided in quotes, use it for the glossary entry
   - If not, infer a reasonable description from the field name

3. Determine the field type based on the name/description:
   - Measurement fields (ending in `_in`, `_lbs`, `_kwh`, `_kw`, `_min`, `_sec`, `_cu_ft`, `_mi`): `number | string | null`
   - Count fields: `number | null`
   - Text/descriptive fields: `string | null`
   - Default to `number | string | null` if unclear

## Plan and Confirm

4. Present the plan to the user:
   - Field name and type
   - Which `SpecSection` in `DetailPanel.tsx` it belongs to (Performance, Drivetrain & Charging, Dimensions, Technology & Features, Cargo & Storage — or suggest a new section)
   - Display format (e.g., `typeof r.field === 'number' ? \`${r.field} unit\` : r.field`)
   - Default value for existing entries: `null`
   - Glossary entry text

5. **Wait for user approval before making any edits.**

## Apply Changes

6. **`lib/data.ts`** — Add the field to the `DetailRow` interface, grouped with similar fields.

7. **`lib/ev-data.json`** — Add the field with value `null` to EVERY entry in the `details` array. There are 138+ entries — do not miss any. Place the field consistently in each object (after related fields).

8. **`components/DetailPanel.tsx`** — Add the field to the appropriate `SpecSection`, following the existing display pattern:
   ```tsx
   ['Label', typeof r.field_name === 'number' ? `${r.field_name} unit` : r.field_name],
   ```

9. **`lib/ev-data.json` glossary** — Add a glossary entry:
   ```json
   { "field": "Field Name", "meaning": "...", "notes": "..." }
   ```

## Populate Values (Optional)

10. Ask the user: "Research and populate values for this field across all vehicles?"

11. If yes, use WebSearch and WebFetch against approved sources to find values for each vehicle/trim. Present findings in a table before applying.

12. If no, leave all values as `null` — they can be populated later via the monthly refresh pipeline or `/project:spot-check`.

## Verify

13. Run `npm run build` to verify TypeScript compilation succeeds.

14. Report: field added to N entries, M values populated (if research was done), build status.

## Post-Add

After the new field is added and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.

## Guardrails

- Never modify existing fields — this command only ADDS a new field.
- The field must be added to ALL detail entries, not just some.
- Use `null` as the default, not `""` or `0` or `"TBD"`.
- Never hardcode the number of entries — iterate over the full array.
