/**
 * Trusted data-exception approvals (WP-F §6). An approval counts only if it was
 * produced by a successful workflow_dispatch run of the approval workflow, on
 * the default branch, triggered by the repository OWNER (checked now, through
 * the API), and its artifact matches the exception exactly. A status name, a PR
 * body or any text in the proposal is never evidence of approval.
 */
import { unzipFirst } from '../refresh/lib/zip.mjs'

export const APPROVAL_WORKFLOW = '.github/workflows/approve-data-exception.yml'
export const APPROVAL_FIELDS = ['base_sha', 'proposal_sha256', 'id', 'field', 'old', 'new']

/**
 * Load every valid approval from the GitHub API.
 * @param {{ repo: string, token: string, fetchImpl?: typeof fetch }} o
 * @returns {Promise<{ approvals: object[], rejected: string[] }>}
 */
export async function loadApprovals({ repo, token, fetchImpl = fetch }) {
  const api = async (path, raw = false) => {
    const res = await fetchImpl(`https://api.github.com/${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`GitHub API ${path}: HTTP ${res.status}`)
    return raw ? Buffer.from(await res.arrayBuffer()) : res.json()
  }
  const meta = await api(`repos/${repo}`)
  const owner = meta.owner?.login
  const defaultBranch = meta.default_branch
  const file = APPROVAL_WORKFLOW.split('/').pop()
  // Every eligible run, newest first (paginated; approvals live 90 days)
  const runs = []
  for (let page = 1; page <= 50; page++) {
    const { workflow_runs: batch = [] } = await api(`repos/${repo}/actions/workflows/${file}/runs?event=workflow_dispatch&status=success&per_page=100&page=${page}`)
    runs.push(...batch)
    if (batch.length < 100) break
  }

  const approvals = []
  const rejected = []
  for (const run of runs) {
    const why = []
    if (run.path !== APPROVAL_WORKFLOW && !String(run.path ?? '').startsWith(`${APPROVAL_WORKFLOW}@`)) why.push(`workflow path ${run.path}`)
    if (run.event !== 'workflow_dispatch') why.push(`event ${run.event}`)
    if (run.head_branch !== defaultBranch) why.push(`branch ${run.head_branch}`)
    if (run.conclusion !== 'success') why.push(`conclusion ${run.conclusion}`)
    const actor = run.triggering_actor?.login ?? run.actor?.login
    if (!owner || actor !== owner) why.push(`triggered by ${actor}, not the repository owner ${owner}`)
    if (why.length) { rejected.push(`run ${run.id}: ${why.join('; ')}`); continue }
    const { artifacts = [] } = await api(`repos/${repo}/actions/runs/${run.id}/artifacts`)
    const art = artifacts.find((a) => a.name === 'approval' && !a.expired)
    if (!art) { rejected.push(`run ${run.id}: no approval artifact`); continue }
    try {
      const zip = await api(`repos/${repo}/actions/artifacts/${art.id}/zip`, true)
      const a = JSON.parse(unzipFirst(zip, 'approval.json').toString('utf8'))
      approvals.push({ ...a, run_id: run.id, approver: actor })
    } catch (e) {
      rejected.push(`run ${run.id}: unreadable approval artifact (${e.message})`)
    }
  }
  return { approvals, rejected }
}

/** Does an approval match this exception exactly? */
export function matches(approval, exception) {
  return APPROVAL_FIELDS.every((k) => String(approval?.[k]) === String(exception[k]))
}
