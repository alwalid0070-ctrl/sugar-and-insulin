import React from 'react';
import {
  TrendingUp,
  Activity,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Flame,
} from 'lucide-react';
import { GlycemiaData } from '../types/glycemia';

interface AnalyticsViewProps {
  data: GlycemiaData;
  days: string[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ data, days }) => {
  const currentUnit = data.unit || 'g/L';

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

  days.forEach((dayLabel, idx) => {
    const dayNum = idx + 1;

    // Glucose slots
    const b1 = parseFloat((data[`d${dayNum}_b1`] || '').replace(',', '.'));
    const b3 = parseFloat((data[`d${dayNum}_b3`] || '').replace(',', '.'));
    const l2 = parseFloat((data[`d${dayNum}_l2`] || '').replace(',', '.'));
    const d2 = parseFloat((data[`d${dayNum}_d2`] || '').replace(',', '.'));

    if (!isNaN(b1))
      glucoseReadings.push({ val: b1, dayIdx: idx, dayLabel, type: 'fasting', slot: 'على الريق' });
    if (!isNaN(b3))
      glucoseReadings.push({ val: b3, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد الفطور' });
    if (!isNaN(l2))
      glucoseReadings.push({ val: l2, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد الغداء' });
    if (!isNaN(d2))
      glucoseReadings.push({ val: d2, dayIdx: idx, dayLabel, type: 'post', slot: 'بعد العشاء' });

    // Insulin slots
    const b2 = parseFloat((data[`d${dayNum}_b2`] || '0').replace(',', '.')) || 0;
    const l1 = parseFloat((data[`d${dayNum}_l1`] || '0').replace(',', '.')) || 0;
    const d1 = parseFloat((data[`d${dayNum}_d1`] || '0').replace(',', '.')) || 0;
    const d3 = parseFloat((data[`d${dayNum}_d3`] || '0').replace(',', '.')) || 0;

    const rapid = b2 + l1;
    const mix = d1;
    const basal = d3;

    insulinTotalsByDay.push({
      dayLabel,
      rapid,
      mix,
      basal,
      total: rapid + mix + basal,
    });
  });

  const totalReadings = glucoseReadings.length;
  const values = glucoseReadings.map((r) => r.val);

  // Targets
  const isGL = currentUnit === 'g/L';
  const targetMin = isGL ? 0.7 : 70;
  const targetMaxFasting = isGL ? 1.3 : 130;
  const targetMaxPost = isGL ? 1.8 : 180;

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
  const avgDailyInsulin =
    days.length > 0 ? Math.round(grandTotalInsulin / days.length) : 0;

  // SVG Chart Dimensions & plotting
  const chartHeight = 220;
  const chartWidth = 600;
  const paddingX = 40;
  const paddingY = 30;

  const minChartVal = isGL ? 0.4 : 40;
  const maxChartVal = isGL
    ? Math.max(2.5, ...values, 2.0)
    : Math.max(250, ...values, 200);

  const getY = (val: number) => {
    const ratio = (val - minChartVal) / (maxChartVal - minChartVal);
    return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
  };

  const getX = (dayIdx: number, slotOffset: number) => {
    const dayWidth = (chartWidth - paddingX * 2) / Math.max(1, days.length - 1 || 1);
    const baseX = paddingX + dayIdx * dayWidth;
    return baseX + (slotOffset - 1.5) * (dayWidth * 0.18);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
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
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tabular-nums">
              {avgDailyInsulin}
            </span>
            <span className="text-xs text-slate-500 font-medium">وحدة / يوم</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            إجمالي الجرعات: {grandTotalInsulin} وحدة
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
              مقارنة قراءات الصباح، منتصف النهار، والعشاء مع النطاق الآمن المستهدف
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
              {/* Target Range Band (e.g. 0.70 to 1.80) */}
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
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={getY(targetMin)}
                x2={chartWidth - paddingX}
                y2={getY(targetMin)}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Target labels */}
              <text
                x={paddingX - 6}
                y={getY(targetMaxPost) + 4}
                fill="#059669"
                fontSize="10"
                textAnchor="end"
              >
                {targetMaxPost}
              </text>
              <text
                x={paddingX - 6}
                y={getY(targetMin) + 4}
                fill="#d97706"
                fontSize="10"
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
    </div>
  );
};
