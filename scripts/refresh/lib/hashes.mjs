/**
 * Proposal hashes (build spec F.3 and I.1). Both are computed from git, between
 * two immutable revisions, so a check can prove that what was verified or
 * approved is exactly what is being published.
 *
 *   proposal_sha256: the canonical diff of the data files. Approvals bind to it.
 *   patch_sha256:    every changed file: change type, path, mode and content hash.
 *                    Proves the published patch is the verified patch (WP-I).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

/** Files whose changes are "data" (the diff validator judges them). */
export const DATA_FILES = [
  'lib/ev-data.json',
  'lib/ev-data.provenance.json',
  'scripts/refresh/accepted.json',
  'scripts/refresh/retired-ids.json',
]

const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

/** SHA-256 of the canonical unified diff of the data files between base and head. */
export function proposalSha256(repo, base, head) {
  const diff = git(repo, ['diff', '--no-color', '--no-ext-diff', '-U0', '--no-renames', base, head, '--', ...DATA_FILES])
  return sha256(diff.replace(/\r\n/g, '\n'))
}

/**
 * SHA-256 of a manifest of every changed file between base and head, sorted by
 * path: "<A|M|D> <path> <mode> <content sha256 or ->". Renames count as D + A.
 */
export function patchSha256(repo, base, head) {
  const raw = git(repo, ['diff', '--raw', '--no-renames', '-z', base, head])
  const parts = raw.split('\0').filter(Boolean)
  const entries = []
  for (let i = 0; i < parts.length; i += 2) {
    const meta = parts[i].replace(/^:/, '').split(' ') // srcMode dstMode srcSha dstSha status
    const status = meta[4][0]
    const path = parts[i + 1]
    if (status === 'D') entries.push(`D ${path} - -`)
    else {
      const content = execFileSync('git', ['-C', repo, 'cat-file', 'blob', `${head}:${path}`])
      entries.push(`${status === 'A' ? 'A' : 'M'} ${path} ${meta[1]} ${createHash('sha256').update(content).digest('hex')}`)
    }
  }
  entries.sort((a, b) => a.split(' ')[1].localeCompare(b.split(' ')[1]))
  return sha256(entries.join('\n'))
}

/** Paths changed between base and head. */
export function changedPaths(repo, base, head) {
  return git(repo, ['diff', '--name-only', '--no-renames', base, head]).split('\n').filter(Boolean)
}
