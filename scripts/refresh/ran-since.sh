#!/usr/bin/env bash
# Usage: ran-since.sh <workflow file> <since: YYYY-MM-DD> [title text]
#
# Prints "yes" when that workflow has a successful run created on or after
# <since> (UTC) that actually completed its refresh, optionally only runs whose
# title contains [title text]; otherwise "no". The backup schedules use it:
# GitHub's cron is best effort and sometimes drops a run, so each job is also
# scheduled a day later and runs then only if the first run never completed.
#
# A run that stopped because publication was paused (or the data schema wasn't
# accepted) still concludes "success", but it uploads a `publication-paused`
# artifact; such runs don't count, so the backup retries (build spec E.3).
# Needs GH_TOKEN with actions: read.
set -euo pipefail
workflow="$1" since="$2" title="${3:-}"
ids=$(gh run list --workflow "$workflow" --limit 50 --json databaseId,conclusion,createdAt,displayTitle \
  --jq ".[] | select(.conclusion == \"success\" and .createdAt >= \"${since}T00:00:00Z\" and (.displayTitle | contains(\"$title\"))) | .databaseId")
for id in $ids; do
  paused=$(gh api "repos/{owner}/{repo}/actions/runs/$id/artifacts" --jq '[.artifacts[] | select(.name == "publication-paused")] | length')
  if [ "$paused" = 0 ]; then echo yes; exit 0; fi
done
echo no
