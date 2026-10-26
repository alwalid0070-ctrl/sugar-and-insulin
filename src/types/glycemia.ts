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
  daysCount?: number;
  [key: string]: any;
}

export interface ImportEntry {
  id: string;
  day: string;
  meal: string;
  mes: string;
  v: string;
  di: number;
}

export interface ImportPreviewResult {
  ent: ImportEntry[];
  warn: string[];
}
