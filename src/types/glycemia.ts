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
  [key: string]: any;
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

export function getColLabel(col: ColumnDef, data: GlycemiaData): string {
  if (col.k === 'b2' || col.k === 'l1' || col.k === 'd1') {
    return 'كمية الانسلين ' + insulinName(getInsulinChoice(data, col.k));
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
