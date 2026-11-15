/** Read one file out of a zip archive (stored or deflated). No dependencies. */
import { inflateRawSync } from 'node:zlib'

export function unzipFirst(buf, wantedName) {
  // End-of-central-directory record: scan backwards for its signature.
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip archive')
  let p = buf.readUInt32LE(eocd + 16)
  const count = buf.readUInt16LE(eocd + 10)
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip directory')
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf-8', p + 46, p + 46 + nameLen)
    if (!wantedName || name === wantedName) {
      const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28)
      const raw = buf.subarray(dataStart, dataStart + compressedSize)
      if (method === 0) return raw
      if (method === 8) return inflateRawSync(raw)
      throw new Error(`unsupported zip compression method ${method}`)
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error(`file not found in zip: ${wantedName}`)
}
