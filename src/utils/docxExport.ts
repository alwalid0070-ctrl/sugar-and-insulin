/**
 * DOCX Word Export utility (pure client-side, zero external library dependency)
 * Faithful recreation and enhancement of the original glycemia-sheet Word generator.
 */

import { GlycemiaData, COLS_DEF, getColLabel } from '../types/glycemia';

function ar(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

function escapeXml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtD(v: string): string {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v || '';
}

function para(s: string, sz: number = 16, jc: string = 'center', bold: boolean = false): string {
  if (!s) return '<w:p><w:pPr><w:jc w:val="' + (jc || 'center') + '"/></w:pPr></w:p>';
  const a = ar(s);
  return (
    '<w:p><w:pPr>' +
    (a ? '<w:bidi/>' : '') +
    '<w:jc w:val="' +
    (jc || 'center') +
    '"/></w:pPr><w:r><w:rPr><w:sz w:val="' +
    sz +
    '"/>' +
    (a ? '<w:rtl/><w:szCs w:val="' + sz + '"/>' : '') +
    (bold ? '<w:b/><w:bCs/>' : '') +
    '</w:rPr><w:t xml:space="preserve">' +
    escapeXml(s) +
    '</w:t></w:r></w:p>'
  );
}

function tc(
  w: number,
  txt: string,
  o: { span?: number; vm?: string; sz?: number; jc?: string; bold?: boolean; vAlign?: string } = {}
): string {
  return (
    '<w:tc><w:tcPr><w:tcW w:w="' +
    w +
    '" w:type="dxa"/>' +
    (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : '') +
    (o.vm ? '<w:vMerge' + (o.vm === 'r' ? ' w:val="restart"' : '') + '/>' : '') +
    (o.vAlign ? '<w:vAlign w:val="' + o.vAlign + '"/>' : '') +
    '</w:tcPr>' +
    para(txt, o.sz || 16, o.jc, o.bold) +
    '</w:tc>'
  );
}

function tr(h: number, cells: string): string {
  return (
    '<w:tr><w:trPr><w:trHeight w:val="' +
    h +
    '" w:hRule="atLeast"/></w:trPr>' +
    cells +
    '</w:tr>'
  );
}

function buildDocxXml(data: GlycemiaData, days: string[]): string {
  const W = [1050, 900, 1000, 1000, 120, 1000, 1000, 1000, 1000, 1100];
  const cols = [
    COLS_DEF[0],
    COLS_DEF[1],
    COLS_DEF[2],
    null,
    COLS_DEF[3],
    COLS_DEF[4],
    COLS_DEF[5],
    COLS_DEF[6],
    COLS_DEF[7],
  ];

  // Header top row (الصباح, الغداء, العشاء)
  let rows = tr(
    900,
    tc(W[0], '', { vm: 'r' }) +
      tc(W[1] + W[2] + W[3], 'الصباح petit déjeuner', { span: 3, sz: 20 }) +
      tc(W[4], '') +
      tc(W[5] + W[6], 'الغذاء: déjeuner', { span: 2, sz: 20 }) +
      tc(W[7] + W[8] + W[9], 'العشاء: diner', { span: 3, sz: 20 })
  );

  // Sub headers
  let hc = tc(W[0], '', { vm: 'c' });
  cols.forEach((c, j) => {
    const label = c ? getColLabel(c, data) : '';
    hc += c ? tc(W[j + 1], label, { sz: 15 }) : tc(W[j + 1], '');
  });
  rows += tr(1900, hc);

  // Day rows
  days.forEach((d, di) => {
    const dateVal = fmtD(data[`date_${di + 1}`]);
    const dayNote = data[`d${di + 1}_note`] || '';
    let dayCellContent = para(d, 18, 'left') + para(dateVal, 15, 'left');
    if (dayNote) {
      dayCellContent += para('Note: ' + dayNote, 13, 'left');
    }
    let r = tc(W[0], '', { jc: 'left', vAlign: 'center' }).replace(
      '</w:tc>',
      dayCellContent + '</w:tc>'
    );
    cols.forEach((c, j) => {
      const val = c ? data[`d${di + 1}_${c.k}`] || '' : '';
      r += c
        ? tc(W[j + 1], val, { sz: 44, jc: 'center', vAlign: 'center', bold: true })
        : tc(W[j + 1], '', { vAlign: 'center' });
    });
    rows += tr(1500, r);
  });

  const b =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((n) => `<w:${n} w:val="single" w:sz="8" w:color="222222"/>`)
      .join('') +
    '</w:tblBorders>';

  const totalWidth = W.reduce((a, b) => a + b, 0);
  const tbl =
    '<w:tbl><w:tblPr><w:tblW w:w="' +
    totalWidth +
    '" w:type="dxa"/>' +
    b +
    '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' +
    W.map((w) => `<w:gridCol w:w="${w}"/>`).join('') +
    '</w:tblGrid>' +
    rows +
    '</w:tbl>';

  let notesBlock = '';
  const daysWithNotes = days
    .map((d, di) => ({ day: d, note: data[`d${di + 1}_note`] }))
    .filter((x) => Boolean(x.note));
  if (daysWithNotes.length > 0) {
    notesBlock += para('Remarques journalières / ملاحظات الأيام :', 18, 'right');
    daysWithNotes.forEach((x) => {
      notesBlock += para(`${x.day}: ${x.note}`, 16, 'right');
    });
    notesBlock += para('', 16);
  }

  const idp = para(
    'Nom : ' +
      (data.nom || '') +
      '          Prénom : ' +
      (data.prenom || '') +
      '          Age : ' +
      (data.age || ''),
    22,
    'left'
  );

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    tbl +
    para('', 22) +
    notesBlock +
    idp +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="500" w:bottom="900" w:left="500" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>'
  );
}

let CRC_TABLE: number[] | null = null;
function crc(b: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) {
    c = CRC_TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipFiles(files: [string, string][]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const cen: Uint8Array[] = [];
  let off = 0;

  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  const u32 = (v: number) => [
    v & 255,
    (v >>> 8) & 255,
    (v >>> 16) & 255,
    (v >>> 24) & 255,
  ];

  files.forEach(([filename, content]) => {
    const nm = enc.encode(filename);
    const d = enc.encode(content);
    const c = crc(d);

    const lh = ([] as number[]).concat(
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0x21),
      u32(c),
      u32(d.length),
      u32(d.length),
      u16(nm.length),
      u16(0)
    );
    parts.push(new Uint8Array(lh), nm, d);

    const ch = ([] as number[]).concat(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0x21),
      u32(c),
      u32(d.length),
      u32(d.length),
      u16(nm.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(off)
    );
    cen.push(new Uint8Array(ch), nm);
    off += lh.length + nm.length + d.length;
  });

  const cs = off;
  let cenLen = 0;
  cen.forEach((c) => {
    parts.push(c);
    cenLen += c.length;
  });

  const eocd = ([] as number[]).concat(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(cenLen),
    u32(cs),
    u16(0)
  );
  parts.push(new Uint8Array(eocd));

  return new Blob(parts as any, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function downloadDocx(data: GlycemiaData, days: string[]): void {
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const blob = zipFiles([
    [
      '[Content_Types].xml',
      H +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ],
    [
      '_rels/.rels',
      H +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ],
    ['word/document.xml', buildDocxXml(data, days)],
  ]);

  const patientName = `${data.nom || ''}_${data.prenom || ''}`.trim() || 'glycemie';
  const filename = `glycemie_${patientName}.docx`.replace(/[\s/\\?%*:|"<>]/g, '_');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
