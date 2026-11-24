---
name: data-status
description: Plain-language status of the weekly data runs (pricing refresh, Data Watch, Data Agent) - did each run, what it published, whether anything waits for the owner, and whether the publishing token is close to expiry. Use when the owner asks how this week's (or Monday's) data runs went.
---

# Data run status

Read-only. Change nothing, start no workflows, merge nothing. Answer the owner in plain language (they are not reading logs): lead with one line, "all fine, nothing for you to do" or what needs them, then the details.

## The schedule (UTC; ET is UTC-5 in winter, UTC-4 in summer)

| Workflow file | Name | Main run | Backup |
|---|---|---|---|
| `preowned-refresh.yml` | Pre-owned Pricing Refresh | Mon 13:17 | Tue 13:17 |
| `data-watch.yml` | Data Watch | Mon 13:47 | Tue 13:47 |
| `data-agent.yml` | Data Agent (inbox) | Mon 14:47 | Tue 14:47 |
| `data-agent.yml` | Data Agent (monthly) | 1st 15:23 | 2nd 15:23 |

A backup runs its job only if the main run never succeeded (`scripts/refresh/ran-since.sh`); otherwise it finishes in seconds and does nothing. GitHub starts scheduled runs late, sometimes by hours, and sometimes skips them; that's why the backups exist. Don't call a run missing until its backup slot has also passed by several hours.

## Gather

Work out "this week" as the most recent Monday (UTC) up to now. The monthly agent pass is tracked separately: its window starts on the 1st of the month. Then:

```bash
date -u
MON=<this week's Monday, YYYY-MM-DD>; FIRST=<the 1st of this month, YYYY-MM-DD>
for w in preowned-refresh.yml data-watch.yml data-agent.yml; do
  echo "== $w"
  gh run list --workflow "$w" --created ">=$MON" -L 20 --json databaseId,event,status,conclusion,createdAt,displayTitle \
    -q '.[] | "\(.databaseId) \(.event) \(.status) \(.conclusion) \(.createdAt) \(.displayTitle)"'
done
echo "== monthly agent"; gh run list --workflow data-agent.yml --created ">=$FIRST" -L 50 --json databaseId,conclusion,createdAt,displayTitle \
  -q '.[] | select(.displayTitle | contains("monthly")) | "\(.databaseId) \(.conclusion) \(.createdAt)"'
echo "== open data PRs"; gh pr list --state open --json number,title,headRefName,labels,assignees,createdAt,url \
  -q '.[] | select(.headRefName | startswith("data-refresh/"))'
echo "== this week's data PRs"; gh pr list --state all --search "created:>=$MON head:data-refresh/" --json number,title,state,headRefName,labels,mergedAt,url
gh issue list --label data-inbox --state all -L 3 --json number,state,title,updatedAt,url
git fetch -q origin && git show origin/master:scripts/refresh/publish-control.json
grep -o 'expires \*\*[0-9-]*\*\*' docs/runbooks/migration.md
```

For each workflow, use this week's runs (`schedule` or `workflow_dispatch`); for the Data Agent, tell inbox and monthly runs apart by the run title (`Data Agent (inbox)` / `Data Agent (monthly)`). A successful inbox run doesn't cover a monthly backup, or the reverse.
- **Did the work actually run?** A run can conclude `success` while its real work was skipped: the backup gate found Monday's run fine; the agent's `plan` job found the inbox empty, an earlier agent PR still waiting for the owner, or no Claude credentials; or `tidy-prs.sh` kept an owner PR open and the pricing/watch steps stood down. Check the steps: `gh run view <id> --json jobs --jq '.jobs[] | .name as $j | .steps[] | "\($j) | \(.name) | \(.conclusion)"'`. Only call it "nothing to publish" if the refresh step itself (e.g. "Check EPA and price pages", the pricing refresh step, the agent run) concluded `success`. For a skip, give the reason: it is written to the run summary, which `gh run view` doesn't print, so read it from the log of the gate/plan/tidy step (`gh run view <id> --log | grep -iE 'nothing to do|skip|waits|inbox|credential|owner'`), or link the run page. If the reason is a PR waiting for the owner, or missing credentials, that is something for the owner: put it in the headline.
- **Rehearsals:** a manual Data Watch run with the `rehearsal` input skips the watch and only publishes `scripts/refresh/state/rehearsal.json` (its PR is titled "Data watch: rehearsal record state ..."; the run shows a "Write the rehearsal marker" step). It is not a watch run; list it separately.
- **Blocked, not empty:** a run that "succeeded" may have published nothing because publication was blocked (paused, or the data schema not accepted). Such runs upload a `publication-paused` artifact: check `gh api repos/{owner}/{repo}/actions/runs/<id>/artifacts --jq '.artifacts[].name'`. A blocked run doesn't count, and its backup retries (`scripts/refresh/ran-since.sh`).
- **What it published:** a run's PR has head branch `data-refresh/<producer>-<date>-<run id>-<attempt>`. A successful, unblocked run whose refresh step ran, with no PR, found nothing to publish (normal for pricing most weeks). If unsure, `gh run view <id> --log | grep -i outcome` shows the publisher's outcome (`merged`, `owner`, `none`, `paused`, `failed`).
- **Backup runs that skipped:** a successful backup run with no PR, after a successful unblocked main run, just confirmed it.
- **Failures:** `gh run view <id> --log-failed | tail -40`; say in one sentence what failed and whether the backup will retry it.

## Report

1. **Headline:** all fine / something waits for you (link it) / something failed.
2. **Each job, one line:** ran when (ET, and how late), what it did (published PR #n which merged itself; nothing to publish; waiting for your review; failed because ...).
3. **Waiting for the owner:** open `data-refresh/*` PRs labelled `needs-owner-review` or assigned to the owner, with links, and what the owner should look at. An agent PR that changes site data always waits for the owner.
4. **Data inbox:** open or closed, and whether the agent dealt with it.
5. **Publishing paused?** Mention if `"paused": true` now (nothing publishes while paused), or if any run this week was blocked (its artifact), and whether its backup has retried.
6. **Token:** if the expiry date recorded in `docs/runbooks/migration.md` is within 30 days (or past), warn: replace the `DATA_PUBLISH_TOKEN` secret and update the date (runbook, "The publishing token"). Otherwise one short line with the date. If no date is recorded, say so.
7. **Not run yet:** if a slot hasn't come or GitHub is running late, say when the backup is due and that nothing is needed from the owner yet. Offer to start a run by hand, but only start one if the owner says so.
