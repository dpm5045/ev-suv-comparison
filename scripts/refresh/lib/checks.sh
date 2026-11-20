# Lookups of the two required checks on a commit, shared by publish-pr.sh and tidy-prs.sh.
# Source this file; needs GH_TOKEN (checks: read, statuses: read).
#
#   build_state <repo> <sha>     latest `build` check run as "status:conclusion", or "" if none
#   contract_state <repo> <sha>  `data-contract` commit status (success|failure|error|pending), or ""

build_state() {
  gh api "repos/$1/commits/$2/check-runs" \
    --jq '[.check_runs[] | select(.name == "build")] | sort_by(.started_at) | last | if . == null then "" else "\(.status):\(.conclusion // "")" end'
}

contract_state() {
  gh api "repos/$1/commits/$2/status" \
    --jq '[.statuses[] | select(.context == "data-contract")][0].state // ""'
}
