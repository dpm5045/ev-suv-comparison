#!/usr/bin/env bash
# Before a data workflow writes, tidy the open data PRs (docs/plans/resume-publishing.md §4).
#
#   tidy-prs.sh <producer> [--wait-for-agent]
#
# For every open PR from a data-refresh/ branch:
#   - an `auto` PR of this producer, not flagged for the owner: closed. This run regenerates the
#     change from fresh data (a leftover from a run that was cut short).
#   - a PR for the owner (intent owner, or labelled needs-owner-review): never closed. If it is
#     behind the default branch, it is brought up to date and both required checks are run on
#     the new commit, so the owner never has to click "Update branch". A conflict is reported.
#   - this producer's own PR waiting for the owner, or (with --wait-for-agent) an agent data PR:
#     this run skips writing until it's merged or closed, since it edits the same files.
# The intent is the `<!-- publish-intent: ... -->` marker publish-pr.sh puts in the PR body;
# older agent PRs without one count as owner PRs.
#
# Writes skip=yes|no to $GITHUB_OUTPUT. Needs GH_TOKEN with pull-requests/contents/actions write.
set -euo pipefail
producer="${1:?producer}"
wait_agent=no
[ "${2:-}" = --wait-for-agent ] && wait_agent=yes
repo="${GITHUB_REPOSITORY:?}"
out="${GITHUB_OUTPUT:-/dev/null}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
say() { echo "$*"; echo "$*" >> "$summary"; }

skip=no
prs=$(gh pr list --state open --limit 100 --json number,headRefName,labels,body,mergeStateStatus,url \
  --jq '.[] | select(.headRefName | startswith("data-refresh/"))
        | [(.number | tostring), .headRefName,
           ([.labels[].name] | join(",")),
           (if (.body // "" | contains("publish-intent: auto")) then "auto"
            elif (.body // "" | contains("publish-intent: owner")) then "owner"
            elif (.headRefName | startswith("data-refresh/agent-")) then "owner" else "auto" end),
           .mergeStateStatus, .url] | join("\u001f")')

# Fields are joined by the unit separator, not tabs: `read` would merge empty fields between tabs
while IFS=$'\x1f' read -r num ref labels intent state url; do
  [ -n "${num:-}" ] || continue
  [[ ",$labels," == *",needs-owner-review,"* ]] && intent=owner
  mine=no; [[ "$ref" == "data-refresh/$producer-"* ]] && mine=yes

  if [ "$intent" = auto ]; then
    if [ "$mine" = yes ]; then
      gh pr close "$num" --delete-branch --comment "Replaced: a new $producer run regenerates this change from fresh data." >/dev/null
      say "Closed $url (an earlier $producer run's PR; this run regenerates it)."
    fi
    continue
  fi

  # A PR for the owner
  if [ "$state" = BEHIND ]; then
    old=$(gh pr view "$num" --json headRefOid --jq .headRefOid)
    if gh pr update-branch "$num" >/dev/null 2>&1; then
      new=$old
      for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
        new=$(gh pr view "$num" --json headRefOid --jq .headRefOid)
        [ "$new" != "$old" ] && break
        sleep "${TIDY_POLL_SECONDS:-5}"
      done
      if [ "$new" != "$old" ]; then
        default=$(gh api "repos/$repo" --jq .default_branch)
        tip=$(gh api "repos/$repo/commits/$default" --jq .sha)
        gh workflow run ci.yml --ref "$ref"
        gh workflow run data-contract.yml -f base_sha="$tip" -f head_sha="$new" -f pr="$num"
        say "Brought $url up to date and re-ran its checks."
      else
        say "Asked GitHub to update $url; its new commit hasn't appeared yet. The next run re-checks it."
      fi
    else
      say "Could not bring $url up to date automatically."
    fi
  elif [ "$state" = DIRTY ]; then
    say "$url conflicts with the default branch; it needs the owner (or closing, after which the agent redoes it)."
  fi
  if [ "$mine" = yes ] || { [ "$wait_agent" = yes ] && [[ "$ref" == data-refresh/agent-* ]]; }; then
    skip=yes
    say "Waiting for $url (the owner's review) before $producer writes again."
  fi
done <<< "$prs"

echo "skip=$skip" >> "$out"
