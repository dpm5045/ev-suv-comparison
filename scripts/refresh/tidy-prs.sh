#!/usr/bin/env bash
# Tidy the open data PRs (docs/plans/resume-publishing.md §4).
#
#   tidy-prs.sh <producer> [--wait-for-agent]   before a data workflow writes
#   tidy-prs.sh <producer> --owner-prs-only     after it merged something
#
# Does nothing while publication is paused (can-publish.sh, read live). Otherwise, for every
# open PR from a data-refresh/ branch:
#   - an `auto` PR of this producer, not flagged for the owner: closed. This run regenerates the
#     change from fresh data (a leftover from a run that was cut short).
#   - a PR for the owner (intent owner, or labelled needs-owner-review): never closed.
#     If it is behind the default branch, it is brought up to date ("Update branch"), and both
#     required checks are run on the new commit. If a check is missing on its current commit
#     (an update whose new commit appeared late), that check is run. So the owner never has
#     to click "Update branch" or re-run anything. A conflict is reported.
#   - this producer's own PR waiting for the owner, or (with --wait-for-agent) an agent data PR:
#     this run skips writing until it's merged or closed, since it edits the same files.
# The intent is the `<!-- publish-intent: ... -->` marker publish-pr.sh puts in the PR body;
# older agent PRs without one count as owner PRs.
#
# Writes skip=yes|no to $GITHUB_OUTPUT. Needs GH_TOKEN with pull-requests/contents/actions write
# and checks/statuses read.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# shellcheck source=lib/checks.sh
. "$HERE/lib/checks.sh"
producer="${1:?producer}"
mode="${2:-}"
repo="${GITHUB_REPOSITORY:?}"
out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
say() { echo "$*"; echo "$*" >> "$summary"; }

gate=$(bash "$HERE/can-publish.sh")
if [ "$gate" != yes ]; then
  say "PR maintenance skipped: ${gate#no: }"
  echo "skip=no" >> "$out"; exit 0
fi

default=$(gh api "repos/$repo" --jq .default_branch)

# Run whichever required check is missing (or was cancelled) on a PR's current commit
ensure_checks() {
  local num=$1 ref=$2 head=$3 tip build
  # Missing, or cancelled (e.g. superseded): run it. Running or failed: leave it.
  build=$(build_state "$repo" "$head")
  if [ -z "$build" ] || [ "$build" = completed:cancelled ]; then
    gh workflow run ci.yml --ref "$ref"
    say "Ran the build check on PR #$num ($head)."
  fi
  if [ -z "$(contract_state "$repo" "$head")" ]; then
    tip=$(gh api "repos/$repo/commits/$default" --jq .sha)
    gh workflow run data-contract.yml -f base_sha="$tip" -f head_sha="$head" -f pr="$num"
    say "Ran the data contract on PR #$num ($head)."
  fi
}

skip=no
prs=$(gh pr list --state open --limit 100 --json number,headRefName,headRefOid,labels,body,url \
  --jq '.[] | select(.headRefName | startswith("data-refresh/"))
        | [(.number | tostring), .headRefName, .headRefOid,
           ([.labels[].name] | join(",")),
           (if (.body // "" | contains("publish-intent: auto")) then "auto"
            elif (.body // "" | contains("publish-intent: owner")) then "owner"
            elif (.headRefName | startswith("data-refresh/agent-")) then "owner" else "auto" end),
           .url] | join("\u001f")')

# Fields are joined by the unit separator, not tabs: `read` would merge empty fields between tabs
while IFS=$'\x1f' read -r num ref head labels intent url; do
  [ -n "${num:-}" ] || continue
  [[ ",$labels," == *",needs-owner-review,"* ]] && intent=owner
  mine=no; [[ "$ref" == "data-refresh/$producer-"* ]] && mine=yes

  if [ "$intent" = auto ]; then
    if [ "$mine" = yes ] && [ "$mode" != --owner-prs-only ]; then
      gh pr close "$num" --delete-branch --comment "Replaced: a new $producer run regenerates this change from fresh data." >/dev/null
      say "Closed $url (an earlier $producer run's PR; this run regenerates it)."
    fi
    continue
  fi

  # A PR for the owner: keep it current and checked
  behind=$(gh api "repos/$repo/compare/$default...$head" --jq .behind_by)
  if [ "${behind:-0}" != 0 ]; then
    if gh pr update-branch "$num" >/dev/null 2>&1; then
      new=$head
      for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
        new=$(gh pr view "$num" --json headRefOid --jq .headRefOid)
        [ "$new" != "$head" ] && break
        sleep "${TIDY_POLL_SECONDS:-5}"
      done
      if [ "$new" != "$head" ]; then
        ensure_checks "$num" "$ref" "$new"
        say "Brought $url up to date."
      else
        say "Asked GitHub to update $url; its new commit hasn't appeared yet. The next run checks it."
      fi
    else
      say "Could not bring $url up to date automatically (probably a conflict). It needs the owner, or closing (the agent then redoes it)."
    fi
  else
    ensure_checks "$num" "$ref" "$head"
  fi
  if [ "$mode" != --owner-prs-only ]; then
    if [ "$mine" = yes ] || { [ "$mode" = --wait-for-agent ] && [[ "$ref" == data-refresh/agent-* ]]; }; then
      skip=yes
      say "Waiting for $url (the owner's review) before $producer writes again."
    fi
  fi
done <<< "$prs"

echo "skip=$skip" >> "$out"
