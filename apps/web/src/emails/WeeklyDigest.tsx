import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface DigestUser {
  full_name: string | null
  email: string
  total_active_seconds: number
  total_productive_secs: number
  avg_productivity: number
  days_active: number
  total_overtime_secs: number
}

interface WeeklyDigestProps {
  tenantName: string
  fromDate: string
  toDate: string
  users: DigestUser[]
  recipientName: string
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function WeeklyDigest({
  tenantName,
  fromDate,
  toDate,
  users,
  recipientName,
}: WeeklyDigestProps) {
  const totalActive = users.reduce((s, u) => s + u.total_active_seconds, 0)
  const avgProd =
    users.length > 0
      ? Math.round((users.reduce((s, u) => s + u.avg_productivity, 0) / users.length) * 100)
      : 0

  return (
    <Html lang="es">
      <Head />
      <Preview>
        Resumen semanal BCWork — {tenantName} ({fromDate} al {toDate})
      </Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container
          style={{
            maxWidth: 600,
            margin: '32px auto',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section style={{ backgroundColor: '#2563eb', padding: '28px 32px' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: 22, fontWeight: 700 }}>
              BCWork · Resumen semanal
            </Heading>
            <Text style={{ color: '#bfdbfe', margin: '6px 0 0', fontSize: 14 }}>
              {tenantName} · {fromDate} al {toDate}
            </Text>
          </Section>

          {/* Saludo */}
          <Section style={{ padding: '24px 32px 0' }}>
            <Text style={{ fontSize: 15, color: '#374151', margin: 0 }}>
              Hola <strong>{recipientName}</strong>, aquí está el resumen de actividad de tu equipo:
            </Text>
          </Section>

          {/* KPIs globales */}
          <Section style={{ padding: '20px 32px' }}>
            <Row>
              <Column
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  backgroundColor: '#eff6ff',
                  borderRadius: 8,
                  margin: '0 4px',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8', margin: 0 }}>
                  {fmtHours(totalActive)}
                </Text>
                <Text style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                  Tiempo activo total
                </Text>
              </Column>
              <Column
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 8,
                  margin: '0 4px',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: 700, color: '#15803d', margin: 0 }}>
                  {avgProd}%
                </Text>
                <Text style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                  Productividad media
                </Text>
              </Column>
              <Column
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  backgroundColor: '#faf5ff',
                  borderRadius: 8,
                  margin: '0 4px',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed', margin: 0 }}>
                  {users.length}
                </Text>
                <Text style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                  Empleados activos
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '0 32px' }} />

          {/* Tabla de empleados */}
          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
              Detalle por empleado
            </Text>
            {users.slice(0, 15).map((u) => {
              const pct = Math.round(u.avg_productivity * 100)
              const color = pct >= 70 ? '#15803d' : pct >= 40 ? '#b45309' : '#dc2626'
              return (
                <Row
                  key={u.email}
                  style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 8 }}
                >
                  <Column style={{ width: '40%' }}>
                    <Text style={{ fontSize: 13, color: '#111827', margin: 0 }}>
                      {u.full_name ?? u.email}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      {u.days_active} días activos
                    </Text>
                  </Column>
                  <Column style={{ width: '25%', textAlign: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#374151', margin: 0 }}>
                      {fmtHours(u.total_active_seconds)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      activo
                    </Text>
                  </Column>
                  <Column style={{ width: '20%', textAlign: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: 700, color, margin: 0 }}>{pct}%</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                      productividad
                    </Text>
                  </Column>
                  <Column style={{ width: '15%', textAlign: 'right' }}>
                    {u.total_overtime_secs > 1800 && (
                      <Text style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>
                        +{fmtHours(u.total_overtime_secs)} OT
                      </Text>
                    )}
                  </Column>
                </Row>
              )
            })}
          </Section>

          {/* Footer legal */}
          <Section
            style={{
              backgroundColor: '#f9fafb',
              padding: '16px 32px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <Text style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
              Este correo es generado automáticamente por BCWork. Los datos son confidenciales y
              están protegidos bajo la Ley 1581/2012 (HABEAS DATA). El monitoreo cumple con la Ley
              2121/2021 (Trabajo Remoto) y la Ley 2191/2022 (Desconexión Digital).
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WeeklyDigest
