import React from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Copy,
  Sun,
  Sunrise,
  Moon,
  ChevronLeft,
  ChevronRight,
  Syringe,
  Activity,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { GlycemiaData, COLS_DEF } from '../types/glycemia';
import { normalizeArabicNums } from '../utils/csvHelper';

interface MobileDayViewProps {
  data: GlycemiaData;
  days: string[];
  activeDayIndex: number;
  setActiveDayIndex: (index: number) => void;
  onUpdateValue: (id: string, value: string) => void;
  onAddDay: () => void;
  onRemoveDay: (index: number) => void;
  onCopyPreviousInsulin: (dayIndex: number) => void;
}

export const MobileDayView: React.FC<MobileDayViewProps> = ({
  data,
  days,
  activeDayIndex,
  setActiveDayIndex,
  onUpdateValue,
  onAddDay,
  onRemoveDay,
  onCopyPreviousInsulin,
}) => {
  const currentUnit = data.unit || 'g/L';
  const dayNumber = activeDayIndex + 1;
  const currentDateKey = `date_${dayNumber}`;
  const currentDateVal = data[currentDateKey] || '';

  // Evaluate blood sugar reading status
  const evaluateGlucose = (valStr: string, isFasting: boolean) => {
    if (!valStr) return null;
    const v = parseFloat(valStr.replace(',', '.'));
    if (isNaN(v)) return null;

    if (currentUnit === 'g/L') {
      if (v < 0.70) {
        return { status: 'hypo', label: 'انخفاض في السكر (هبوط)', color: 'amber' };
      }
      if (isFasting) {
        if (v <= 1.30) {
          return { status: 'target', label: 'مثالي على الريق (0.70 - 1.30)', color: 'emerald' };
        }
        return { status: 'hyper', label: 'مرتفع على الريق (> 1.30)', color: 'rose' };
      } else {
        if (v <= 1.80) {
          return { status: 'target', label: 'ضمن الهدف بعد الأكل (< 1.80)', color: 'emerald' };
        }
        return { status: 'hyper', label: 'مرتفع بعد الأكل (> 1.80)', color: 'rose' };
      }
    } else {
      // mg/dL
      if (v < 70) {
        return { status: 'hypo', label: 'انخفاض في السكر (< 70)', color: 'amber' };
      }
      if (isFasting) {
        if (v <= 130) {
          return { status: 'target', label: 'مثالي على الريق (70 - 130)', color: 'emerald' };
        }
        return { status: 'hyper', label: 'مرتفع على الريق (> 130)', color: 'rose' };
      } else {
        if (v <= 180) {
          return { status: 'target', label: 'ضمن الهدف بعد الأكل (< 180)', color: 'emerald' };
        }
        return { status: 'hyper', label: 'مرتفع بعد الأكل (> 180)', color: 'rose' };
      }
    }
  };

  // Helper for step adjustments
  const adjustValue = (id: string, delta: number, isDecimal: boolean) => {
    const cur = parseFloat((data[id] || '0').replace(',', '.'));
    const base = isNaN(cur) ? 0 : cur;
    let next = base + delta;
    if (next < 0) next = 0;
    const formatted = isDecimal ? (Math.round(next * 100) / 100).toFixed(2) : Math.round(next).toString();
    onUpdateValue(id, formatted);
  };

  // Calculate day summary metrics
  const dayValues = COLS_DEF.map((c) => ({
    ...c,
    value: data[`d${dayNumber}_${c.k}`] || '',
  }));

  const filledCount = dayValues.filter((v) => v.value.trim() !== '').length;
  const glucoseValues = dayValues
    .filter((v) => v.type === 'glucose' && v.value)
    .map((v) => parseFloat(v.value.replace(',', '.')))
    .filter((v) => !isNaN(v));

  const insulinValues = dayValues
    .filter((v) => v.type === 'insulin' && v.value)
    .map((v) => parseFloat(v.value.replace(',', '.')))
    .filter((v) => !isNaN(v));

  const totalInsulin = insulinValues.reduce((a, b) => a + b, 0);
  const avgGlucose =
    glucoseValues.length > 0
      ? (glucoseValues.reduce((a, b) => a + b, 0) / glucoseValues.length).toFixed(2)
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Day Selector Chips Carousel */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">اختر اليوم للمتابعة:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveDayIndex(Math.max(0, activeDayIndex - 1))}
              disabled={activeDayIndex === 0}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="اليوم السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium">
              {dayNumber} من {days.length}
            </span>
            <button
              onClick={() => setActiveDayIndex(Math.min(days.length - 1, activeDayIndex + 1))}
              disabled={activeDayIndex === days.length - 1}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="اليوم التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Days Horizontal Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((d, idx) => {
            const isSelected = idx === activeDayIndex;
            const dateStr = data[`date_${idx + 1}`];
            return (
              <button
                key={idx}
                onClick={() => setActiveDayIndex(idx)}
                className={`flex flex-col items-center justify-center py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[52px] min-w-[76px] ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>اليوم {idx + 1}</span>
                <span
                  className={`text-[10px] mt-0.5 ${
                    isSelected ? 'text-sky-100' : 'text-slate-500'
                  }`}
                >
                  {dateStr ? dateStr.slice(5) : d}
                </span>
              </button>
            );
          })}

          <button
            onClick={onAddDay}
            className="flex items-center justify-center gap-1 py-2 px-3.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap min-h-[52px]"
            title="إضافة يوم جديد للمتابعة"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة يوم</span>
          </button>
        </div>
      </div>

      {/* Active Day Header & Quick Date Settings */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex flex-col items-center justify-center font-bold">
            <span className="text-[10px] uppercase tracking-wider text-sky-600">JOUR</span>
            <span className="text-xl leading-none">{dayNumber}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                متابعة {days[activeDayIndex] || `اليوم ${dayNumber}`}
              </h2>
              {days.length > 1 && (
                <button
                  onClick={() => onRemoveDay(activeDayIndex)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                  title="حذف هذا اليوم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={currentDateVal}
                onChange={(e) => onUpdateValue(currentDateKey, e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Day Snapshot metrics */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {activeDayIndex > 0 && (
            <button
              onClick={() => onCopyPreviousInsulin(activeDayIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors border border-sky-100"
              title="نسخ نفس جرعات الإنسولين من اليوم السابق تلقائيًا"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ إنسولين الأمس</span>
            </button>
          )}

          <div className="text-left bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <div className="text-[11px] text-slate-500 font-medium">المدخلات</div>
            <div className="text-sm font-bold text-slate-800 tabular-nums">
              {filledCount}/8
            </div>
          </div>
        </div>
      </div>

      {/* MEAL 1: الصباح (Petit déjeuner) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-amber-50/70 border-b border-amber-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sunrise className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">الصباح</h3>
              <span className="text-[11px] text-slate-500">Petit déjeuner</span>
            </div>
          </div>
          <span className="text-xs text-amber-800 font-medium bg-amber-100/60 px-2 py-0.5 rounded-md">
            الفطور
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* b1: نسبة السكر قبل الأكل (على الريق) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>نسبة السكر قبل الأكل (على الريق)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {currentUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 1.15"
                  value={data[`d${dayNumber}_b1`] || ''}
                  onChange={(e) =>
                    onUpdateValue(`d${dayNumber}_b1`, normalizeArabicNums(e.target.value))
                  }
                  className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all tabular-nums bg-white"
                />
              </div>

              {/* Quick Stepper Buttons for Mobile */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_b1`,
                      currentUnit === 'g/L' ? -0.05 : -5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base transition-transform"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_b1`,
                      currentUnit === 'g/L' ? 0.05 : 5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base transition-transform"
                >
                  +
                </button>
              </div>
            </div>

            {/* Visual Medical Range Feedback */}
            {(() => {
              const res = evaluateGlucose(data[`d${dayNumber}_b1`], true);
              if (!res) return null;
              return (
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    res.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : res.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {res.color === 'emerald' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{res.label}</span>
                </div>
              );
            })()}
          </div>

          {/* b2: كمية الإنسولين NOVO rapid */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-amber-600" />
                <span>كمية الإنسولين NOVO rapid</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                إنسولين سريع
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={data[`d${dayNumber}_b2`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_b2`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_b2`, -1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_b2`, 1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* b3: نسبة السكر بعد الأكل بساعتين */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>نسبة السكر بعد الأكل بساعتين (+2h)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {currentUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="مثال: 1.40"
                value={data[`d${dayNumber}_b3`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_b3`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_b3`,
                      currentUnit === 'g/L' ? -0.05 : -5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_b3`,
                      currentUnit === 'g/L' ? 0.05 : 5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>

            {(() => {
              const res = evaluateGlucose(data[`d${dayNumber}_b3`], false);
              if (!res) return null;
              return (
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    res.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : res.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {res.color === 'emerald' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{res.label}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* MEAL 2: الغداء (Déjeuner) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-sky-50/70 border-b border-sky-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">الغداء</h3>
              <span className="text-[11px] text-slate-500">Déjeuner</span>
            </div>
          </div>
          <span className="text-xs text-sky-800 font-medium bg-sky-100/60 px-2 py-0.5 rounded-md">
            وجبة منتصف النهار
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* l1: كمية الإنسولين NOVO rapid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-amber-600" />
                <span>كمية الإنسولين NOVO rapid</span>
              </label>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                إنسولين سريع
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={data[`d${dayNumber}_l1`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_l1`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_l1`, -1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_l1`, 1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* l2: نسبة السكر بعد الأكل بساعتين */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>نسبة السكر بعد الأكل بساعتين (+2h)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {currentUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="مثال: 1.50"
                value={data[`d${dayNumber}_l2`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_l2`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_l2`,
                      currentUnit === 'g/L' ? -0.05 : -5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_l2`,
                      currentUnit === 'g/L' ? 0.05 : 5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>

            {(() => {
              const res = evaluateGlucose(data[`d${dayNumber}_l2`], false);
              if (!res) return null;
              return (
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    res.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : res.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {res.color === 'emerald' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{res.label}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* MEAL 3: العشاء (Diner) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">العشاء</h3>
              <span className="text-[11px] text-slate-500">Dîner</span>
            </div>
          </div>
          <span className="text-xs text-indigo-800 font-medium bg-indigo-100/60 px-2 py-0.5 rounded-md">
            المساء
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* d1: كمية الإنسولين NOVO Mix */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-purple-600" />
                <span>كمية الإنسولين NOVO Mix</span>
              </label>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                إنسولين مختلط
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={data[`d${dayNumber}_d1`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_d1`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_d1`, -1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_d1`, 1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* d2: نسبة السكر بعد الأكل بساعتين */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600" />
                <span>نسبة السكر بعد الأكل بساعتين (+2h)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {currentUnit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="مثال: 1.35"
                value={data[`d${dayNumber}_d2`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_d2`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_d2`,
                      currentUnit === 'g/L' ? -0.05 : -5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() =>
                    adjustValue(
                      `d${dayNumber}_d2`,
                      currentUnit === 'g/L' ? 0.05 : 5,
                      currentUnit === 'g/L'
                    )
                  }
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>

            {(() => {
              const res = evaluateGlucose(data[`d${dayNumber}_d2`], false);
              if (!res) return null;
              return (
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    res.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : res.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {res.color === 'emerald' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{res.label}</span>
                </div>
              );
            })()}
          </div>

          {/* d3: كمية الإنسولين GLARUS / TRESIBA (القاعدي) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-blue-600" />
                <span>كمية الإنسولين GLARUS / TRESIBA</span>
              </label>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                إنسولين قاعدي بطيء
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={data[`d${dayNumber}_d3`] || ''}
                onChange={(e) =>
                  onUpdateValue(`d${dayNumber}_d3`, normalizeArabicNums(e.target.value))
                }
                className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all tabular-nums bg-white"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_d3`, -1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => adjustValue(`d${dayNumber}_d3`, 1, false)}
                  className="w-10 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center text-base"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary Card */}
      <div className="bg-slate-100 rounded-2xl p-4 flex items-center justify-around text-center border border-slate-200">
        <div>
          <div className="text-[11px] text-slate-500 font-semibold">متوسط السكر لليوم</div>
          <div className="text-lg font-bold text-slate-800 tabular-nums mt-0.5">
            {avgGlucose ? `${avgGlucose} ${currentUnit}` : '—'}
          </div>
        </div>
        <div className="w-px h-8 bg-slate-300"></div>
        <div>
          <div className="text-[11px] text-slate-500 font-semibold">إجمالي الإنسولين</div>
          <div className="text-lg font-bold text-sky-700 tabular-nums mt-0.5">
            {totalInsulin > 0 ? `${totalInsulin} وحدة` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
