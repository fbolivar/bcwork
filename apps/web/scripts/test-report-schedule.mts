import { proximaEjecucion, parseCron, toCron, periodoDeEnvio } from '../src/server/report-schedule'

const CO = -300 // Colombia, UTC-5
let fallos = 0
function ok(nombre: string, real: unknown, esperado: unknown) {
  const bien = String(real) === String(esperado)
  if (!bien) fallos++
  console.log(`${bien ? 'ok  ' : 'FALLA'} ${nombre}: ${real}${bien ? '' : ` (esperado ${esperado})`}`)
}
// Muestra el instante UTC como hora local colombiana, que es como lo lee el usuario.
const local = (d: Date | null) =>
  d ? new Date(d.getTime() + CO * 60000).toISOString().replace('.000Z', '') : 'null'

// Diaria 07:00 local: si ya pasaron las 7, va para mañana.
ok(
  'diaria antes de la hora',
  local(proximaEjecucion('0 7 * * *', new Date('2026-09-07T10:00:00Z'), CO)), // 05:00 local
  '2026-09-07T07:00:00',
)
ok(
  'diaria despues de la hora',
  local(proximaEjecucion('0 7 * * *', new Date('2026-09-07T18:00:00Z'), CO)), // 13:00 local
  '2026-09-08T07:00:00',
)

// El 7 de septiembre de 2026 es lunes.
ok(
  'semanal lunes, ya paso hoy',
  local(proximaEjecucion('30 8 * * 1', new Date('2026-09-07T18:00:00Z'), CO)),
  '2026-09-14T08:30:00',
)
ok(
  'semanal lunes, aun no',
  local(proximaEjecucion('30 8 * * 1', new Date('2026-09-07T12:00:00Z'), CO)), // 07:00 local
  '2026-09-07T08:30:00',
)
ok(
  'semanal viernes desde lunes',
  local(proximaEjecucion('0 6 * * 5', new Date('2026-09-07T12:00:00Z'), CO)),
  '2026-09-11T06:00:00',
)

// Mensual: si el dia ya paso, salta de mes (incluido el salto a fin de ano).
ok(
  'mensual dia 5, ya paso',
  local(proximaEjecucion('0 6 5 * *', new Date('2026-09-07T12:00:00Z'), CO)),
  '2026-10-05T06:00:00',
)
ok(
  'mensual dia 5, aun no',
  local(proximaEjecucion('0 6 5 * *', new Date('2026-09-02T12:00:00Z'), CO)),
  '2026-09-05T06:00:00',
)
ok(
  'mensual en diciembre pasa a enero',
  local(proximaEjecucion('0 6 5 * *', new Date('2026-12-20T12:00:00Z'), CO)),
  '2027-01-05T06:00:00',
)

// Nunca devuelve un instante que no sea futuro.
const ahora = new Date('2026-09-07T12:00:00Z')
for (const c of ['0 7 * * *', '30 8 * * 1', '0 6 5 * *', '0 12 * * 0', '59 23 28 * *']) {
  const n = proximaEjecucion(c, ahora, CO)
  ok(`futuro estricto ${c}`, n !== null && n > ahora, true)
}

// Expresiones fuera del subconjunto: se rechazan, no se aproximan.
for (const c of ['*/5 * * * *', '0 7 * * 1-5', '0 7 1,15 * *', '0 7 L * *', 'basura', '0 7 * *']) {
  ok(`rechaza "${c}"`, parseCron(c), null)
}

// Ida y vuelta.
ok('cron ida y vuelta semanal', toCron(parseCron('30 8 * * 3')!), '30 8 * * 3')
ok('cron ida y vuelta mensual', toCron(parseCron('0 6 5 * *')!), '0 6 5 * *')

// El periodo siempre termina ayer.
ok(
  'periodo diario termina ayer',
  JSON.stringify(periodoDeEnvio('0 7 * * *', new Date('2026-09-07T12:00:00Z'))),
  JSON.stringify({ from: '2026-09-06T00:00:00.000Z', to: '2026-09-06T23:59:59.999Z' }),
)
ok(
  'periodo semanal cubre 7 dias',
  JSON.stringify(periodoDeEnvio('0 7 * * 1', new Date('2026-09-07T12:00:00Z'))),
  JSON.stringify({ from: '2026-08-31T00:00:00.000Z', to: '2026-09-06T23:59:59.999Z' }),
)

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLAS`)
process.exit(fallos === 0 ? 0 : 1)
