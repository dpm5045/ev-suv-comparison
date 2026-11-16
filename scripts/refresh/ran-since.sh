#!/usr/bin/env bash
# Usage: ran-since.sh <workflow file> <since: YYYY-MM-DD> [title text]
#
# Prints "yes" when that workflow has a successful run created on or after
# <since> (UTC), optionally only runs whose title contains [title text];
# otherwise "no". The backup schedules use it: GitHub's cron is best effort and
# sometimes drops a run, so each job is also scheduled a day later and runs then
# only if the first run never succeeded. Needs GH_TOKEN with actions: read.
set -euo pipefail
workflow="$1" since="$2" title="${3:-}"
n=$(gh run list --workflow "$workflow" --limit 50 --json conclusion,createdAt,displayTitle \
  --jq "[.[] | select(.conclusion == \"success\" and .createdAt >= \"${since}T00:00:00Z\" and (.displayTitle | contains(\"$title\")))] | length")
if [ "$n" -gt 0 ]; then echo yes; else echo no; fi
