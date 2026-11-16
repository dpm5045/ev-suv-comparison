#!/usr/bin/env bash
# Add items to the open "Data inbox" issue (label data-inbox), opening one if
# none is open. The data agent works through that issue and closes it.
#
#   scripts/refresh/inbox.sh "<section title>" <file of "- item" lines>
#
# Does nothing when the file is empty. Needs GH_TOKEN with issues: write.
set -euo pipefail

title="$1"
file="$2"
[ -s "$file" ] || exit 0

gh label create data-inbox --color FBCA04 --description "Items for the data agent" >/dev/null 2>&1 || true

section="### ${title}

$(cat "$file")"

number=$(gh issue list --label data-inbox --state open --json number --jq '.[0].number // empty')
if [ -z "$number" ]; then
  body="Items the weekly data jobs could not settle on their own. The data agent (\`.github/workflows/data-agent.yml\`) works through them on its next run, opens a PR for anything it changes, and closes this issue.

${section}

---
*Opened by the data workflows. If the agent has no token configured, run \`/refresh\` locally with this issue as the to-do list, then close it.*"
  gh issue create --title "Data inbox" --label data-inbox --body "$body"
else
  gh issue comment "$number" --body "$section"
fi
