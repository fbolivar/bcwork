// Genera un MSI por-tenant horneando el token en el placeholder (ANTES de firmar).
// Uso: node make-tenant-msi.mjs <templateMsi> <outMsi>
// Imprime JSON con { token_hash, token_prefix } (el token en claro NUNCA se persiste;
// queda solo dentro del MSI). El hash se inserta en agent_provisioning_tokens.
import { readFileSync, writeFileSync } from 'fs'
import { randomBytes, createHash } from 'crypto'

const PLACEHOLDER = 'BCWORK_TENANT_TOKEN_PLACEHOLDER_00000000000000000000000000000000' // 64
const [, , templatePath, outPath] = process.argv
if (!templatePath || !outPath) {
  console.error('uso: node make-tenant-msi.mjs <templateMsi> <outMsi>')
  process.exit(1)
}

const token = randomBytes(32).toString('hex') // 64 chars, == placeholder len
const base = readFileSync(templatePath)
const out = Buffer.from(base)

let idx = out.indexOf(Buffer.from(PLACEHOLDER, 'ascii'))
let n = 0
while (idx !== -1) {
  Buffer.from(token, 'ascii').copy(out, idx)
  n++
  idx = out.indexOf(Buffer.from(PLACEHOLDER, 'ascii'), idx + PLACEHOLDER.length)
}
if (n !== 1) {
  console.error(`placeholder encontrado ${n} veces (se esperaba 1)`)
  process.exit(2)
}
if (out.length !== base.length) {
  console.error('tamaño cambió tras el patch')
  process.exit(3)
}
writeFileSync(outPath, out)

const token_hash = createHash('sha256').update(token).digest('hex')
console.log(JSON.stringify({ token_hash, token_prefix: token.slice(0, 8), out: outPath }))
