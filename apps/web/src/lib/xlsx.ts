/**
 * Generador minimo de archivos .xlsx, sin dependencias.
 *
 * El CSV se rompia con los informes: Excel en espanol usa `;` como separador de
 * lista y coma decimal, asi que un CSV con comas quedaba todo en una columna y
 * los decimales se leian como texto. Ademas, sin BOM, las tildes salian
 * corruptas. Parchar el CSV arregla las tildes pero no el resto, porque el
 * problema de fondo es que un CSV no tiene tipos: 54,8 puede ser un numero o
 * dos columnas segun la configuracion regional de quien abre el archivo.
 *
 * Un .xlsx si tiene tipos. Es un ZIP con unos XML dentro; el unico obstaculo
 * era necesitar un compresor, y no hace falta: el formato ZIP admite entradas
 * sin comprimir (metodo 0/store), que son unos cien renglones de cabeceras y un
 * CRC32. Sale mas barato que arrastrar una libreria de ~900 KB al bundle.
 */

export type CellValue = string | number | null | undefined

export interface Sheet {
  name: string
  /** Primera fila: encabezados (se marcan en negrita). */
  header: string[]
  rows: CellValue[][]
}

// ── ZIP (metodo store) ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface Entry {
  name: string
  data: Uint8Array<ArrayBuffer>
}

/**
 * TextEncoder devuelve Uint8Array<ArrayBufferLike>, que Blob no acepta en el
 * tipado de TS 5.7. El buffer siempre es un ArrayBuffer normal recien creado,
 * asi que se reetiqueta sin copiar.
 */
function bytes(texto: string): Uint8Array<ArrayBuffer> {
  const u = new TextEncoder().encode(texto)
  return new Uint8Array(u.buffer as ArrayBuffer, u.byteOffset, u.byteLength)
}

function zip(entries: Entry[]): Blob {
  const locals: Uint8Array<ArrayBuffer>[] = []
  const centrals: Uint8Array<ArrayBuffer>[] = []
  let offset = 0

  // Fecha fija: el contenido del informe no depende de cuando se genero el ZIP,
  // y una marca fija hace el archivo reproducible.
  const dosTime = 0
  const dosDate = (2020 - 1980) * 512 + 1 * 32 + 1

  for (const e of entries) {
    const nameBytes = bytes(e.name)
    const crc = crc32(e.data)

    const localBuf = new ArrayBuffer(30)
    const local = new DataView(localBuf)
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nombres en UTF-8
    local.setUint16(8, 0, true) // sin compresion
    local.setUint16(10, dosTime, true)
    local.setUint16(12, dosDate, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, e.data.length, true)
    local.setUint32(22, e.data.length, true)
    local.setUint16(26, nameBytes.length, true)
    local.setUint16(28, 0, true)
    locals.push(new Uint8Array(localBuf), nameBytes, e.data)

    const centralBuf = new ArrayBuffer(46)
    const central = new DataView(centralBuf)
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true)
    central.setUint16(6, 20, true)
    central.setUint16(8, 0x0800, true)
    central.setUint16(10, 0, true)
    central.setUint16(12, dosTime, true)
    central.setUint16(14, dosDate, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, e.data.length, true)
    central.setUint32(24, e.data.length, true)
    central.setUint16(28, nameBytes.length, true)
    central.setUint32(42, offset, true)
    centrals.push(new Uint8Array(centralBuf), nameBytes)

    offset += 30 + nameBytes.length + e.data.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocdBuf = new ArrayBuffer(22)
  const eocd = new DataView(eocdBuf)
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(8, entries.length, true)
  eocd.setUint16(10, entries.length, true)
  eocd.setUint32(12, centralSize, true)
  eocd.setUint32(16, offset, true)

  return new Blob([...locals, ...centrals, new Uint8Array(eocdBuf)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ── XML de la hoja ──────────────────────────────────────────────────────────

function esc(s: string) {
  return (
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      // Excel rechaza el archivo si aparece un caracter de control.
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  )
}

function colName(i: number) {
  let s = ''
  let n = i
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

function cell(ref: string, v: CellValue, bold: boolean) {
  const style = bold ? ' s="1"' : ''
  if (v == null || v === '') return `<c r="${ref}"${style}/>`
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<c r="${ref}"${style}><v>${v}</v></c>`
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
}

function sheetXml(sheet: Sheet) {
  const filas: string[] = []
  const todas: CellValue[][] = [sheet.header, ...sheet.rows]
  todas.forEach((row, r) => {
    const celdas = row.map((v, c) => cell(`${colName(c)}${r + 1}`, v, r === 0)).join('')
    filas.push(`<row r="${r + 1}">${celdas}</row>`)
  })
  // Anchos generosos: los nombres de persona y departamento se cortaban.
  const anchos = sheet.header
    .map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(h.length + 4, 14)}"/>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${anchos}</cols><sheetData>${filas.join('')}</sheetData></worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`

/** Excel no acepta : \\ / ? * [ ] en el nombre de una hoja, ni mas de 31 caracteres. */
function nombreHoja(n: string) {
  return n.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || 'Hoja'
}

export function buildXlsx(sheets: Sheet[]): Blob {
  const hojas = sheets.length ? sheets : [{ name: 'Hoja1', header: [], rows: [] }]

  const overrides = hojas
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')

  const entries: Entry[] = [
    {
      name: '[Content_Types].xml',
      data: bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`),
    },
    {
      name: '_rels/.rels',
      data: bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    },
    {
      name: 'xl/workbook.xml',
      data: bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas
        .map(
          (s, i) =>
            `<sheet name="${esc(nombreHoja(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
        )
        .join('')}</sheets></workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: bytes(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join(
          '',
        )}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    },
    { name: 'xl/styles.xml', data: bytes(STYLES) },
    ...hojas.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: bytes(sheetXml(s)),
    })),
  ]

  return zip(entries)
}

export function downloadXlsx(sheets: Sheet[], filename: string) {
  const blob = buildXlsx(sheets)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
