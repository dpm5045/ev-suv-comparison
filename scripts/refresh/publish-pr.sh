#!/usr/bin/env bash
# Publish a data workflow's edits as a pull request, and merge it when that's allowed
# (docs/plans/resume-publishing.md §1 and §6). Shared by the pre-owned, watch and agent workflows.
#
#   publish-pr.sh --producer <name> --intent auto|owner --allow '<path regex>' \
#                 --title "<title>" --body-file <file> [--rehearsal]
#
# Run it from a checkout of the default branch, with the producer's edits in the working tree.
#   1. Reads the pause flag live (can-publish.sh); paused -> writes nothing.
#   2. Commits the changed files (only those matching --allow) to data-refresh/<producer>-<date>-<run>.
#   3. Pushes the branch and opens the PR with the owner's publishing token (PUBLISH_TOKEN, the
#      DATA_PUBLISH_TOKEN secret), so the PR's own workflows start as they do for any PR: `ci.yml`
#      (build) and `data-contract.yml`. A PR opened with GITHUB_TOKEN gets a CI run that waits
#      for approval, which blocks the merge (Rollout, rehearsal of 2026-11-20).
#   4. Waits for both on that exact commit. A check that hasn't appeared after
#      PUBLISH_DISPATCH_AFTER seconds (default 240) is dispatched once, as a fallback.
#   5. intent auto, both passed, no `needs-owner-review` label, still not paused:
#        merge, bound to the checked commit (--match-head-commit).
#      The merge itself uses GITHUB_TOKEN, which can't bypass the branch rules.
#      intent owner, or the label: assign the owner and mention them in a comment (they are the
#      PR's author, through the token, so GitHub won't take a review request); leave it open.
#      A failed check, a timeout or a refused merge: close the PR and exit 1, so the run does not
#      count as done and the backup schedule retries (ran-since.sh).
#
# --rehearsal publishes only a marker file (scripts/refresh/state/rehearsal.json), even while
# paused: it proves the merge path against the real branch rules before publication resumes,
# without touching any data or the watch's observations.
#
# Writes outcome=merged|owner|none|paused|failed (and pr=<url>) to $GITHUB_OUTPUT.
# Needs GH_TOKEN (GITHUB_TOKEN) with contents/pull-requests/actions write and checks/statuses read;
# PUBLISH_TOKEN (fine-grained, this repo: contents and pull requests read/write);
# and GITHUB_REPOSITORY, GITHUB_REPOSITORY_OWNER, RUNNER_TEMP.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=lib/checks.sh
. "$HERE/lib/checks.sh"

producer='' intent='' allow='' title='' body='' rehearsal=no
while [ $# -gt 0 ]; do
  case "$1" in
    --producer) producer=$2; shift 2 ;;
    --intent) intent=$2; shift 2 ;;
    --allow) allow=$2; shift 2 ;;
    --title) title=$2; shift 2 ;;
    --body-file) body=$2; shift 2 ;;
    --rehearsal) rehearsal=yes; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
[[ "$producer" =~ ^[a-z][a-z-]*$ ]] || { echo "--producer must be lowercase letters and dashes" >&2; exit 2; }
case "$intent" in auto | owner) ;; *) echo "--intent must be auto or owner" >&2; exit 2 ;; esac
if [ -z "$allow" ] || [ -z "$title" ] || [ ! -f "$body" ]; then echo "--allow, --title and an existing --body-file are required" >&2; exit 2; fi

repo="${GITHUB_REPOSITORY:?}"
tmp="${RUNNER_TEMP:?}"
out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
poll="${PUBLISH_POLL_SECONDS:-20}"
limit="${PUBLISH_WAIT_SECONDS:-1500}"
dispatch_after="${PUBLISH_DISPATCH_AFTER:-240}"
say() { echo "$*"; echo "$*" >> "$summary"; }
finish() { echo "outcome=$1" >> "$out"; if [ -n "${2:-}" ]; then echo "pr=$2" >> "$out"; fi; }
paused() { mkdir -p "$tmp/paused" && echo "$1" > "$tmp/paused/reason.txt"; }

# 1. Pause flag and schema, read live
if [ "$rehearsal" = yes ]; then
  allow='scripts/refresh/state/rehearsal\.json'
  intent=auto
  say "Rehearsal: publishing only scripts/refresh/state/rehearsal.json, even while paused."
else
  gate=$(bash "$HERE/can-publish.sh")
  if [ "$gate" != yes ]; then
    say "Not publishing: ${gate#no: }"
    paused "$gate"; finish paused; exit 0
  fi
fi

# 2. Something to publish, and only this producer's files
changed=$(git status --porcelain --untracked-files=all | awk '{print $NF}')
if [ -z "$changed" ]; then say "Nothing to publish."; finish none; exit 0; fi
unexpected=$(echo "$changed" | grep -vxE "$allow" || true)
if [ -n "$unexpected" ]; then
  echo "Files outside this producer's allowlist changed; nothing published:" >&2; echo "$unexpected" >&2
  finish failed; exit 1
fi

if [ -z "${PUBLISH_TOKEN:-}" ]; then
  say "The DATA_PUBLISH_TOKEN secret is not set (docs/runbooks/migration.md); nothing published."
  finish failed; exit 1
fi

# 3. Branch from the default branch as it is now (publishers run one at a time)
default=$(gh api "repos/$repo" --jq .default_branch)
base=$(git rev-parse HEAD)
remote=$(git ls-remote origin "refs/heads/$default" | cut -f1)
if [ "$remote" != "$base" ]; then
  say "$default moved since this run started ($base -> $remote); nothing published. The next run starts fresh."
  finish failed; exit 1
fi
# Run id and attempt: a re-run never collides with a branch a failed attempt left behind
branch="data-refresh/$producer-$(date -u +%F)-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -q -b "$branch"
echo "$changed" | xargs git add -A --
git commit -qm "$title"
head=$(git rev-parse HEAD)
bash "$HERE/lib/push-as-owner.sh" "$branch"
{ cat "$body"; echo; echo "<!-- publish-intent: $intent -->"; } > "$tmp/pr-body.md"
url=$(GH_TOKEN="$PUBLISH_TOKEN" gh pr create --base "$default" --head "$branch" --title "$title" --body-file "$tmp/pr-body.md")
num=${url##*/}
say "Opened $url ($intent)."

close() {
  gh pr close "$num" --delete-branch --comment "$1" >/dev/null || true
}
# Any unexpected error from here on (a failed dispatch or API call) still closes the PR and fails
# the run, so no half-published PR is left behind to block the next run or its backup.
handled=no
on_exit() {
  local rc=$?
  if [ "$rc" -ne 0 ] && [ "$handled" = no ]; then
    say "Publishing stopped with an error (exit $rc). Closing $url; the next run starts fresh."
    close "Publishing stopped with an error before this PR was checked. The next scheduled run starts fresh."
    finish failed "$url"
  fi
}
trap on_exit EXIT

# 4. Wait for the PR's required checks on this exact commit; run any that never started
build='' contract='' waited=0 dispatched=no
while :; do
  build=$(build_state "$repo" "$head")
  contract=$(contract_state "$repo" "$head")
  if [[ "$build" == completed:* ]] && [[ "$contract" =~ ^(success|failure|error)$ ]]; then break; fi
  if [ "$dispatched" = no ] && [ "$waited" -ge "$dispatch_after" ]; then
    dispatched=yes
    if [ -z "$build" ]; then gh workflow run ci.yml --ref "$branch"; say "The build check hadn't started; ran it."; fi
    if [ -z "$contract" ]; then
      gh workflow run data-contract.yml -f base_sha="$base" -f head_sha="$head" -f pr="$num"
      say "The data contract hadn't started; ran it."
    fi
  fi
  if [ "$waited" -ge "$limit" ]; then break; fi
  sleep "$poll"; waited=$((waited + poll))
done
if [ "$build" != completed:success ] || [ "$contract" != success ]; then
  say "Checks on $head did not pass (build: ${build:-not reported}; data-contract: ${contract:-not reported}). Closing $url; the next run starts fresh."
  close "The required checks did not pass on $head (build: ${build:-not reported}; data-contract: ${contract:-not reported}). See the workflow run. The next scheduled run starts fresh."
  handled=yes; finish failed "$url"; exit 1
fi

# 5. Merge, or hand to the owner. The contract labels the PR before it posts success, so the label is final here.
labels=$(gh pr view "$num" --json labels --jq '[.labels[].name] | join(",")')
if [ "$intent" = auto ] && [[ ",$labels," != *",needs-owner-review,"* ]]; then
  if [ "$rehearsal" != yes ]; then
    gate=$(bash "$HERE/can-publish.sh")
    if [ "$gate" != yes ]; then
      say "Publication was paused while the checks ran; closing $url unmerged."
      close "Publication was paused while the checks ran (${gate#no: }). The first run after the pause starts fresh."
      handled=yes; paused "$gate"; finish paused "$url"; exit 0
    fi
  fi
  if gh pr merge "$num" --squash --delete-branch --match-head-commit "$head"; then
    handled=yes; say "Merged $url."; finish merged "$url"; exit 0
  fi
  say "GitHub refused to merge $url at $head. Closing it; the next run starts fresh."
  close "GitHub refused the merge at $head. The next scheduled run starts fresh."
  handled=yes; finish failed "$url"; exit 1
fi
owner="${GITHUB_REPOSITORY_OWNER:?}"
# The comment comes from github-actions, so it notifies the owner (their own token opened the PR)
gh pr edit "$num" --add-assignee "$owner" >/dev/null || say "Could not assign $url; it is still open."
gh pr comment "$num" --body "@$owner this PR waits for your review${labels:+ (labels: $labels)}. Merging it is the approval." >/dev/null \
  || say "Could not comment on $url; it is still open."
say "$url waits for the owner's review${labels:+ (labels: $labels)}."
handled=yes; finish owner "$url"
