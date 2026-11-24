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

Work out "this week" as the most recent Monday (UTC) up to now. Then:

```bash
date -u
for w in preowned-refresh.yml data-watch.yml data-agent.yml; do
  echo "== $w"
  gh run list --workflow "$w" -L 6 --json databaseId,event,status,conclusion,createdAt,displayTitle \
    -q '.[] | "\(.databaseId) \(.event) \(.status) \(.conclusion) \(.createdAt) \(.displayTitle)"'
done
gh pr list --state all -L 15 --json number,title,state,headRefName,labels,assignees,createdAt,mergedAt,url
gh issue list --label data-inbox --state all -L 3 --json number,state,title,updatedAt,url
git fetch -q origin && git show origin/master:scripts/refresh/publish-control.json
grep -o 'expires \*\*[0-9-]*\*\*' docs/runbooks/migration.md
```

For each workflow, use this week's runs (`schedule` or `workflow_dispatch`):
- **What it published:** a run's PR has head branch `data-refresh/<producer>-<date>-<run id>-<attempt>`. No PR from a successful run means it found nothing to publish (normal for pricing most weeks). If unsure, `gh run view <id> --log | grep -i outcome` shows the publisher's outcome (`merged`, `owner`, `none`, `paused`, `failed`).
- **Backup runs that skipped:** a successful Tuesday run with no PR, after a successful Monday run, just confirmed Monday's.
- **Failures:** `gh run view <id> --log-failed | tail -40`; say in one sentence what failed and whether the backup will retry it.

## Report

1. **Headline:** all fine / something waits for you (link it) / something failed.
2. **Each job, one line:** ran when (ET, and how late), what it did (published PR #n which merged itself; nothing to publish; waiting for your review; failed because ...).
3. **Waiting for the owner:** open `data-refresh/*` PRs labelled `needs-owner-review` or assigned to the owner, with links, and what the owner should look at. An agent PR that changes site data always waits for the owner.
4. **Data inbox:** open or closed, and whether the agent dealt with it.
5. **Publishing paused?** Only mention if `"paused": true` (nothing publishes while paused).
6. **Token:** if the expiry date recorded in `docs/runbooks/migration.md` is within 30 days (or past), warn: replace the `DATA_PUBLISH_TOKEN` secret and update the date (runbook, "The publishing token"). Otherwise one short line with the date. If no date is recorded, say so.
7. **Not run yet:** if a slot hasn't come or GitHub is running late, say when the backup is due and that nothing is needed from the owner yet. Offer to start a run by hand, but only start one if the owner says so.
