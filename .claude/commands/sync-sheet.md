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
