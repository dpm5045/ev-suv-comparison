# Google Sheets Sync — Design Spec

**Date**: 2026-03-19
**Purpose**: One-way push of the `details` array from `lib/ev-data.json` to a Google Sheet as a spreadsheet backup (mirror of the Comparison tab's full dataset).

## Overview

A standalone TypeScript script syncs the full vehicle trim dataset to Google Sheets. A new `/sync-sheet` project skill wraps this script, and existing data-mutation skills invoke it as a final step after changes.

## Google Cloud Setup (one-time, manual)

1. Create a Google Cloud project (or use existing)
2. Enable the Google Sheets API (free tier — 300 req/min, no cost)
3. Create a service account and download the JSON key file
4. Create a Google Sheet and share it (Editor) with the service account email
5. Store the key file as `google-credentials.json` in repo root (gitignored)
6. Store the sheet ID in `.env.local` as `GOOGLE_SHEET_ID`

No billing account is required for Sheets API access.

## Script: `scripts/sync-sheet.ts`

A single TypeScript file that:

1. Reads `lib/ev-data.json` and extracts the `details` array
2. Authenticates with the Google Sheets API using the service account key from `google-credentials.json`
3. Clears the target sheet entirely
4. Writes a header row (all `DetailRow` field names) followed by one row per trim (~140 rows, ~35 columns)
5. Logs success (row count) or failure to stdout

Key details:
- Uses `googleapis` npm package (official Google API client)
- Reads credentials from `google-credentials.json` in repo root
- Reads sheet ID from `GOOGLE_SHEET_ID` env var (from `.env.local`)
- Target sheet/tab name: `"Details"`
- Values written as-is: numbers stay numbers, nulls become empty cells, strings stay strings
- Uses a single `values.update` call with the full range (2 API calls total: one clear, one write)
- Runnable standalone: `npx tsx scripts/sync-sheet.ts`
- Exits with non-zero code on failure
- **Graceful no-op**: If `google-credentials.json` or `GOOGLE_SHEET_ID` is missing, the script prints an informational message (e.g., "Google Sheets sync skipped — credentials not configured") and exits with code 0. This ensures data-mutation skills work fine without Google Sheets set up.

## Skill: `/sync-sheet`

New file: `.claude/commands/sync-sheet.md`

A simple skill that:

1. Runs `npx tsx scripts/sync-sheet.ts`
2. Reports success (row count written) or surfaces errors
3. No arguments needed — always syncs the full `details` array

## Integration with Existing Skills

These 6 skills get a new final step — "Run `/sync-sheet` to push updated data to Google Sheets":

- `refresh.md`
- `add-vehicle.md`
- `add-field.md`
- `update-pricing.md`
- `spot-check.md`
- `scan-watchlist.md` (can add skeleton detail entries and update counts)

**Excluded**: `validate.md` — read-only, never modifies data.

The sync step runs after all data modifications and validation are complete. If the sync fails, it warns the user but does not roll back data changes — `lib/ev-data.json` remains the source of truth.

## Data Format

- **Rows**: One per trim in `DATA.details` (~140 currently)
- **Columns**: One per `DetailRow` field (~35 currently), using field names as headers
- **Sync strategy**: Full clear-and-rewrite on each sync (not incremental)
- **Scope**: Only the `details` array is synced. Other arrays (`preowned`, `glossary`, `assumptions`, `count_data`, `count_totals`) are intentionally excluded — this is a mirror of the Comparison tab only.

## Git / Security

- `google-credentials.json` → added to `.gitignore` (never committed)
- `GOOGLE_SHEET_ID` → stored in `.env.local` (already gitignored)
- `googleapis` → added as a dev dependency (local-only use — never runs in production/Vercel)

## Dependencies

- `googleapis` (npm, dev dependency — local-only use)
- `tsx` (already available via npx for running .ts scripts)

## Answers to Design Questions

- **Why not a project skill?** A project skill (`.claude/commands/sync-sheet.md`) IS being created as the invocation wrapper. The heavy lifting lives in a proper TypeScript script for testability and standalone use.
- **Why devDependency?** This script only runs locally by the developer or Claude. It never runs in production (Vercel). If this changes, move to a regular dependency.
- **Why not sync other arrays?** The user's goal is a spreadsheet backup of the "Full Monty" comparison data. Other arrays serve different purposes and don't need a sheet mirror.
