Validate the integrity of `lib/ev-data.json`. This is a **read-only** command — do not modify any files.

## Steps

1. Read `lib/ev-data.json` and `lib/data.ts`.

2. Run all of these checks, reporting each as ERROR (would block a deploy), WARNING (should review), or INFO:

### Required fields (ERROR if missing)
Every entry in `details` must have: `name`, `vehicle`, `year`, `trim`, `seats`, `drivetrain`, `msrp`, `otd_new`, `preowned_range`, `otd_preowned`, `range_mi`, `hp`, `battery_kwh`, `charging_type`.

### Duplicate names (WARNING)
Flag any duplicate `name` values in `details`. Some duplicates are intentional (different seat configs) — note this.

### OTD new consistency (ERROR if >$50 off, WARNING if >$1 off)
For every detail where `msrp` is a number, recalculate: `otd_new = (msrp + destination) * 1.06 + 905`. Compare against stored `otd_new`.

### OTD preowned consistency (WARNING)
For every detail with a parseable `preowned_range` (format `"$XX,XXX - $XX,XXX"`), recalculate: `otd_preowned_low = low_price * 1.06 + 905`. Compare against stored `otd_preowned`.

### Numeric range sanity (WARNING)
- `range_mi`: 150–500
- `hp`: 200–1200
- `battery_kwh`: 50–250
- `msrp`: 30,000–200,000

### Count totals consistency (ERROR)
Sum each year column (`y2021`–`y2026`) across `count_data` rows. Compare against `count_totals`. Also check `total`.

### Preowned ↔ details sync (WARNING)
Every name in the `preowned` array should have a matching entry in `details`.

### VEHICLE_CLASSES sync (WARNING)
- Every vehicle name in `VEHICLE_CLASSES` (in `lib/data.ts`) should have at least one detail entry.
- Every unique `vehicle` value in `details` should have an entry in `VEHICLE_CLASSES`.

### Data completeness (INFO)
For each detail entry, count how many of these fields are null/empty/TBD: `onboard_ac_kw`, `l2_10_100`, `l2_10_80`, `charging_type`, `frunk_cu_ft`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `hp`, `battery_kwh`, `range_mi`, `self_driving`, `car_software`, `main_display`. Flag entries with 5+ missing.

### TypeScript build (ERROR if fails)
Run `npm run build` and report whether it succeeds.

## Output format

```
=== EV Data Validation Report ===
X errors, Y warnings, Z info items

ERRORS:
- ...

WARNINGS:
- ...

INFO:
- Data completeness: N/M entries fully populated
- ...
```

If there are no errors, say: "All checks passed — data is clean."
