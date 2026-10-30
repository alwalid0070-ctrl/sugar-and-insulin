/**
 * Glycemia Tracking Types and Constants
 * Fully backwards-compatible with glycemia_sheet_v1
 */

export interface ColumnDef {
  k: 'b1' | 'b2' | 'b3' | 'l1' | 'l2' | 'd1' | 'd2' | 'd3';
  m: string; // 'petit déjeuner' | 'déjeuner' | 'diner'
  mealAr: string; // 'الصباح' | 'الغداء' | 'العشاء'
  t: string;
  shortAr: string;
  type: 'glucose' | 'insulin';
  insulinType?: 'rapid' | 'mix' | 'basal';
}

export const COLS_DEF: ColumnDef[] = [
  {
    k: 'b1',
    m: 'petit déjeuner',
    mealAr: 'الصباح',
    t: 'نسبة السكر قبل الاكل',
    shortAr: 'قبل الأكل (على الريق)',
    type: 'glucose',
  },
  {
    k: 'b2',
    m: 'petit déjeuner',
    mealAr: 'الصباح',
    t: 'كمية الانسلين NOVO rapid',
    shortAr: 'إنسولين سريع (NOVO rapid)',
    type: 'insulin',
    insulinType: 'rapid',
  },
  {
    k: 'b3',
    m: 'petit déjeuner',
    mealAr: 'الصباح',
    t: 'نسبة السكر بعد الاكل ب 2 ساعة',
    shortAr: 'بعد الأكل بساعتين',
    type: 'glucose',
  },
  {
    k: 'l1',
    m: 'déjeuner',
    mealAr: 'الغداء',
    t: 'كمية الانسلين NOVO rapid',
    shortAr: 'إنسولين سريع (NOVO rapid)',
    type: 'insulin',
    insulinType: 'rapid',
  },
  {
    k: 'l2',
    m: 'déjeuner',
    mealAr: 'الغداء',
    t: 'نسبة السكر بعد الاكل ب 2 ساعة',
    shortAr: 'بعد الأكل بساعتين',
    type: 'glucose',
  },
  {
    k: 'd1',
    m: 'diner',
    mealAr: 'العشاء',
    t: 'كمية الانسلين NOVO Mix',
    shortAr: 'إنسولين مختلط (NOVO Mix)',
    type: 'insulin',
    insulinType: 'mix',
  },
  {
    k: 'd2',
    m: 'diner',
    mealAr: 'العشاء',
    t: 'نسبة السكر بعد الاكل ب 2 ساعة',
    shortAr: 'بعد الأكل بساعتين',
    type: 'glucose',
  },
  {
    k: 'd3',
    m: 'diner',
    mealAr: 'العشاء',
    t: 'كمية الانسلين GLARUS / TRESIBA',
    shortAr: 'إنسولين قاعدي بطيء (GLARUS / TRESIBA)',
    type: 'insulin',
    insulinType: 'basal',
  },
];

export const LONG_ACTING_DRUGS = [
  'Tresiba',
  'Toujeo',
  'Lantus',
  'Glarus',
  'Glargine Frater',
] as const;

export const RAPID_DRUGS = [
  'Bio Rapid',
  'NovoRapid',
  'Humalog',
  'Apidra',
] as const;

export const MIXED_DRUGS = [
  'Bio Mix',
  'NovoMix 30',
  'Humalog Mix',
  'Mixtard 30',
] as const;

export type LongActingDrug = (typeof LONG_ACTING_DRUGS)[number];
export type RapidDrug = (typeof RAPID_DRUGS)[number];
export type MixedDrug = (typeof MIXED_DRUGS)[number];

export interface ExtraInsulinItem {
  id?: string;
  label: string;
  drug: string;
  drugOther?: string;
  slot?: 0 | 1 | 2 | 3; // 0: قبل الصباح, 1: بين الصباح والغداء, 2: بين الغداء والعشاء, 3: بعد العشاء
  order?: number;
}

export interface GlycemiaData {
  nom?: string;
  prenom?: string;
  age?: string;
  diabetesType?: string; // 'type1' | 'type2' | 'gestational' | ''
  doctor?: string;
  notes?: string;
  unit?: 'g/L' | 'mg/dL';
  targetMin?: number | string;
  targetMaxFasting?: number | string;
  targetMaxPost?: number | string;
  ins_b2?: 'rapid' | 'mix';
  ins_l1?: 'rapid' | 'mix';
  ins_d1?: 'rapid' | 'mix';
  drug_b2?: string;
  drug_l1?: string;
  drug_d1?: string;
  drug_d3?: string;
  drugOther_b2?: string;
  drugOther_l1?: string;
  drugOther_d1?: string;
  drugOther_d3?: string;
  periodLabel_b2?: string;
  periodLabel_l1?: string;
  periodLabel_d1?: string;
  insExtra?: ExtraInsulinItem[] | string;
  [key: string]: any;
}

export function getFixedPeriodLabel(
  data: GlycemiaData,
  k: 'b2' | 'l1' | 'd1'
): string {
  const custom = data[`periodLabel_${k}`];
  if (typeof custom === 'string' && custom.trim()) {
    return custom.trim().slice(0, 30);
  }
  if (k === 'b2') return 'الصباح';
  if (k === 'l1') return 'الغداء';
  if (k === 'd1') return 'العشاء';
  return '';
}

export function getExtraInsulin(data: GlycemiaData): ExtraInsulinItem[] {
  if (!data.insExtra) return [];
  let raw: any[] = [];
  if (Array.isArray(data.insExtra)) {
    raw = data.insExtra;
  } else if (typeof data.insExtra === 'string') {
    try {
      const parsed = JSON.parse(data.insExtra);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      raw = [];
    }
  }

  // Normalize: if slot is missing, default to 3 (بعد العشاء). If order is missing, default to index.
  const normalized: ExtraInsulinItem[] = raw
    .map((x, idx) => ({
      id: x.id || `extra_${idx}`,
      label: String(x.label || '').trim().slice(0, 30),
      drug: (x.drug || '').trim(),
      drugOther: x.drugOther ? String(x.drugOther).trim() : undefined,
      slot: (x.slot === 0 || x.slot === 1 || x.slot === 2 || x.slot === 3 ? x.slot : 3) as 0 | 1 | 2 | 3,
      order: typeof x.order === 'number' ? x.order : idx,
    }))
    .filter((x) => Boolean(x.label && x.drug));

  // Sort by slot (0, 1, 2, 3), then by order ascending
  return normalized.sort((a, b) => {
    if (a.slot !== b.slot) return (a.slot ?? 3) - (b.slot ?? 3);
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export function formatExtraInsulinLine(data: GlycemiaData): string | null {
  const items = getExtraInsulin(data);
  if (!items.length) return null;
  return 'إنسولين إضافي: ' + items.map((x) => `${x.drug} – ${x.label}`).join(' | ');
}

export function getInsulinChoice(data: GlycemiaData, k: 'b2' | 'l1' | 'd1'): 'rapid' | 'mix' {
  if (k === 'b2') return data.ins_b2 || 'rapid';
  if (k === 'l1') return data.ins_l1 || 'rapid';
  if (k === 'd1') return data.ins_d1 || 'mix';
  return 'rapid';
}

export function insulinName(choice: 'rapid' | 'mix'): 'NOVO rapid' | 'NOVO Mix' {
  return choice === 'mix' ? 'NOVO Mix' : 'NOVO rapid';
}

export function getDrugName(
  data: GlycemiaData,
  k: 'b2' | 'l1' | 'd1' | 'd3'
): string | null {
  const drug = data[`drug_${k}`];
  if (!drug || typeof drug !== 'string') return null;
  const trimmed = drug.trim();
  if (!trimmed) return null;
  if (trimmed === 'other') {
    const otherVal = data[`drugOther_${k}`];
    if (typeof otherVal === 'string' && otherVal.trim()) {
      return otherVal.trim();
    }
    return null;
  }
  return trimmed;
}

export function getInsulinDisplayName(
  data: GlycemiaData,
  k: 'b2' | 'l1' | 'd1' | 'd3'
): string {
  const customDrug = getDrugName(data, k);
  if (customDrug) return customDrug;
  if (k === 'd3') {
    return 'GLARUS / TRESIBA';
  }
  return insulinName(getInsulinChoice(data, k));
}

export function getColLabel(col: ColumnDef, data: GlycemiaData): string {
  if (col.k === 'b2' || col.k === 'l1' || col.k === 'd1' || col.k === 'd3') {
    return 'كمية الانسلين ' + getInsulinDisplayName(data, col.k);
  }
  return col.t;
}

export interface GlycemiaTargets {
  min: number;
  maxFasting: number;
  maxPost: number;
}

export const SEVERE_HYPO_ALERT =
  'قراءة منخفضة جدًا: اتبع تعليمات طبيبك للتعامل مع الهبوط، واطلب مساعدة طبية إذا لزم';

export function isSevereHypo(
  val: any,
  unit: 'g/L' | 'mg/dL' = 'g/L'
): boolean {
  if (val === undefined || val === null || val === '') return false;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n <= 0) return false;
  return unit === 'mg/dL' ? n < 54 : n < 0.54;
}

export function getTargets(data: GlycemiaData): GlycemiaTargets {
  const isGL = (data.unit || 'g/L') === 'g/L';
  const defaultMin = isGL ? 0.70 : 70;
  const defaultMaxFasting = isGL ? 1.30 : 130;
  const defaultMaxPost = isGL ? 1.80 : 180;

  const parseNum = (val: any, fallback: number) => {
    if (val === undefined || val === null || val === '') return fallback;
    const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    return isNaN(n) || n <= 0 ? fallback : n;
  };

  return {
    min: parseNum(data.targetMin, defaultMin),
    maxFasting: parseNum(data.targetMaxFasting, defaultMaxFasting),
    maxPost: parseNum(data.targetMaxPost, defaultMaxPost),
  };
}

export interface ImportEntry {
  id: string;
  day: string;
  meal: string;
  mes: string;
  v: string;
  di: number;
  isGlucose?: boolean;
}

export interface ImportPreviewResult {
  ent: ImportEntry[];
  warn: string[];
  hasUnitColumn: boolean;
  detectedUnit: 'g/L' | 'mg/dL' | null;
}
