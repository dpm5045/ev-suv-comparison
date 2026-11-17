# Availability review (WP-E migration, 2026-11)

Every configuration's proposed availability. **No row is marked "sold new" automatically.** Rows marked `needs_review` stay out of the New results until the owner approves a resolution. A **suggestion** is given where the evidence supports one: a 2025+ model year with a sourced current MSRP suggests `new`; an older model year with a stored price suggests `used_only` (its price is kept as `historical`).

To approve: confirm or change the suggestions, and the resolutions are written to `docs/migrations/2026-11-availability-resolutions.json` and applied with `--resolve`.

## Kia EV9

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `kia-ev9-2026-gt-line` | 2026 | GT-Line | 6 | $71,900 | needs_review | current | new | — |
| `kia-ev9-2026-gt-line-plus-2nd-row-relaxation-package` | 2026 | GT-Line + 2nd Row Relaxation Package | 6 | $73,900 | needs_review | current | new | — |
| `kia-ev9-2026-land` | 2026 | Land | 6 | $68,900 | needs_review | current | new | — |
| `kia-ev9-2026-land-nightfall-edition-6-pass` | 2026 | Land Nightfall Edition (6-pass) | 6 | $70,400 | needs_review | current | new | — |
| `kia-ev9-2026-land-nightfall-edition-7-pass` | 2026 | Land Nightfall Edition (7-pass) | 7 | $70,400 | needs_review | current | new | — |
| `kia-ev9-2026-wind` | 2026 | Wind | 7 | $63,900 | needs_review | current | new | — |
| `kia-ev9-2025-gt-line` | 2025 | GT-Line | 6 | $73,900 | needs_review | current | new | — |
| `kia-ev9-2025-land` | 2025 | Land | 6 | $69,900 | needs_review | current | new | — |
| `kia-ev9-2025-wind` | 2025 | Wind | 7 | $63,900 | needs_review | current | new | — |
| `kia-ev9-2024-gt-line` | 2024 | GT-Line | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-gt-line-plus-2nd-row-vip-relaxation-package` | 2024 | GT-Line + 2nd Row VIP Relaxation Package | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-land` | 2024 | Land | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-land-plus-2nd-row-vip-relaxation-package` | 2024 | Land + 2nd Row VIP Relaxation Package | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-wind` | 2024 | Wind | 7 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-light-rwd` | 2024 | Light RWD | 7 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2024-light-long-range-rwd` | 2024 | Light Long Range RWD | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2025-light-rwd` | 2025 | Light RWD | 7 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2025-light-long-range-rwd` | 2025 | Light Long Range RWD | 6 | N/A - Not New | used_only | unknown | — | — |
| `kia-ev9-2026-light-rwd` | 2026 | Light RWD | 7 | $54,900 | needs_review | current | new | — |
| `kia-ev9-2026-light-long-range-rwd` | 2026 | Light Long Range RWD | 6 | $57,900 | needs_review | current | new | — |
| `kia-ev9-2027-light` | 2027 | Light | 7 | $54,990 | needs_review | current | new | — |
| `kia-ev9-2027-light-long-range-rwd` | 2027 | Light Long Range RWD | 6 | $57,990 | needs_review | current | new | — |
| `kia-ev9-2027-wind` | 2027 | Wind | 7 | $64,090 | needs_review | current | new | — |
| `kia-ev9-2027-land` | 2027 | Land | 6 | $69,990 | needs_review | current | new | — |
| `kia-ev9-2027-gt-line` | 2027 | GT-Line | 6 | $71,990 | needs_review | current | new | — |

## Hyundai IONIQ 9

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `hyundai-ioniq-9-2026-performance-calligraphy` | 2026 | Performance Calligraphy | 6 | $74,990 | needs_review | current | new | — |
| `hyundai-ioniq-9-2026-performance-calligraphy-design` | 2026 | Performance Calligraphy Design | 6 | $76,490 | needs_review | current | new | — |
| `hyundai-ioniq-9-2026-performance-limited` | 2026 | Performance Limited | 6 | $71,250 | needs_review | current | new | — |
| `hyundai-ioniq-9-2026-se` | 2026 | SE | 7 | $62,765 | needs_review | current | new | — |
| `hyundai-ioniq-9-2026-sel` | 2026 | SEL | 7 | $66,320 | needs_review | current | new | — |
| `hyundai-ioniq-9-2026-s-rwd` | 2026 | S RWD | 7 | $58,955 | needs_review | current | new | — |

## Volvo EX90

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `volvo-ex90-2025-twin-motor-performance-plus-6s` | 2025 | Twin Motor Performance Plus | 6 | $85,495 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-performance-plus-7s` | 2025 | Twin Motor Performance Plus | 7 | $84,995 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-performance-ultra-6s` | 2025 | Twin Motor Performance Ultra | 6 | $89,845 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-performance-ultra-7s` | 2025 | Twin Motor Performance Ultra | 7 | $89,345 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-plus-6s` | 2025 | Twin Motor Plus | 6 | $80,495 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-plus-7s` | 2025 | Twin Motor Plus | 7 | $79,995 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-ultra-6s` | 2025 | Twin Motor Ultra | 6 | $84,845 | needs_review | current | new | — |
| `volvo-ex90-2025-twin-motor-ultra-7s` | 2025 | Twin Motor Ultra | 7 | $84,345 | needs_review | current | new | — |
| `volvo-ex90-2026-single-motor-plus` | 2026 | Single Motor Plus | 7 | $76,695 | needs_review | current | new | [www.volvocars.com](https://www.volvocars.com/us/cars/ex90-electric/), 2026-11-16 |
| `volvo-ex90-2026-twin-motor-plus` | 2026 | Twin Motor Plus | 7 | $79,995 | needs_review | current | new | [www.volvocars.com](https://www.volvocars.com/us/cars/ex90-electric/), 2026-11-16 |
| `volvo-ex90-2026-twin-motor-ultra` | 2026 | Twin Motor Ultra | 7 | $84,345 | needs_review | current | new | [www.volvocars.com](https://www.volvocars.com/us/cars/ex90-electric/), 2026-11-16 |
| `volvo-ex90-2026-twin-motor-performance-plus` | 2026 | Twin Motor Performance Plus | 7 | $84,995 | needs_review | current | new | [www.volvocars.com](https://www.volvocars.com/us/cars/ex90-electric/), 2026-11-16 |
| `volvo-ex90-2026-twin-motor-performance-ultra` | 2026 | Twin Motor Performance Ultra | 7 | $89,345 | needs_review | current | new | [www.volvocars.com](https://www.volvocars.com/us/cars/ex90-electric/), 2026-11-16 |

## Rivian R1S

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `rivian-r1s-2022-launch-edition-quad-motor-large` | 2022 | Launch Edition (Quad Motor, Large) | 7 | $90,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2022-adventure-quad-motor-large` | 2022 | Adventure (Quad Motor, Large) | 7 | $84,500 | needs_review | historical | used_only | — |
| `rivian-r1s-2023-explore-dual-motor-large` | 2023 | Explore (Dual Motor, Large) | 7 | $72,500 | needs_review | historical | used_only | — |
| `rivian-r1s-2023-adventure-dual-motor-large` | 2023 | Adventure (Dual Motor, Large) | 7 | $79,800 | needs_review | historical | used_only | — |
| `rivian-r1s-2023-adventure-quad-motor-large` | 2023 | Adventure (Quad Motor, Large) | 7 | $92,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-adventure-dual-motor-standard` | 2024 | Adventure Dual-Motor Standard | 7 | $78,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-adventure-dual-motor-large` | 2024 | Adventure Dual-Motor Large | 7 | $84,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-adventure-dual-motor-max` | 2024 | Adventure Dual-Motor Max | 7 | $94,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-performance-dual-motor-large` | 2024 | Performance Dual-Motor Large | 7 | $89,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-quad-motor-large` | 2024 | Quad-Motor Large | 7 | $92,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2026-dual-large` | 2026 | Dual Large | 7 | $83,990 | needs_review | current | new | — |
| `rivian-r1s-2026-dual-max-max-battery` | 2026 | Dual Max ("Max Battery") | 7 | $90,990 | needs_review | current | new | — |
| `rivian-r1s-2026-dual-standard` | 2026 | Dual Standard | 7 | N/A - Not New | used_only | unknown | — | — |
| `rivian-r1s-2026-tri-max` | 2026 | Tri Max | 7 | $106,990 | needs_review | current | new | — |
| `rivian-r1s-2025-adventure-dual-large-dual-long` | 2025 | Adventure Dual Large ("Dual Long") | 7 | $84,700 | needs_review | current | new | — |
| `rivian-r1s-2025-adventure-dual-max` | 2025 | Adventure Dual Max | 7 | $91,700 | needs_review | current | new | — |
| `rivian-r1s-2025-adventure-dual-standard` | 2025 | Adventure Dual Standard | 7 | $77,700 | needs_review | current | new | — |
| `rivian-r1s-2025-ascend-tri-max` | 2025 | Ascend Tri Max | 7 | $107,700 | needs_review | current | new | — |
| `rivian-r1s-2025-performance-dual-large` | 2025 | Performance Dual Large | 7 | $89,700 | needs_review | current | new | — |
| `rivian-r1s-2025-performance-dual-max` | 2025 | Performance Dual Max | 7 | $96,700 | needs_review | current | new | — |
| `rivian-r1s-2024-adventure-dual-motor-standard-plus` | 2024 | Adventure Dual-Motor Standard+ | 7 | $78,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-performance-dual-motor-standard-plus` | 2024 | Performance Dual-Motor Standard+ | 7 | $83,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2024-performance-dual-motor-max` | 2024 | Performance Dual-Motor Max | 7 | $99,000 | needs_review | historical | used_only | — |
| `rivian-r1s-2027-premium-7-seat` | 2027 | Premium (7-seat) | 7 | $83,990 | needs_review | current | new | — |
| `rivian-r1s-2027-premium-6-seat` | 2027 | Premium (6-seat) | 6 | $83,990 | needs_review | current | new | — |
| `rivian-r1s-2027-premium-long-range-7-seat` | 2027 | Premium Long Range (7-seat) | 7 | $90,990 | needs_review | current | new | — |
| `rivian-r1s-2027-premium-long-range-6-seat` | 2027 | Premium Long Range (6-seat) | 6 | $90,990 | needs_review | current | new | — |
| `rivian-r1s-2027-performance-7-seat` | 2027 | Performance (7-seat) | 7 | $106,990 | needs_review | current | new | — |
| `rivian-r1s-2027-performance-6-seat` | 2027 | Performance (6-seat) | 6 | $106,990 | needs_review | current | new | — |
| `rivian-r1s-2027-quad-7-seat` | 2027 | Quad (7-seat) | 7 | $121,990 | needs_review | current | new | — |
| `rivian-r1s-2027-quad-6-seat` | 2027 | Quad (6-seat) | 6 | $121,990 | needs_review | current | new | — |

## Tesla Model X

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `tesla-model-x-2021-long-range-plus-5s` | 2021 | Long Range Plus | 5 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2021-long-range-plus-6s` | 2021 | Long Range Plus | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2021-long-range-plus-7s` | 2021 | Long Range Plus | 7 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2022-base-5s` | 2022 | Base | 5 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2022-base-6s` | 2022 | Base | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2022-base-7s` | 2022 | Base | 7 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2022-plaid` | 2022 | Plaid | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2026-base-5s` | 2026 | Base | 5 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2026-base-6s` | 2026 | Base | 6 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2026-base-7s` | 2026 | Base | 7 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2026-plaid-5s` | 2026 | Plaid | 5 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2026-plaid-6s` | 2026 | Plaid | 6 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2026-plaid-7s` | 2026 | Plaid | 7 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-base-5s` | 2025 | Base | 5 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-base-6s` | 2025 | Base | 6 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-base-7s` | 2025 | Base | 7 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-plaid-5s` | 2025 | Plaid | 5 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-plaid-6s` | 2025 | Plaid | 6 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2025-plaid-7s` | 2025 | Plaid | 7 | N/A - Not New | used_only | unknown | — | [electrek.co](https://electrek.co/2026/04/01/tesla-model-s-x-production-over-only-inventory-left/), 2026-11-16 |
| `tesla-model-x-2024-base-5s` | 2024 | Base | 5 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2024-base-6s` | 2024 | Base | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2024-base-7s` | 2024 | Base | 7 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2024-plaid` | 2024 | Plaid | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2023-base-5s` | 2023 | Base | 5 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2023-base-6s` | 2023 | Base | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2023-base-7s` | 2023 | Base | 7 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2023-plaid` | 2023 | Plaid | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2021-plaid-5s` | 2021 | Plaid | 5 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2021-plaid-6s` | 2021 | Plaid | 6 | N/A - Not New | used_only | unknown | — | — |
| `tesla-model-x-2021-plaid-7s` | 2021 | Plaid | 7 | N/A - Not New | used_only | unknown | — | — |

## Lucid Gravity

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `lucid-gravity-2026-grand-touring` | 2026 | Grand Touring | 7 | $98,900 | needs_review | current | new | — |
| `lucid-gravity-2026-touring` | 2026 | Touring | 7 | $79,900 | needs_review | current | new | — |
| `lucid-gravity-2026-dream-edition` | 2026 | Dream Edition | 7 | $139,900 | needs_review | current | new | — |
| `lucid-gravity-2027-touring` | 2027 | Touring | 7 | $79,900 | needs_review | current | new | [lucidmotors.com](https://lucidmotors.com/gravity), 2026-11-15 |
| `lucid-gravity-2027-grand-touring` | 2027 | Grand Touring | 7 | $98,900 | needs_review | current | new | [lucidmotors.com](https://lucidmotors.com/gravity), 2026-11-15 |
| `lucid-gravity-2027-gt-s` | 2027 | GT-S | 7 | $125,900 | needs_review | current | new | [lucidmotors.com](https://lucidmotors.com/gravity), 2026-11-15 |

## Volkswagen ID. Buzz

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `volkswagen-id-buzz-2025-1st-edition-with-4motion` | 2025 | 1st Edition with 4MOTION | 6 | $69,995 | needs_review | current | new | [www.vw.com](https://www.vw.com/en/models/id-buzz.html), 2026-11-16 |
| `volkswagen-id-buzz-2025-pro-s-plus-with-4motion` | 2025 | Pro S Plus with 4MOTION | 6 | $68,990 | needs_review | current | new | — |
| `volkswagen-id-buzz-2025-pro-s-rwd` | 2025 | Pro S RWD | 7 | $59,995 | needs_review | current | new | [www.vw.com](https://www.vw.com/en/models/id-buzz.html), 2026-11-16 |
| `volkswagen-id-buzz-2025-pro-s-plus-rwd` | 2025 | Pro S Plus RWD | 7 | $63,495 | needs_review | current | new | [www.conceptcarz.com](https://www.conceptcarz.com/a54862/volkswagen-2025-id-buzz-pricing.aspx), 2026-11-16 |
| `volkswagen-id-buzz-2025-1st-edition-rwd` | 2025 | 1st Edition RWD | 6 | $65,495 | needs_review | current | new | [www.conceptcarz.com](https://www.conceptcarz.com/a54862/volkswagen-2025-id-buzz-pricing.aspx), 2026-11-16 |

## Toyota Highlander EV

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `toyota-highlander-ev-2027-limited-expected` | 2027 | Limited (expected) | 6 | — | announced | unknown | — | — |
| `toyota-highlander-ev-2027-xle-expected` | 2027 | XLE (expected) | 6 | — | announced | unknown | — | — |

## Cadillac Escalade IQ

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `cadillac-escalade-iq-2026-luxury` | 2026 | Luxury | 7 | $127,405 | needs_review | current | new | — |
| `cadillac-escalade-iq-2025-luxury-1` | 2025 | Luxury 1 | 7 | $127,700 | needs_review | current | new | — |
| `cadillac-escalade-iq-2025-sport-1` | 2025 | Sport 1 | 7 | $128,200 | needs_review | current | new | — |
| `cadillac-escalade-iq-2025-luxury-2` | 2025 | Luxury 2 | 7 | $147,700 | needs_review | current | new | — |
| `cadillac-escalade-iq-2025-sport-2` | 2025 | Sport 2 | 7 | $148,200 | needs_review | current | new | — |
| `cadillac-escalade-iq-2026-sport` | 2026 | Sport | 7 | $127,905 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/escalade-iq), 2026-11-16 |
| `cadillac-escalade-iq-2026-premium-luxury` | 2026 | Premium Luxury | 7 | $147,705 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/escalade-iq), 2026-11-16 |
| `cadillac-escalade-iq-2026-premium-sport` | 2026 | Premium Sport | 7 | $148,205 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/escalade-iq), 2026-11-16 |

## Cadillac VISTIQ

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `cadillac-vistiq-2026-luxury` | 2026 | Luxury | 7 | $77,395 | needs_review | current | new | — |
| `cadillac-vistiq-2026-sport` | 2026 | Sport | 7 | $77,895 | needs_review | current | new | — |
| `cadillac-vistiq-2026-premium-luxury` | 2026 | Premium Luxury | 7 | $91,895 | needs_review | current | new | — |
| `cadillac-vistiq-2026-platinum` | 2026 | Platinum | 7 | $96,495 | needs_review | current | new | — |
| `cadillac-vistiq-2027-luxury` | 2027 | Luxury | 7 | $78,400 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/vistiq), 2026-11-15 |
| `cadillac-vistiq-2027-sport` | 2027 | Sport | 7 | $79,000 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/vistiq), 2026-11-15 |
| `cadillac-vistiq-2027-premium-luxury` | 2027 | Premium Luxury | 6 | $92,900 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/vistiq), 2026-11-15 |
| `cadillac-vistiq-2027-platinum` | 2027 | Platinum | 6 | $97,500 | needs_review | current | new | [www.cadillac.com](https://www.cadillac.com/electric/vistiq), 2026-11-15 |

## Mercedes-Benz EQS SUV

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `mercedes-benz-eqs-suv-2025-eqs-450-plus` | 2025 | EQS 450+ | 7 | $105,250 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2025-eqs-450-4matic` | 2025 | EQS 450 4MATIC | 5 | $108,250 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2025-eqs-580-4matic` | 2025 | EQS 580 4MATIC | 5 | $128,200 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2023-eqs-450-plus` | 2023 | EQS 450+ | 7 | $104,400 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2023-eqs-450-4matic` | 2023 | EQS 450 4MATIC | 7 | $107,400 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2023-eqs-580-4matic` | 2023 | EQS 580 4MATIC | 7 | $125,950 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2024-eqs-450-plus` | 2024 | EQS 450+ | 7 | $104,400 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2024-eqs-450-4matic` | 2024 | EQS 450 4MATIC | 7 | $107,400 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2024-eqs-580-4matic` | 2024 | EQS 580 4MATIC | 7 | $127,350 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2024-maybach-eqs-680-4matic` | 2024 | Maybach EQS 680 4MATIC | 7 | $179,900 | needs_review | historical | used_only | — |
| `mercedes-benz-eqs-suv-2025-maybach-eqs-680-4matic` | 2025 | Maybach EQS 680 4MATIC | 7 | $179,900 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2026-eqs-400-4matic` | 2026 | EQS 400 4MATIC | 7 | $89,950 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2026-eqs-550-4matic` | 2026 | EQS 550 4MATIC | 7 | $112,450 | needs_review | current | new | — |
| `mercedes-benz-eqs-suv-2026-maybach-eqs-680-4matic` | 2026 | Maybach EQS 680 4MATIC | 7 | $181,250 | needs_review | current | new | — |

## Subaru Getaway

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `subaru-getaway-2027-premium` | 2027 | Premium | 7 | — | announced | unknown | — | — |

## Tesla Model Y (3-Row)

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `tesla-model-y-3-row-2026-long-range-awd` | 2026 | Long Range AWD | 7 | $51,490 | needs_review | current | new | — |

## VinFast VF9

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `vinfast-vf9-2025-eco` | 2025 | Eco | 7 | $69,800 | needs_review | current | new | — |
| `vinfast-vf9-2025-plus-7-seat` | 2025 | Plus (7-seat) | 7 | $73,800 | needs_review | current | new | — |
| `vinfast-vf9-2025-plus-6-seat` | 2025 | Plus (6-seat) | 6 | $73,800 | needs_review | current | new | — |
| `vinfast-vf9-2027-plus-7-seat` | 2027 | Plus (7-seat) | 7 | $62,900 | needs_review | current | new | [vinfastauto.us](https://vinfastauto.us/vehicles/vf-9), 2026-11-15 |
| `vinfast-vf9-2027-plus-6-seat` | 2027 | Plus (6-seat) | 6 | $62,900 | needs_review | current | new | [vinfastauto.us](https://vinfastauto.us/vehicles/vf-9), 2026-11-15 |

## BMW iX7

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `bmw-ix7-2027-xdrive50-expected` | 2027 | xDrive50 (expected) | 7 | — | announced | unknown | — | — |
| `bmw-ix7-2027-m70-expected` | 2027 | M70 (expected) | 7 | — | announced | unknown | — | — |

## Genesis GV90

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `genesis-gv90-2027-base-expected` | 2027 | Base (expected) | 7 | — | announced | unknown | — | — |

## Faraday Future FX Super One

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `faraday-future-fx-super-one-2027-base-expected` | 2027 | Base (expected) | 7 | TBD | announced | unknown | — | — |

## Mercedes-Benz GLB Electric

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `mercedes-benz-glb-electric-2027-glb-250-plus-expected` | 2027 | GLB 250+ (expected) | 7 | — | announced | unknown | — | — |
| `mercedes-benz-glb-electric-2027-glb-350-4matic-expected` | 2027 | GLB 350 4MATIC (expected) | 7 | — | announced | unknown | — | — |

## Lexus TZ

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `lexus-tz-2027-premium-awd` | 2027 | Premium AWD | 6 | $62,500 | announced | announced | — | — |
| `lexus-tz-2027-premium-touring-awd` | 2027 | Premium Touring AWD | 6 | $70,500 | announced | announced | — | — |
| `lexus-tz-2027-luxury-awd` | 2027 | Luxury AWD | 6 | $79,000 | announced | announced | — | — |

## Tesla Model Y L

| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |
|---|---|---|---|---|---|---|---|---|
| `tesla-model-y-l-2026-launch-series` | 2026 | Launch Series | 6 | $61,990 | needs_review | current | new | — |

## Decision (owner, 2026-11-17)

**Newest model year only.** Each vehicle's newest model year is sold new (47 configurations). Earlier model years are used-only, and their price is kept as the last new price (`msrp_status: historical`, 66 configurations). The 2025 Volkswagen ID. Buzz is the newest year carried, so it stays new, consistent with the earlier D-14 decision. Resolutions are in `docs/migrations/2026-11-availability-resolutions.json`, applied with `--resolve`. 0 configurations remain `needs_review`.
