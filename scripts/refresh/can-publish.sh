#!/usr/bin/env bash
# Prints "yes" when a data workflow may write to the repository now, else
# "no: <reason>". Run immediately before any write (build spec E.3):
#   - publish-control.json is read LIVE from the default branch through the API,
#     so a pause applies to jobs that started before it was set;
#   - the checked-out data's schema_version must be accepted by this code's
#     compat.json.
# Needs GH_TOKEN (contents: read) and GITHUB_REPOSITORY.
set -euo pipefail
repo="${GITHUB_REPOSITORY:?}"
branch=$(gh api "repos/$repo" --jq .default_branch)
control=$(gh api "repos/$repo/contents/scripts/refresh/publish-control.json?ref=$branch" -H "Accept: application/vnd.github.raw")
paused=$(printf '%s' "$control" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s);process.stdout.write(c.paused===true?"yes "+(c.reason||""):"no")})')
case "$paused" in yes*) echo "no: publication paused (${paused#yes })"; exit 0;; esac
ok=$(node -e 'const fs=require("fs");const d=JSON.parse(fs.readFileSync("lib/ev-data.json","utf8"));const c=JSON.parse(fs.readFileSync("scripts/refresh/compat.json","utf8"));process.stdout.write(c.accepts_schema.includes(d.schema_version)?"yes":"schema_version "+d.schema_version+" not in "+JSON.stringify(c.accepts_schema))')
if [ "$ok" = yes ]; then echo yes; else echo "no: $ok"; fi
