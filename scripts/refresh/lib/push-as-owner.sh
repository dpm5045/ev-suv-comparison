#!/usr/bin/env bash
# Push a branch to origin with the owner's publishing token (PUBLISH_TOKEN).
#
#   push-as-owner.sh <branch>
#
# actions/checkout leaves an `http.<origin>.extraheader` with GITHUB_TOKEN. That setting is
# multi-valued, so adding ours would send both. An empty value first clears the list, then ours
# is the only one. The settings are passed through the environment (not argv or .git/config),
# so the token isn't in the process list and nothing persists after the push.
set -euo pipefail
branch="${1:?branch}"
url=$(git remote get-url origin)
if [[ "$url" =~ ^(https?://[^/]+/) ]]; then
  key="http.${BASH_REMATCH[1]}.extraheader"
  auth=$(printf 'x-access-token:%s' "${PUBLISH_TOKEN:?}" | base64 | tr -d '\n')
  if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::add-mask::$auth"; fi
  GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0="$key" GIT_CONFIG_VALUE_0='' \
    GIT_CONFIG_KEY_1="$key" GIT_CONFIG_VALUE_1="AUTHORIZATION: basic $auth" \
    git push -q origin "$branch"
else
  git push -q origin "$branch"   # a local remote (tests): nothing to authenticate
fi
