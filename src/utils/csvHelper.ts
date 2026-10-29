/**
 * CSV Import/Export & Data Persistence Helpers
 * 100% interoperable with original glycemia-sheet format
 */

import {
  GlycemiaData,
  COLS_DEF,
  ColumnDef,
  ImportEntry,
  ImportPreviewResult,
  getColLabel,
} from '../types/glycemia';

export const STORAGE_KEY = 'glycemia_sheet_v1';

export function normalizeArabicNums(str: string): string {
  const arabicEastern = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str || '')
    .trim()
    .split('')
    .map((c) => {
      const idx = arabicEastern.indexOf(c);
      if (idx !== -1) return idx.toString();
      if (c === '،' || c === ',') return '.';
      return c;
    })
    .join('');
}

export function convertGlucoseValue(
  value: string,
  fromUnit: 'g/L' | 'mg/dL',
  toUnit: 'g/L' | 'mg/dL'
): string {
  if (!value || fromUnit === toUnit) return value;
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num)) return value;

  if (fromUnit === 'g/L' && toUnit === 'mg/dL') {
    // 1 g/L = 100 mg/dL (e.g. 1.15 g/L -> 115 mg/dL)
    const converted = Math.round(num * 100);
    return converted.toString();
  } else if (fromUnit === 'mg/dL' && toUnit === 'g/L') {
    // 100 mg/dL = 1.00 g/L (e.g. 115 mg/dL -> 1.15 g/L)
    const converted = (Math.round(num) / 100).toFixed(2);
    return converted;
  }
  return value;
}

export function exportCsv(data: GlycemiaData, days: string[]): void {
  const currentUnit = data.unit || 'g/L';
  const q = (s: any) => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
  const rows: string[][] = [
    ['Nom', 'Prénom', 'Age', 'Jour', 'Date', 'Repas', 'Mesure', 'Valeur', 'Unite', 'Note'],
  ];

  days.forEach((d, i) => {
    let count = 0;
    const dayNote = data[`d${i + 1}_note`] || '';
    COLS_DEF.forEach((c) => {
      const v = data[`d${i + 1}_${c.k}`];
      if (v) {
        count++;
        rows.push([
          data.nom || '',
          data.prenom || '',
          data.age || '',
          d,
          data[`date_${i + 1}`] || '',
          c.m,
          getColLabel(c, data),
          v,
          currentUnit,
          dayNote,
        ]);
      }
    });
    if (!count && (data[`date_${i + 1}`] || dayNote)) {
      rows.push([
        data.nom || '',
        data.prenom || '',
        data.age || '',
        d,
        data[`date_${i + 1}`] || '',
        '',
        '',
        '',
        currentUnit,
        dayNote,
      ]);
    }
  });

  if (rows.length === 1) {
    rows.push([
      data.nom || '',
      data.prenom || '',
      data.age || '',
      '',
      '',
      '',
      '',
      '',
      currentUnit,
      '',
    ]);
  }

  const csvContent =
    '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `glycemie_${data.nom || 'patient'}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

function parseCsv(t: string): string[][] {
  t = t.replace(/^\ufeff/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else {
          q = false;
        }
      } else {
        f += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(f);
      f = '';
      rows.push(row);
      row = [];
    } else {
      f += c;
    }
  }

  if (q) throw new Error('الملف تالف: علامة اقتباس غير مغلقة.');
  if (f !== '' || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

function nm(s: any): string {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/î/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ColMatch {
  col: ColumnDef;
  insulinChoice?: 'rapid' | 'mix';
  periodKey?: 'ins_b2' | 'ins_l1' | 'ins_d1';
}

function findCol(meal: string, mes: string): ColMatch | null {
  const m = nm(meal);
  const t = mes.trim().replace(/\s+/g, ' ');

  // Breakfast (petit déjeuner): b1, b2, b3
  if (m === 'petit dejeuner' || m === 'petit déjeuner') {
    if (t.includes('rapid')) {
      const col = COLS_DEF.find((c) => c.k === 'b2')!;
      return { col, insulinChoice: 'rapid', periodKey: 'ins_b2' };
    }
    if (t.toLowerCase().includes('mix')) {
      const col = COLS_DEF.find((c) => c.k === 'b2')!;
      return { col, insulinChoice: 'mix', periodKey: 'ins_b2' };
    }
  }

  // Lunch (déjeuner): l1, l2
  if (m === 'dejeuner' || m === 'déjeuner') {
    if (t.includes('rapid')) {
      const col = COLS_DEF.find((c) => c.k === 'l1')!;
      return { col, insulinChoice: 'rapid', periodKey: 'ins_l1' };
    }
    if (t.toLowerCase().includes('mix')) {
      const col = COLS_DEF.find((c) => c.k === 'l1')!;
      return { col, insulinChoice: 'mix', periodKey: 'ins_l1' };
    }
  }

  // Dinner (diner): d1, d2, d3
  if (m === 'diner' || m === 'dîner') {
    if (t.includes('glarus') || t.includes('tresiba')) {
      const col = COLS_DEF.find((c) => c.k === 'd3')!;
      return { col };
    }
    if (t.toLowerCase().includes('mix')) {
      const col = COLS_DEF.find((c) => c.k === 'd1')!;
      return { col, insulinChoice: 'mix', periodKey: 'ins_d1' };
    }
    if (t.includes('rapid')) {
      const col = COLS_DEF.find((c) => c.k === 'd1')!;
      return { col, insulinChoice: 'rapid', periodKey: 'ins_d1' };
    }
  }

  for (let k = 0; k < COLS_DEF.length; k++) {
    const c = COLS_DEF[k];
    if (c && nm(c.m) === m && c.t === t) return { col: c };
  }

  return null;
}

export function parseCsvImport(text: string, currentDays: string[]): ImportPreviewResult {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('الملف فارغ.');

  const hd = rows[0].map((x) => x.trim());
  const ix: Record<string, number> = {};
  hd.forEach((h, i) => {
    ix[h] = i;
  });

  const miss = ['Jour', 'Repas', 'Mesure', 'Valeur'].filter((h) => !(h in ix));
  if (miss.length) {
    throw new Error(
      'ملف غير متوافق: الأعمدة المطلوبة ناقصة (' +
        miss.join(', ') +
        '). يجب أن يكون الملف مصدراً من هذه الاستمارة.'
    );
  }

  const g = (r: string[], h: string) => (h in ix ? (r[ix[h]] || '').trim() : '');

  const unitHeaderKey = Object.keys(ix).find(
    (h) =>
      h.toLowerCase() === 'unite' ||
      h.toLowerCase() === 'unit' ||
      h.toLowerCase() === 'unité' ||
      h.toLowerCase() === 'الحدة' ||
      h.toLowerCase() === 'الوحدة'
  );
  const hasUnitColumn = unitHeaderKey !== undefined;
  let detectedUnit: 'g/L' | 'mg/dL' | null = null;

  if (hasUnitColumn) {
    for (let i = 1; i < rows.length; i++) {
      const uVal = g(rows[i], unitHeaderKey!).toLowerCase().trim();
      if (uVal.includes('mg')) {
        detectedUnit = 'mg/dL';
        break;
      } else if (uVal.includes('g')) {
        detectedUnit = 'g/L';
        break;
      }
    }
  }

  const noteHeaderKey = Object.keys(ix).find(
    (h) =>
      h.toLowerCase() === 'note' ||
      h.toLowerCase() === 'notes' ||
      h.toLowerCase() === 'ملاحظة' ||
      h.toLowerCase() === 'ملاحظات'
  );

  const res: { ent: ImportEntry[]; warn: string[] } = { ent: [], warn: [] };
  const ident: Record<string, string> = {};
  const dates: Record<number, string> = {};
  const notes: Record<number, string> = {};
  const seen: Record<string, string> = {};

  const daysLower = currentDays.map((d) => d.toLowerCase());

  const detectedInsulins: {
    ins_b2?: 'rapid' | 'mix';
    ins_l1?: 'rapid' | 'mix';
    ins_d1?: 'rapid' | 'mix';
  } = {};

  rows.slice(1).forEach((r, k) => {
    const L = `سطر ${k + 2}: `;
    const rawDay = g(r, 'Jour').replace(/\s+/g, ' ');
    const day = rawDay.toLowerCase();
    let di = daysLower.indexOf(day);

    if (di < 0) {
      // try matching 'jour X', 'اليوم X', 'day X', or bare number
      const m =
        day.match(/jour\s*(\d+)/i) ||
        day.match(/اليوم\s*(\d+)/i) ||
        day.match(/day\s*(\d+)/i) ||
        day.match(/^(\d+)$/);
      if (m) {
        di = parseInt(m[1], 10) - 1;
      }
    }

    if (di < 0) {
      res.warn.push(L + `يوم غير معروف «${g(r, 'Jour')}».`);
      return;
    }

    [
      ['Nom', 'nom'],
      ['Prénom', 'prenom'],
      ['Age', 'age'],
    ].forEach(([col, key]) => {
      const v = g(r, col);
      if (!v) return;
      if (ident[key] === undefined) ident[key] = v;
      else if (ident[key] !== v)
        res.warn.push(L + `قيمة مختلفة للحقل ${col} (تم اعتماد الأولى).`);
    });

    const d = g(r, 'Date');
    if (d) {
      if (!/^\d{4}-\d\d-\d\d$/.test(d)) {
        res.warn.push(L + `تاريخ بصيغة غير مدعومة «${d}» (تم تجاهله).`);
      } else if (dates[di] === undefined) {
        dates[di] = d;
      } else if (dates[di] !== d) {
        res.warn.push(L + `تاريخان مختلفان لنفس اليوم (تم اعتماد الأول).`);
      }
    }

    if (noteHeaderKey) {
      const n = g(r, noteHeaderKey);
      if (n && notes[di] === undefined) {
        notes[di] = n;
      }
    }

    const meal = g(r, 'Repas');
    const mes = g(r, 'Mesure');
    const v = g(r, 'Valeur');
    if (!meal && !mes && !v) return;

    const match = findCol(meal, mes);
    if (!match) {
      res.warn.push(L + `خانة غير معروفة («${meal}» / «${mes}»).`);
      return;
    }
    const c = match.col;
    if (match.periodKey && match.insulinChoice) {
      if (!detectedInsulins[match.periodKey]) {
        detectedInsulins[match.periodKey] = match.insulinChoice;
      }
    }

    if (!v) return;

    const cleanV = normalizeArabicNums(v);
    if (!/^[0-9.,]+$/.test(cleanV)) {
      res.warn.push(L + `قيمة غير رقمية «${v}» (تم تجاهلها).`);
      return;
    }

    const id = `d${di + 1}_${c.k}`;
    if (id in seen) {
      if (seen[id] !== cleanV) {
        res.warn.push(L + `قيمتان لنفس الخانة (تم اعتماد الأولى).`);
      }
      return;
    }
    seen[id] = cleanV;
    res.ent.push({
      id,
      day: currentDays[di] || `Jour ${di + 1}`,
      meal: c.mealAr + ' (' + c.m + ')',
      mes: c.t,
      v: cleanV,
      di,
      isGlucose: c.type === 'glucose',
    });
  });

  const topEnts: ImportEntry[] = [];
  [
    ['nom', 'اللقب (Nom)'],
    ['prenom', 'الاسم (Prénom)'],
    ['age', 'العمر (Age)'],
  ].forEach(([k, label]) => {
    if (ident[k]) {
      topEnts.push({
        id: k,
        day: '—',
        meal: '—',
        mes: label,
        v: ident[k],
        di: -1,
        isGlucose: false,
      });
    }
  });

  Object.keys(dates)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((k) => {
      const di = +k;
      topEnts.push({
        id: `date_${di + 1}`,
        day: currentDays[di] || `Jour ${di + 1}`,
        meal: '—',
        mes: 'التاريخ (Date)',
        v: dates[di],
        di,
        isGlucose: false,
      });
    });

  Object.keys(notes)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((k) => {
      const di = +k;
      topEnts.push({
        id: `d${di + 1}_note`,
        day: currentDays[di] || `Jour ${di + 1}`,
        meal: '—',
        mes: 'الملاحظة (Note)',
        v: notes[di],
        di,
        isGlucose: false,
      });
    });

  const insLabels: Record<'ins_b2' | 'ins_l1' | 'ins_d1', string> = {
    ins_b2: 'نوع الإنسولين (الصباح)',
    ins_l1: 'نوع الإنسولين (الغداء)',
    ins_d1: 'نوع الإنسولين (العشاء)',
  };

  (['ins_b2', 'ins_l1', 'ins_d1'] as const).forEach((key) => {
    if (detectedInsulins[key]) {
      topEnts.push({
        id: key,
        day: '—',
        meal: '—',
        mes: insLabels[key],
        v: detectedInsulins[key]!,
        di: -1,
        isGlucose: false,
      });
    }
  });

  res.ent = topEnts.concat(res.ent);
  if (!res.ent.length) {
    throw new Error('لا توجد بيانات صالحة للاستيراد في هذا الملف.');
  }
  return {
    ent: res.ent,
    warn: res.warn,
    hasUnitColumn,
    detectedUnit,
  };
}

export function loadSampleDemoData(): GlycemiaData {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const d1 = new Date(today);
  d1.setDate(today.getDate() - 3);
  const d2 = new Date(today);
  d2.setDate(today.getDate() - 2);
  const d3 = new Date(today);
  d3.setDate(today.getDate() - 1);
  const d4 = new Date(today);

  return {
    nom: 'بن علي',
    prenom: 'محمد',
    age: '54',
    diabetesType: 'type2',
    doctor: 'د. سمير حمداوي',
    unit: 'g/L',
    daysCount: 4,
    date_1: fmt(d1),
    date_2: fmt(d2),
    date_3: fmt(d3),
    date_4: fmt(d4),
    // Day notes
    d1_note: 'مشي صباحي 30 دقيقة',
    d2_note: 'وعكة صحية خفيفة',
    d3_note: 'وجبة عشاء خفيفة',
    d4_note: '',
    // Day 1
    d1_b1: '1.18',
    d1_b2: '12',
    d1_b3: '1.45',
    d1_l1: '14',
    d1_l2: '1.60',
    d1_d1: '10',
    d1_d2: '1.38',
    d1_d3: '22',
    // Day 2
    d2_b1: '1.05',
    d2_b2: '12',
    d2_b3: '1.35',
    d2_l1: '14',
    d2_l2: '1.52',
    d2_d1: '10',
    d2_d2: '1.42',
    d2_d3: '22',
    // Day 3
    d3_b1: '1.25',
    d3_b2: '14',
    d3_b3: '1.58',
    d3_l1: '14',
    d3_l2: '1.70',
    d3_d1: '12',
    d3_d2: '1.50',
    d3_d3: '24',
    // Day 4
    d4_b1: '0.98',
    d4_b2: '12',
    d4_b3: '1.30',
    d4_l1: '12',
    d4_l2: '1.40',
    d4_d1: '10',
    d4_d2: '1.32',
    d4_d3: '22',
  };
}
