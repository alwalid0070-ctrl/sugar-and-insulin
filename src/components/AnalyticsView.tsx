import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Flame,
  Target,
  Sliders,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { GlycemiaData, getTargets } from '../types/glycemia';
import { normalizeArabicNums } from '../utils/csvHelper';

interface AnalyticsViewProps {
  data: GlycemiaData;
  days: string[];
  onChangeData?: (updates: Partial<GlycemiaData>) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  data,
  days,
  onChangeData,
}) => {
  const currentUnit = data.unit || 'g/L';
  const isGL = currentUnit === 'g/L';

  // Resolved active targets (user custom or defaults)
  const targets = getTargets(data);
  const targetMin = targets.min;
  const targetMaxFasting = targets.maxFasting;
  const targetMaxPost = targets.maxPost;

  const isCustomTargets =
    data.targetMin !== undefined ||
    data.targetMaxFasting !== undefined ||
    data.targetMaxPost !== undefined;

  // Target editing state
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [targetForm, setTargetForm] = useState({
    min: String(targetMin),
    maxFasting: String(targetMaxFasting),
    maxPost: String(targetMaxPost),
  });
  const [targetError, setTargetError] = useState<string | null>(null);
  const [targetSuccess, setTargetSuccess] = useState<string | null>(null);

  // Sync target form when targets or unit change
  useEffect(() => {
    setTargetForm({
      min: String(targetMin),
      maxFasting: String(targetMaxFasting),
      maxPost: String(targetMaxPost),
    });
  }, [targetMin, targetMaxFasting, targetMaxPost, currentUnit]);

  const handleStartEdit = () => {
    setTargetForm({
      min: String(targetMin),
      maxFasting: String(targetMaxFasting),
      maxPost: String(targetMaxPost),
    });
    setTargetError(null);
    setIsEditingTargets(true);
  };

  const handleCancelEdit = () => {
    setTargetForm({
      min: String(targetMin),
      maxFasting: String(targetMaxFasting),
      maxPost: String(targetMaxPost),
    });
    setTargetError(null);
    setIsEditingTargets(false);
  };

  const handleSaveTargets = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTargetError(null);

    const minRaw = targetForm.min.trim().replace(',', '.');
    const fastRaw = targetForm.maxFasting.trim().replace(',', '.');
    const postRaw = targetForm.maxPost.trim().replace(',', '.');

    if (!minRaw || !fastRaw || !postRaw) {
      setTargetError('يرجى ملء جميع خانات أهداف السكر.');
      return;
    }

    const minNum = parseFloat(minRaw);
    const fastNum = parseFloat(fastRaw);
    const postNum = parseFloat(postRaw);

    if (isNaN(minNum) || isNaN(fastNum) || isNaN(postNum)) {
      setTargetError('تحقق من أن القيم المدخلة أرقام صحيحة ومقبولة.');
      return;
    }

    if (minNum <= 0 || fastNum <= 0 || postNum <= 0) {
      setTargetError('يجب أن تكون جميع أهداف السكر أرقامًا موجبة أكبر من الصفر.');
      return;
    }

    if (minNum >= fastNum) {
      setTargetError('يجب أن تكون القيمة الدنيا أقل من أقصى قيمة على الريق.');
      return;
    }

    if (minNum >= postNum) {
      setTargetError('يجب أن تكون القيمة الدنيا أقل من أقصى قيمة بعد الأكل.');
      return;
    }

    if (onChangeData) {
      onChangeData({
        targetMin: minNum,
        targetMaxFasting: fastNum,
        targetMaxPost: postNum,
      });
    }

    setIsEditingTargets(false);
    setTargetSuccess('تم حفظ أهداف السكر بنجاح.');
    setTimeout(() => setTargetSuccess(null), 3500);
  };

  const handleResetDefaults = () => {
    const defaultMin = isGL ? 0.70 : 70;
    const defaultMaxFasting = isGL ? 1.30 : 130;
    const defaultMaxPost = isGL ? 1.80 : 180;

    setTargetForm({
      min: String(defaultMin),
      maxFasting: String(defaultMaxFasting),
      maxPost: String(defaultMaxPost),
    });

    if (onChangeData) {
      onChangeData({
        targetMin: undefined,
        targetMaxFasting: undefined,
        targetMaxPost: undefined,
      });
    }

    setIsEditingTargets(false);
    setTargetError(null);
    setTargetSuccess('تمت استعادة أهداف السكر الافتراضية.');
    setTimeout(() => setTargetSuccess(null), 3500);
  };

  // Extract all glucose readings
  const glucoseReadings: {
    val: number;
    dayIdx: number;
    dayLabel: string;
    type: 'fasting' | 'post';
    slot: string;
  }[] = [];

  const insulinTotalsByDay: {
    dayLabel: string;
    rapid: number;
    mix: number;
    basal: number;
    total: number;
  }[] = [];

  let calculatedDaysCount = 0;

  days.forEach((dayLabel, idx) => {
    const dayNum = idx + 1;

    // Glucose slots
    const b1Raw = data[`d${dayNum}_b1`];
    const b3Raw = data[`d${dayNum}_b3`];
    const l2Raw = data[`d${dayNum}_l2`];
    const d2Raw = data[`d${dayNum}_d2`];

    const b1 = parseFloat((b1Raw || '').replace(',', '.'));
    const b3 = parseFloat((b3Raw || '').replace(',', '.'));
    const l2 = parseFloat((l2Raw || '').replace(',', '.'));
    const d2 = parseFloat((d2Raw || '').replace(',', '.'));

    const hasGlucose = !isNaN(b1) || !isNaN(b3) || !isNaN(l2) || !isNaN(d2);

    if (!isNaN(b1))
      glucoseReadings.push({ val: b1, dayIdx: idx, dayLabel, type: 'fasting', slot: 'على الريق' });
    if (!isNaN(b3))
      glucoseReadings.push({ val: b3, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد الفطور' });
    if (!isNaN(l2))
      glucoseReadings.push({ val: l2, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد الغداء' });
    if (!isNaN(d2))
      glucoseReadings.push({ val: d2, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد العشاء' });

    // Insulin slots
    const b2Raw = data[`d${dayNum}_b2`];
    const l1Raw = data[`d${dayNum}_l1`];
    const d1Raw = data[`d${dayNum}_d1`];
    const d3Raw = data[`d${dayNum}_d3`];

    const b2 = parseFloat((b2Raw || '0').replace(',', '.')) || 0;
    const l1 = parseFloat((l1Raw || '0').replace(',', '.')) || 0;
    const d1 = parseFloat((d1Raw || '0').replace(',', '.')) || 0;
    const d3 = parseFloat((d3Raw || '0').replace(',', '.')) || 0;

    const rapid = b2 + l1;
    const mix = d1;
    const basal = d3;
    const dayTotalInsulin = rapid + mix + basal;

    const hasInsulin =
      dayTotalInsulin > 0 ||
      [b2Raw, l1Raw, d1Raw, d3Raw].some((raw) => {
        if (!raw || !raw.trim()) return false;
        const parsed = parseFloat(raw.replace(',', '.'));
        return !isNaN(parsed) && parsed > 0;
      });

    if (hasGlucose || hasInsulin) {
      calculatedDaysCount++;
    }

    insulinTotalsByDay.push({
      dayLabel,
      rapid,
      mix,
      basal,
      total: dayTotalInsulin,
    });
  });

  const totalReadings = glucoseReadings.length;
  const values = glucoseReadings.map((r) => r.val);

  // Targets evaluation
  const hypoCount = glucoseReadings.filter((r) => r.val < targetMin).length;
  const inRangeCount = glucoseReadings.filter((r) => {
    if (r.val < targetMin) return false;
    if (r.type === 'fasting') return r.val <= targetMaxFasting;
    return r.val <= targetMaxPost;
  }).length;
  const hyperCount = totalReadings - inRangeCount - hypoCount;

  const timeInRangePct = totalReadings > 0 ? Math.round((inRangeCount / totalReadings) * 100) : 0;
  const avgGlucose =
    totalReadings > 0 ? (values.reduce((a, b) => a + b, 0) / totalReadings).toFixed(2) : '—';
  const minGlucose = totalReadings > 0 ? Math.min(...values).toFixed(2) : '—';
  const maxGlucose = totalReadings > 0 ? Math.max(...values).toFixed(2) : '—';

  const fastingReadings = glucoseReadings.filter((r) => r.type === 'fasting');
  const avgFasting =
    fastingReadings.length > 0
      ? (fastingReadings.reduce((a, b) => a + b.val, 0) / fastingReadings.length).toFixed(2)
      : '—';

  const postReadings = glucoseReadings.filter((r) => r.type === 'post');
  const avgPost =
    postReadings.length > 0
      ? (postReadings.reduce((a, b) => a + b.val, 0) / postReadings.length).toFixed(2)
      : '—';

  // Total insulin overall
  const grandTotalInsulin = insulinTotalsByDay.reduce((a, b) => a + b.total, 0);
  const avgDailyInsulin: number | string =
    calculatedDaysCount > 0 && grandTotalInsulin > 0
      ? Math.round(grandTotalInsulin / calculatedDaysCount)
      : '—';

  // SVG Chart Dimensions & plotting
  const chartHeight = 220;
  const chartWidth = 600;
  const paddingX = 40;
  const paddingY = 30;

  const minChartVal = Math.max(0, Math.min(isGL ? 0.4 : 40, targetMin * 0.7, ...values));
  const maxChartVal = Math.max(isGL ? 2.5 : 250, targetMaxPost * 1.25, ...values);

  const getY = (val: number) => {
    const ratio = (val - minChartVal) / (maxChartVal - minChartVal || 1);
    return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
  };

  const getX = (dayIdx: number, slotOffset: number) => {
    const dayWidth = (chartWidth - paddingX * 2) / Math.max(1, days.length - 1 || 1);
    const baseX = paddingX + dayIdx * dayWidth;
    return baseX + (slotOffset - 1.5) * (dayWidth * 0.18);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* Target Glycemia Settings Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  أهداف السكر (بحسب توجيه الطبيب)
                </h2>
                {isCustomTargets ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    أهداف مخصصة
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    القيم الافتراضية
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تُستخدم هذه الحدود لحساب النطاق الآمن (TIR) وتلوين القراءات في عرض الهاتف والجدول
              </p>
            </div>
          </div>

          {!isEditingTargets ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors border border-sky-100 self-start sm:self-auto"
            >
              <Sliders className="w-4 h-4" />
              <span>تعديل أهداف السكر</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-amber-200"
                title="إعادة تعيين الأهداف إلى القيم القياسية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          )}
        </div>

        {/* Success message banner */}
        {targetSuccess && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{targetSuccess}</span>
          </div>
        )}

        {/* Read-only Summary Cards */}
        {!isEditingTargets && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                الحد الأدنى (الوقاية من الهبوط)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-amber-600 tabular-nums">
                  {targetMin}
                </span>
                <span className="text-xs text-slate-500 font-medium">{currentUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                أقل من ذلك يعتبر انخفاضًا
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                أقصى قيمة على الريق (قبل الأكل)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-sky-700 tabular-nums">
                  {targetMaxFasting}
                </span>
                <span className="text-xs text-slate-500 font-medium">{currentUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                المثالي: {targetMin} - {targetMaxFasting} {currentUnit}
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                أقصى قيمة بعد الأكل بساعتين (+2h)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-emerald-600 tabular-nums">
                  {targetMaxPost}
                </span>
                <span className="text-xs text-slate-500 font-medium">{currentUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                الهدف: حتى {targetMaxPost} {currentUnit}
              </span>
            </div>
          </div>
        )}

        {/* Editable Form */}
        {isEditingTargets && (
          <form onSubmit={handleSaveTargets} className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            {targetError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-semibold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{targetError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحد الأدنى للسكر ({currentUnit})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetForm.min}
                    onChange={(e) =>
                      setTargetForm((prev) => ({
                        ...prev,
                        min: normalizeArabicNums(e.target.value),
                      }))
                    }
                    placeholder={isGL ? '0.70' : '70'}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-800 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">
                    {currentUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  عتبة الهبوط (افتراضي: {isGL ? '0.70' : '70'})
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أقصى قيمة على الريق ({currentUnit})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetForm.maxFasting}
                    onChange={(e) =>
                      setTargetForm((prev) => ({
                        ...prev,
                        maxFasting: normalizeArabicNums(e.target.value),
                      }))
                    }
                    placeholder={isGL ? '1.30' : '130'}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-800 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">
                    {currentUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  الحد الأعلى قبل الوجبات (افتراضي: {isGL ? '1.30' : '130'})
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أقصى قيمة بعد الأكل ({currentUnit})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetForm.maxPost}
                    onChange={(e) =>
                      setTargetForm((prev) => ({
                        ...prev,
                        maxPost: normalizeArabicNums(e.target.value),
                      }))
                    }
                    placeholder={isGL ? '1.80' : '180'}
                    className="w-full px-3 py-2 text-sm font-bold text-slate-800 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 tabular-nums"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">
                    {currentUnit}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  الحد الأعلى بعد الأكل بساعتين (افتراضي: {isGL ? '1.80' : '180'})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الأهداف</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Time in Range */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ضمن الهدف السليم (TIR)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {timeInRangePct}%
            </span>
            <span className="text-xs text-slate-500 font-medium">من القياسات</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${timeInRangePct}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Average Glucose */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">متوسط السكر العام</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {avgGlucose}
            </span>
            <span className="text-xs text-slate-500 font-medium">{currentUnit}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            على الريق: {avgFasting} · بعد الأكل: {avgPost}
          </div>
        </div>

        {/* KPI 3: Extremes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الحد الأدنى والأقصى</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 block">أدنى</span>
              <span className="text-xl font-bold text-amber-600 tabular-nums">{minGlucose}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <span className="text-xs text-slate-400 block">أعلى</span>
              <span className="text-xl font-bold text-rose-600 tabular-nums">{maxGlucose}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {hypoCount > 0 ? (
              <span className="text-amber-600 font-medium">{hypoCount} حالات انخفاض (هبوط)</span>
            ) : (
              'لا يوجد هبوط مسجل'
            )}
          </div>
        </div>

        {/* KPI 4: Insulin total */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">متوسط الإنسولين اليومي</span>
            <Syringe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                avgDailyInsulin !== '—' ? 'text-indigo-900' : 'text-slate-400'
              }`}
            >
              {avgDailyInsulin}
            </span>
            {avgDailyInsulin !== '—' ? (
              <>
                <span className="text-xs text-slate-500 font-medium">وحدة / يوم</span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                  ({calculatedDaysCount}{' '}
                  {calculatedDaysCount === 1
                    ? 'يوم محسوب'
                    : calculatedDaysCount === 2
                    ? 'يومان محسوبان'
                    : calculatedDaysCount >= 3 && calculatedDaysCount <= 10
                    ? 'أيام محسوبة'
                    : 'يوماً محسوباً'})
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">لا توجد بيانات مسجلة</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            إجمالي الجرعات: {grandTotalInsulin > 0 ? `${grandTotalInsulin} وحدة` : '—'}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart: Blood Sugar Trends */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span>منحنى تقلبات نسبة السكر عبر الأيام</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مقارنة قراءات الصباح، منتصف النهار، والعشاء مع النطاق الآمن المستهدف ({targetMin} - {targetMaxPost} {currentUnit})
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
              <span>على الريق</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>بعد الفطور</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>بعد الغداء</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              <span>بعد العشاء</span>
            </span>
          </div>
        </div>

        {totalReadings === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            لا توجد قياسات مسجلة بعد لعرض المنحنى البياني. أضف قياسات السكر في عرض الهاتف أو الجدول.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[500px]"
            >
              {/* Target Range Band (targetMin to targetMaxPost) */}
              <rect
                x={paddingX}
                y={getY(targetMaxPost)}
                width={chartWidth - paddingX * 2}
                height={Math.max(0, getY(targetMin) - getY(targetMaxPost))}
                fill="#10b981"
                fillOpacity="0.08"
                rx="4"
              />
              <line
                x1={paddingX}
                y1={getY(targetMaxPost)}
                x2={chartWidth - paddingX}
                y2={getY(targetMaxPost)}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={getY(targetMin)}
                x2={chartWidth - paddingX}
                y2={getY(targetMin)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />

              {/* Target labels */}
              <text
                x={paddingX - 6}
                y={getY(targetMaxPost) + 4}
                fill="#059669"
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
              >
                {targetMaxPost}
              </text>
              <text
                x={paddingX - 6}
                y={getY(targetMin) + 4}
                fill="#d97706"
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
              >
                {targetMin}
              </text>

              {/* Connecting series lines */}
              {(['b1', 'b3', 'l2', 'd2'] as const).map((slotKey, sIdx) => {
                const color =
                  slotKey === 'b1'
                    ? '#0284c7'
                    : slotKey === 'b3'
                    ? '#f59e0b'
                    : slotKey === 'l2'
                    ? '#059669'
                    : '#9333ea';

                const points: { x: number; y: number; val: number }[] = [];

                days.forEach((_, dIdx) => {
                  const dayNum = dIdx + 1;
                  const raw = data[`d${dayNum}_${slotKey}`];
                  if (raw) {
                    const num = parseFloat(raw.replace(',', '.'));
                    if (!isNaN(num)) {
                      points.push({
                        x: getX(dIdx, sIdx),
                        y: getY(num),
                        val: num,
                      });
                    }
                  }
                });

                if (points.length < 1) return null;

                const pathData = points
                  .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                  .join(' ');

                return (
                  <g key={slotKey}>
                    {points.length > 1 && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4.5"
                          fill="#ffffff"
                          stroke={color}
                          strokeWidth="2.5"
                        />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          fill="#1e293b"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {p.val}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })}

              {/* X Axis Day Labels */}
              {days.map((d, dIdx) => {
                const dayWidth = (chartWidth - paddingX * 2) / Math.max(1, days.length - 1 || 1);
                const x = paddingX + dIdx * dayWidth;
                return (
                  <text
                    key={dIdx}
                    x={x}
                    y={chartHeight - 8}
                    fill="#64748b"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    اليوم {dIdx + 1}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Daily Insulin Breakdown Cards */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-3">
          <Syringe className="w-4 h-4 text-sky-600" />
          <span>توزيع جرعات الإنسولين اليومية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {insulinTotalsByDay.map((item, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                <span>اليوم {idx + 1}</span>
                <span className="text-sky-700 tabular-nums">{item.total} وحدة</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>سريع (NOVO rapid):</span>
                  <span className="font-bold text-slate-900 tabular-nums">{item.rapid} u</span>
                </div>
                <div className="flex justify-between">
                  <span>مختلط (NOVO Mix):</span>
                  <span className="font-bold text-slate-900 tabular-nums">{item.mix} u</span>
                </div>
                <div className="flex justify-between">
                  <span>قاعدي (GLARUS/TRESIBA):</span>
                  <span className="font-bold text-slate-900 tabular-nums">{item.basal} u</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medical Disclaimer under Analytics */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-xs text-slate-600 flex items-center justify-center gap-2 shadow-xs">
        <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="font-semibold text-slate-700">
          هذه الأرقام للمتابعة فقط وليست تشخيصًا؛ الأهداف يحددها طبيبك
        </span>
      </div>
    </div>
  );
};
