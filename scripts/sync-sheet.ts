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
