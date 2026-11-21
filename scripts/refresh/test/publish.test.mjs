// publish-pr.sh and tidy-prs.sh (docs/plans/resume-publishing.md §1, §4, §6), run for real
// against a throwaway git repo with a bare "origin", and a fake `gh` that logs its calls.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPTS = resolve(HERE, '..')
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim()
const put = (dir, p, text) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text) }

function setup(ghState = {}, envOver = {}) {
  const root = mkdtempSync(join(tmpdir(), 'publish-'))
  const origin = join(root, 'origin.git')
  const work = join(root, 'work')
  const bin = join(root, 'bin')
  git(root, 'init', '-q', '--bare', '-b', 'master', origin)
  git(root, 'clone', '-q', origin, work)
  git(work, 'config', 'user.email', 't@example.com'); git(work, 'config', 'user.name', 't')
  git(work, 'checkout', '-q', '-b', 'master')
  put(work, 'lib/ev-data.json', '{"schema_version": 2}\n')
  put(work, 'scripts/refresh/compat.json', '{"accepts_schema": [2]}\n')
  put(work, 'scripts/refresh/state/watch.json', '{"seen": 1}\n')
  git(work, 'add', '-A'); git(work, 'commit', '-qm', 'base'); git(work, 'push', '-q', 'origin', 'master')
  mkdirSync(bin)
  writeFileSync(join(bin, 'gh'), `#!/bin/sh\nexec node ${JSON.stringify(join(HERE, 'fixtures/fake-gh.mjs'))} "$@"\n`)
  chmodSync(join(bin, 'gh'), 0o755)
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_GH_LOG: join(root, 'gh.log'), FAKE_GH_STATE: join(root, 'gh.json'),
    GITHUB_REPOSITORY: 'o/r', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_RUN_ID: '99',
    RUNNER_TEMP: join(root, 'tmp'), GITHUB_OUTPUT: join(root, 'out'), GITHUB_STEP_SUMMARY: join(root, 'summary'),
    PUBLISH_POLL_SECONDS: '0', PUBLISH_WAIT_SECONDS: '0', PUBLISH_DISPATCH_AFTER: '0',
    GH_TOKEN: 'actions-token', PUBLISH_TOKEN: 'owner-token',
    ...envOver,
  }
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete env[k]
  mkdirSync(env.RUNNER_TEMP)
  writeFileSync(env.FAKE_GH_STATE, JSON.stringify(ghState))
  writeFileSync(env.FAKE_GH_LOG, '')
  writeFileSync(join(root, 'body.md'), 'Report\n')
  const calls = () => readFileSync(env.FAKE_GH_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const outputs = () => Object.fromEntries((existsSync(env.GITHUB_OUTPUT) ? readFileSync(env.GITHUB_OUTPUT, 'utf8') : '').trim().split('\n').filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)))
  const publish = (...extra) => spawnSync('bash', [join(SCRIPTS, 'publish-pr.sh'), '--producer', 'preowned', '--intent', 'auto', '--allow', 'lib/ev-data\\.json', '--title', 'Pre-owned pricing refresh', '--body-file', join(root, 'body.md'), ...extra], { cwd: work, env, encoding: 'utf8' })
  const tidy = (...a) => spawnSync('bash', [join(SCRIPTS, 'tidy-prs.sh'), ...a], { cwd: work, env, encoding: 'utf8' })
  const readState = () => JSON.parse(readFileSync(env.FAKE_GH_STATE, 'utf8'))
  const remoteBranches = () => git(work, 'ls-remote', '--heads', 'origin').split('\n').filter(Boolean).map((l) => l.split('refs/heads/')[1])
  return { work, calls, outputs, ghState: readState, publish, tidy, remoteBranches, done: () => rmSync(root, { recursive: true, force: true }) }
}
const has = (calls, ...prefix) => calls.some((c) => prefix.every((p, i) => c[i] === p))
const find = (calls, ...prefix) => calls.find((c) => prefix.every((p, i) => c[i] === p))
const edit = (s) => put(s.work, 'lib/ev-data.json', '{"schema_version": 2, "x": 1}\n')

test('publish: opens the PR as the owner, waits for its own checks on the exact commit, then merges bound to it', () => {
  const s = setup()
  try {
    edit(s)
    const r = s.publish()
    assert.equal(r.status, 0, r.stderr)
    const c = s.calls()
    const head = git(s.work, 'rev-parse', 'HEAD')
    assert.match(git(s.work, 'branch', '--show-current'), /^data-refresh\/preowned-\d{4}-\d{2}-\d{2}-99-1$/)
    assert.ok(s.remoteBranches().some((b) => b.startsWith('data-refresh/preowned-')))
    assert.equal(s.ghState().tokens.create, 'owner-token') // so the PR's workflows start without approval
    assert.ok(!has(c, 'workflow', 'run')) // both checks reported on their own
    const merge = find(c, 'pr', 'merge')
    assert.deepEqual(merge.slice(merge.indexOf('--match-head-commit')), ['--match-head-commit', head])
    assert.match(readFileSync(join(s.work, '..', 'tmp', 'pr-body.md'), 'utf8'), /publish-intent: auto/)
    assert.deepEqual(s.outputs(), { outcome: 'merged', pr: 'https://github.com/o/r/pull/7' })
  } finally { s.done() }
})

test('publish: a check that never started is run once, on the exact commit', () => {
  const wait = { PUBLISH_POLL_SECONDS: '1', PUBLISH_WAIT_SECONDS: '3' }
  const s = setup({ build: ['', 'completed:success'], contract: ['', 'success'] }, wait)
  try {
    edit(s)
    const r = s.publish()
    assert.equal(r.status, 0, r.stderr)
    const c = s.calls()
    const head = git(s.work, 'rev-parse', 'HEAD')
    const base = git(s.work, 'rev-parse', 'master')
    assert.ok(has(c, 'workflow', 'run', 'ci.yml', '--ref'))
    assert.deepEqual(find(c, 'workflow', 'run', 'data-contract.yml').slice(3), ['-f', `base_sha=${base}`, '-f', `head_sha=${head}`, '-f', 'pr=7'])
    assert.equal(c.filter((x) => x[0] === 'workflow').length, 2)
    assert.equal(s.outputs().outcome, 'merged')
  } finally { s.done() }
  const late = setup({ build: ['', 'completed:success'], contract: ['', 'success'] }, { ...wait, PUBLISH_DISPATCH_AFTER: '240' })
  try {
    edit(late)
    assert.equal(late.publish().status, 0)
    assert.ok(!has(late.calls(), 'workflow', 'run')) // within the grace period: just wait
  } finally { late.done() }
})

test('publish: without the publishing token it publishes nothing', () => {
  const s = setup({}, { PUBLISH_TOKEN: undefined })
  try {
    edit(s)
    const r = s.publish()
    assert.equal(r.status, 1)
    assert.ok(!has(s.calls(), 'pr', 'create'))
    assert.deepEqual(s.remoteBranches(), ['master'])
    assert.equal(s.outputs().outcome, 'failed')
  } finally { s.done() }
})

test('publish: a PR flagged needs-owner-review, or for the owner, is never merged', () => {
  for (const [state, extra] of [[{ labels: 'needs-owner-review' }, []], [{}, ['--intent', 'owner']]]) {
    const s = setup(state)
    try {
      edit(s)
      const r = s.publish(...extra)
      assert.equal(r.status, 0, r.stderr)
      const c = s.calls()
      assert.ok(!has(c, 'pr', 'merge'))
      assert.ok(c.some((x) => x[0] === 'pr' && x[1] === 'edit' && x.includes('--add-assignee') && x.includes('owner')))
      assert.ok(!c.some((x) => x.includes('--add-reviewer'))) // the owner authored it (their token); GitHub refuses self-review requests
      assert.match(find(c, 'pr', 'comment').join(' '), /@owner this PR waits for your review/)
      assert.equal(s.outputs().outcome, 'owner')
    } finally { s.done() }
  }
})

test('publish: a failed check, a timeout or a refused merge closes the PR and fails the run', () => {
  for (const state of [{ build: 'completed:failure' }, { contract: 'failure' }, { contract: 'pending' }, { build: '' }, { mergeFails: true }]) {
    const s = setup(state)
    try {
      edit(s)
      const r = s.publish()
      assert.equal(r.status, 1, JSON.stringify(state))
      assert.ok(has(s.calls(), 'pr', 'close', '7'), JSON.stringify(state))
      assert.equal(s.outputs().outcome, 'failed')
    } finally { s.done() }
  }
})

test('publish: an unexpected error after opening the PR (a failed dispatch) still closes it', () => {
  const s = setup({ dispatchFails: true, build: '' })
  try {
    edit(s)
    const r = s.publish()
    assert.notEqual(r.status, 0)
    assert.ok(has(s.calls(), 'pr', 'close', '7'))
    assert.ok(!has(s.calls(), 'pr', 'merge'))
    assert.equal(s.outputs().outcome, 'failed')
  } finally { s.done() }
})

test('publish: paused before writing writes nothing; paused while checks run closes unmerged', () => {
  const before = setup({ paused: [true] })
  try {
    edit(before)
    const r = before.publish()
    assert.equal(r.status, 0, r.stderr)
    assert.equal(before.outputs().outcome, 'paused')
    assert.ok(!has(before.calls(), 'pr', 'create'))
    assert.deepEqual(before.remoteBranches(), ['master'])
    assert.ok(existsSync(join(before.work, '..', 'tmp', 'paused', 'reason.txt'))) // the backup schedule retries
  } finally { before.done() }
  const during = setup({ paused: [false, true] })
  try {
    edit(during)
    const r = during.publish()
    assert.equal(r.status, 0, r.stderr)
    assert.equal(during.outputs().outcome, 'paused')
    assert.ok(!has(during.calls(), 'pr', 'merge'))
    assert.ok(has(during.calls(), 'pr', 'close', '7'))
  } finally { during.done() }
})

test('publish: files outside the allowlist, or a default branch that moved, publish nothing', () => {
  const s = setup()
  try {
    put(s.work, 'scripts/refresh/compat.json', '{"accepts_schema": [2, 3]}\n')
    edit(s)
    const r = s.publish()
    assert.equal(r.status, 1)
    assert.match(r.stderr, /allowlist/)
    assert.ok(!has(s.calls(), 'pr', 'create'))
  } finally { s.done() }
  const m = setup()
  try {
    // Someone else's commit lands on origin/master after this run checked out
    const other = join(m.work, '..', 'other')
    git(join(m.work, '..'), 'clone', '-q', join(m.work, '..', 'origin.git'), other)
    git(other, 'config', 'user.email', 't@example.com'); git(other, 'config', 'user.name', 't')
    put(other, 'README', 'x\n'); git(other, 'add', '-A'); git(other, 'commit', '-qm', 'moved'); git(other, 'push', '-q', 'origin', 'master')
    edit(m)
    const r = m.publish()
    assert.equal(r.status, 1)
    assert.ok(!has(m.calls(), 'pr', 'create'))
  } finally { m.done() }
})

test('publish: nothing changed means no PR', () => {
  const s = setup()
  try {
    const r = s.publish()
    assert.equal(r.status, 0)
    assert.equal(s.outputs().outcome, 'none')
    assert.ok(!has(s.calls(), 'pr', 'create'))
  } finally { s.done() }
})

test('publish --rehearsal: merges its marker even while paused, and nothing else', () => {
  const s = setup({ paused: [true] })
  try {
    put(s.work, 'scripts/refresh/state/rehearsal.json', '{"ran_at": "now"}\n')
    const r = s.publish('--rehearsal')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(s.outputs().outcome, 'merged')
  } finally { s.done() }
  const t = setup({ paused: [true] })
  try {
    put(t.work, 'scripts/refresh/state/rehearsal.json', '{"ran_at": "now"}\n')
    put(t.work, 'scripts/refresh/state/watch.json', '{"seen": 2}\n') // observations too: refused
    const r = t.publish('--rehearsal')
    assert.equal(r.status, 1)
    assert.ok(!has(t.calls(), 'pr', 'create'))
  } finally { t.done() }
})

const prLines = (...rows) => rows.map((r) => r.join('\x1f')).join('\n')

test('tidy: closes its own leftover auto PR, keeps owner PRs (updating them as the owner when behind), and waits for them', () => {
  const prs = prLines(
    ['11', 'data-refresh/preowned-2026-11-16-1', 'h11', '', 'auto', 'u11'], // own leftover: closed
    ['12', 'data-refresh/watch-2026-11-16-2', 'h12', '', 'auto', 'u12'], // another producer's: untouched
    ['13', 'data-refresh/agent-2026-11-16-3', 'old', '', 'owner', 'u13'], // owner, behind: updated + re-checked
  )
  const s = setup({ prs, behind: { old: 2 }, builds: {}, contracts: {} })
  try {
    const r = s.tidy('preowned', '--wait-for-agent')
    assert.equal(r.status, 0, r.stderr)
    const c = s.calls()
    assert.ok(has(c, 'pr', 'close', '11'))
    assert.ok(!has(c, 'pr', 'close', '12') && !has(c, 'pr', 'close', '13'))
    assert.ok(has(c, 'pr', 'update-branch', '13'))
    assert.equal(s.ghState().tokens['update-branch'], 'owner-token') // its checks then start on their own
    assert.ok(!has(c, 'workflow', 'run'))
    assert.equal(s.outputs().skip, 'yes') // the agent PR edits the same files
  } finally { s.done() }
})

test('tidy: an up-to-date owner PR gets only its missing checks; after a merge it only refreshes owner PRs', () => {
  const s = setup({ prs: prLines(['31', 'data-refresh/agent-2026-11-16-1', 'h31', '', 'owner', 'u31']), builds: { h31: 'completed:success' }, contracts: {} })
  try {
    assert.equal(s.tidy('watch').status, 0)
    const c = s.calls()
    assert.ok(!has(c, 'pr', 'update-branch'))
    assert.ok(!has(c, 'workflow', 'run', 'ci.yml')) // build already reported
    assert.ok(c.some((x) => x[2] === 'data-contract.yml' && x.includes('head_sha=h31')))
  } finally { s.done() }
  const cancelled = setup({ prs: prLines(['32', 'data-refresh/agent-2026-11-16-1', 'h32', '', 'owner', 'u32']), builds: { h32: 'completed:cancelled' }, contracts: { h32: 'success' } })
  try {
    assert.equal(cancelled.tidy('watch').status, 0)
    assert.ok(has(cancelled.calls(), 'workflow', 'run', 'ci.yml', '--ref', 'data-refresh/agent-2026-11-16-1'))
    assert.ok(!cancelled.calls().some((x) => x[2] === 'data-contract.yml'))
  } finally { cancelled.done() }
  const failedBuild = setup({ prs: prLines(['33', 'data-refresh/agent-2026-11-16-1', 'h33', '', 'owner', 'u33']), builds: { h33: 'completed:failure' }, contracts: { h33: 'success' } })
  try {
    assert.equal(failedBuild.tidy('watch').status, 0)
    assert.ok(!has(failedBuild.calls(), 'workflow', 'run')) // a real failure is for the owner, not a retry loop
  } finally { failedBuild.done() }
  const after = setup({ prs: prLines(['41', 'data-refresh/watch-2026-11-16-1', 'h41', '', 'auto', 'u41'], ['42', 'data-refresh/agent-2026-11-16-1', 'h42', '', 'owner', 'u42']), behind: { h42: 1 } })
  try {
    assert.equal(after.tidy('watch', '--owner-prs-only').status, 0)
    const c = after.calls()
    assert.ok(!has(c, 'pr', 'close')) // its own auto PR is the one that just merged; nothing to close
    assert.ok(has(c, 'pr', 'update-branch', '42'))
    assert.equal(after.outputs().skip, 'no')
  } finally { after.done() }
})

test('tidy: without the publishing token a behind owner PR is left as is', () => {
  const s = setup({ prs: prLines(['61', 'data-refresh/agent-2026-11-16-1', 'h61', '', 'owner', 'u61']), behind: { h61: 2 } }, { PUBLISH_TOKEN: undefined })
  try {
    const r = s.tidy('watch')
    assert.equal(r.status, 0)
    assert.ok(!has(s.calls(), 'pr', 'update-branch'))
    assert.match(r.stdout, /DATA_PUBLISH_TOKEN secret is not set/)
  } finally { s.done() }
})

test('push-as-owner: sends only the owner token, even with the checkout header configured', async () => {
  const { createServer } = await import('node:http')
  const seen = []
  const server = createServer((req, res) => { seen.push(req.headers.authorization); res.writeHead(403); res.end() })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const root = mkdtempSync(join(tmpdir(), 'push-'))
  try {
    const remote = `http://127.0.0.1:${server.address().port}/o/r.git`
    git(root, 'init', '-q', '-b', 'b')
    git(root, 'config', 'user.email', 't@example.com'); git(root, 'config', 'user.name', 't')
    git(root, 'commit', '-q', '--allow-empty', '-m', 'x')
    git(root, 'remote', 'add', 'origin', remote)
    // What actions/checkout leaves behind
    git(root, 'config', `http.http://127.0.0.1:${server.address().port}/.extraheader`, 'AUTHORIZATION: basic Y2hlY2tvdXQ=')
    const { spawn } = await import('node:child_process')
    const child = spawn('bash', [join(SCRIPTS, 'lib/push-as-owner.sh'), 'b'], { cwd: root, env: { ...process.env, PUBLISH_TOKEN: 'owner-token', GITHUB_ACTIONS: '', GIT_TERMINAL_PROMPT: '0' } })
    await new Promise((ok) => child.on('exit', ok))
    const owner = `basic ${Buffer.from('x-access-token:owner-token').toString('base64')}`
    assert.ok(seen.length > 0)
    assert.ok(seen.every((h) => h === owner), JSON.stringify(seen)) // never the checkout's token, never both
  } finally { server.close(); rmSync(root, { recursive: true, force: true }) }
})

test('tidy: while paused it changes nothing', () => {
  const s = setup({ paused: [true], prs: prLines(['51', 'data-refresh/preowned-2026-11-16-1', 'h51', '', 'auto', 'u51'], ['52', 'data-refresh/agent-x', 'h52', '', 'owner', 'u52']), behind: { h52: 3 } })
  try {
    assert.equal(s.tidy('preowned').status, 0)
    const c = s.calls()
    assert.ok(!has(c, 'pr', 'close') && !has(c, 'pr', 'update-branch') && !has(c, 'workflow', 'run'))
    assert.equal(s.outputs().skip, 'no')
  } finally { s.done() }
})

test('tidy: a flagged PR of its own blocks the producer; nothing open means go', () => {
  const flagged = setup({ prs: prLines(['21', 'data-refresh/preowned-2026-11-16-1', 'h21', 'needs-owner-review', 'auto', 'u21']) })
  try {
    assert.equal(flagged.tidy('preowned').status, 0)
    assert.ok(!has(flagged.calls(), 'pr', 'close'))
    assert.equal(flagged.outputs().skip, 'yes')
  } finally { flagged.done() }
  const agentOnly = setup({ prs: prLines(['22', 'data-refresh/agent-2026-11-16-1', 'h22', '', 'owner', 'u22']) })
  try {
    assert.equal(agentOnly.tidy('watch').status, 0) // without --wait-for-agent
    assert.equal(agentOnly.outputs().skip, 'no')
  } finally { agentOnly.done() }
  const none = setup({})
  try {
    assert.equal(none.tidy('preowned').status, 0)
    assert.equal(none.outputs().skip, 'no')
  } finally { none.done() }
})
