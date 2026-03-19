# Google Sheets Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the full `details` array from `lib/ev-data.json` to a Google Sheet on demand and after every data-mutation skill.

**Architecture:** A standalone TypeScript script (`scripts/sync-sheet.ts`) reads the JSON, authenticates via service account, and writes all rows to a Google Sheet. A `/sync-sheet` skill wraps the script. Six existing data-mutation skills get a final sync step.

**Tech Stack:** TypeScript, `googleapis` npm package, Google Sheets API v4, service account auth.

**Spec:** `docs/superpowers/specs/2026-03-19-google-sheets-sync-design.md`

---

### Task 1: Add `googleapis` dependency and gitignore entry

**Files:**
- Modify: `package.json` (add dev dependency)
- Modify: `.gitignore` (add credentials file pattern)

- [ ] **Step 1: Install googleapis as dev dependency**

Run: `npm install --save-dev googleapis dotenv`

- [ ] **Step 2: Add google-credentials.json to .gitignore**

Add to `.gitignore`:
```
# Google Sheets sync credentials
google-credentials.json
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add googleapis and dotenv dependencies, gitignore credentials"
```

---

### Task 2: Create `scripts/sync-sheet.ts`

**Files:**
- Create: `scripts/sync-sheet.ts`

- [ ] **Step 1: Create the sync script**

Create `scripts/sync-sheet.ts` with the following behavior:

```typescript
import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env.local (Next.js loads this automatically, but standalone scripts do not)
config({ path: resolve(__dirname, '..', '.env.local') });

const CREDENTIALS_PATH = resolve(__dirname, '..', 'google-credentials.json');
const DATA_PATH = resolve(__dirname, '..', 'lib', 'ev-data.json');
const SHEET_TAB = 'Details';

async function main() {
  // 1. Graceful no-op if credentials or sheet ID missing
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!existsSync(CREDENTIALS_PATH)) {
    console.log('Google Sheets sync skipped — google-credentials.json not found');
    process.exit(0);
  }
  if (!sheetId) {
    console.log('Google Sheets sync skipped — GOOGLE_SHEET_ID not set');
    process.exit(0);
  }

  // 2. Read ev-data.json and extract details array
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const details: Record<string, unknown>[] = raw.details;
  if (!details || details.length === 0) {
    console.error('Error: No details found in ev-data.json');
    process.exit(1);
  }

  // 3. Build header row from keys of first entry
  const headers = Object.keys(details[0]);

  // 4. Build data rows (values in same order as headers)
  const rows = details.map(row =>
    headers.map(key => {
      const val = row[key];
      return val === null || val === undefined ? '' : val;
    })
  );

  // 5. Authenticate with service account
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 6. Clear the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${SHEET_TAB}`,
  });

  // 7. Write header + data rows in one call
  const allRows = [headers, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET_TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: allRows },
  });

  console.log(`Google Sheets sync complete — ${details.length} rows written to "${SHEET_TAB}" tab`);
}

main().catch(err => {
  console.error('Google Sheets sync failed:', err.message);
  process.exit(1);
});
```

Key points for the implementer:
- `dotenv` loads `.env.local` since Next.js auto-loading only works during `next dev`/`next build`, not standalone `npx tsx` scripts
- `__dirname` works correctly with `tsx` execution
- `valueInputOption: 'RAW'` ensures numbers stay as numbers in the sheet
- The `range` for clear uses just the tab name (clears entire tab)
- The `range` for update starts at `A1` (header row)
- Null/undefined values become empty strings (empty cells in the sheet)

- [ ] **Step 2: Verify the script runs (graceful no-op)**

Run: `npx tsx scripts/sync-sheet.ts`

Expected output (since no credentials exist yet):
```
Google Sheets sync skipped — google-credentials.json not found
```

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-sheet.ts
git commit -m "feat: add Google Sheets sync script"
```

---

### Task 3: Create `/sync-sheet` skill

**Files:**
- Create: `.claude/commands/sync-sheet.md`

- [ ] **Step 1: Create the skill file**

Create `.claude/commands/sync-sheet.md`:

```markdown
Sync the full vehicle details dataset to the Google Sheets backup.

## Steps

1. Run the sync script:

   ```bash
   npx tsx scripts/sync-sheet.ts
   ```

2. Report the result to the user:
   - On success: confirm row count written
   - On "skipped" message: inform user that credentials are not configured and link to setup instructions in `docs/superpowers/specs/2026-03-19-google-sheets-sync-design.md`
   - On failure: surface the error message
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/sync-sheet.md
git commit -m "feat: add /sync-sheet skill"
```

---

### Task 4: Integrate sync step into 6 existing skills

**Files:**
- Modify: `.claude/commands/refresh.md`
- Modify: `.claude/commands/add-vehicle.md`
- Modify: `.claude/commands/add-field.md`
- Modify: `.claude/commands/update-pricing.md`
- Modify: `.claude/commands/spot-check.md`
- Modify: `.claude/commands/scan-watchlist.md`

- [ ] **Step 1: Add sync step to `refresh.md`**

`refresh.md` already has a "Post-Phase Wrap-Up" section. Add a new step at the end of that section's numbered list (after the commit step):

```markdown
6. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 2: Add sync step to `add-vehicle.md`**

Insert before the Guardrails section:

```markdown
## Post-Add

After the new vehicle is added and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 3: Add sync step to `add-field.md`**

Insert before the Guardrails section:

```markdown
## Post-Add

After the new field is added and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 4: Add sync step to `update-pricing.md`**

Insert before the Important section:

```markdown
## Post-Update

After pricing changes are applied and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 5: Add sync step to `spot-check.md`**

Add after step 7:

```markdown
8. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 6: Add sync step to `scan-watchlist.md`**

`scan-watchlist.md` already has a "Post-Phase Wrap-Up" section. Add a new step at the end of that section's numbered list (after the commit step):

```markdown
4. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets. If sync fails, warn the user but do not roll back data changes.
```

- [ ] **Step 7: Commit all skill modifications**

```bash
git add .claude/commands/refresh.md .claude/commands/add-vehicle.md .claude/commands/add-field.md .claude/commands/update-pricing.md .claude/commands/spot-check.md .claude/commands/scan-watchlist.md
git commit -m "feat: add Google Sheets sync step to all data-mutation skills"
```

---

### Task 5: Manual verification with live Google Sheet

This task requires the user to have completed the Google Cloud setup from the spec (service account, credentials file, sheet shared with service account).

- [ ] **Step 1: Confirm prerequisites**

Ask the user:
- Do you have `google-credentials.json` in the repo root?
- Do you have `GOOGLE_SHEET_ID` set in `.env.local`?
- Is the Google Sheet shared with the service account email?

If not, walk through the setup steps in the spec.

- [ ] **Step 2: Run the sync script**

Run: `npx tsx scripts/sync-sheet.ts`

Expected output (row count will match the current `details` array length):
```
Google Sheets sync complete — <N> rows written to "Details" tab
```

- [ ] **Step 3: Verify the sheet**

Ask the user to open the Google Sheet and confirm:
- Header row has all ~35 field names
- ~140 data rows are present
- Numbers appear as numbers (not text)
- Null values appear as empty cells

- [ ] **Step 4: Run the `/sync-sheet` skill**

Invoke `/sync-sheet` to verify the skill wrapper works end-to-end.

- [ ] **Step 5: Final commit (if any fixes needed)**

If any adjustments were needed during verification, commit them.
