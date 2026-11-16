Refresh the backup Claude Sheet ("ThreeRowEV Data") from `lib/ev-data.json` and the provenance file.

Sheet: https://claude.ai/artifact/Ck7d1nr1WvSHca3FjQXuZn — one tab per table: Details, Pre-owned, Model counts, Glossary, Sources, CarGurus baselines.

The data in git is the source of truth; this Sheet is a browsable backup. It needs the Claude Docs connector (Sheets type), so it runs in a local or claude.ai session, not in the GitHub Actions agent. If the connector isn't available, say so and stop.

## Steps

1. Export the tables to CSV in your scratchpad:

   ```bash
   node scripts/export-sheet.mjs <scratchpad>/sheet-export
   ```

   It prints the row and column counts per file. Text that a spreadsheet would misread (numbers, dates, formulas) is already escaped with a leading apostrophe.

2. Read the Sheets guide (`topic.sheets`, `topic.sheets-import`) and `readSheets` the Sheet.

3. For each CSV, one at a time:
   1. Upload it to the Sheet's asset store (Artifact tool, `asset: true`, the Sheet's URL).
   2. Import it with `importFile`, an `opId` such as `sync-details-YYYY-MM-DD`, and `sheetName` set to the tab's name. The name is taken, so the new tab arrives under another name (the answer's `name`).
   3. In one `applyEdits`: `deleteSheet` the old tab, `renameSheet` the new one to the old name, give row 1 a teal 100 fill, freeze row 1 (and column A on Details), and on Details declare the table (`setCellTable`, header row 1).
   4. If the answer's `fileDeleted` is false, delete the upload.

4. Spot-check one cell per tab against the JSON (a price on Details, a date on Sources) and report the row counts and the data's `last_updated`.
