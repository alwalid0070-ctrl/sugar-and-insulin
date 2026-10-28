import React from 'react';
import { Plus, Trash2, Calendar, FileText, AlertTriangle } from 'lucide-react';
import {
  GlycemiaData,
  COLS_DEF,
  getTargets,
  isSevereHypo,
  SEVERE_HYPO_ALERT,
} from '../types/glycemia';
import { normalizeArabicNums } from '../utils/csvHelper';

interface TabletGridViewProps {
  data: GlycemiaData;
  days: string[];
  onUpdateValue: (id: string, value: string) => void;
  onAddDay: () => void;
  onRemoveDay: (index: number) => void;
}

export const TabletGridView: React.FC<TabletGridViewProps> = ({
  data,
  days,
  onUpdateValue,
  onAddDay,
  onRemoveDay,
}) => {
  const currentUnit = data.unit || 'g/L';
  const targets = getTargets(data);

  // Check if any blood sugar reading in the table is severe hypoglycemia
  const hasSevereHypo = days.some((_, idx) => {
    const dayNum = idx + 1;
    return ['b1', 'b3', 'l2', 'd2'].some((k) =>
      isSevereHypo(data[`d${dayNum}_${k}`], currentUnit)
    );
  });

  // Keydown navigation: Enter key moves to next cell
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('.tablet-grid-cell-input')
      );
      const currentIndex = inputs.indexOf(e.currentTarget);
      if (currentIndex !== -1 && currentIndex + 1 < inputs.length) {
        inputs[currentIndex + 1].focus();
        inputs[currentIndex + 1].select();
        e.preventDefault();
      }
    }
  };

  // Cell status styling
  const getCellBg = (valStr: string, isGlucose: boolean, isFasting: boolean) => {
    if (!valStr || !isGlucose) return 'bg-white hover:bg-slate-50 focus-within:bg-sky-50/50';
    const v = parseFloat(valStr.replace(',', '.'));
    if (isNaN(v)) return 'bg-white';

    if (isSevereHypo(v, currentUnit)) return 'bg-red-100 text-red-950 font-black border-2 border-red-600';
    if (v < targets.min) return 'bg-amber-100/60 text-amber-950 font-bold';
    if (isFasting && v <= targets.maxFasting) return 'bg-emerald-50/70 text-emerald-950';
    if (!isFasting && v <= targets.maxPost) return 'bg-emerald-50/70 text-emerald-950';
    return 'bg-rose-50/70 text-rose-950';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              الجدول السريري المتكامل (نمط التابلت والطباعة)
            </h2>
            <p className="text-xs text-slate-500">
              جدول مطابقة القياسات مع إمكانية التنقل السريع بزر Enter بين الخانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddDay}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة يوم (Jour {days.length + 1})</span>
          </button>
        </div>
      </div>

      {/* Severe Hypoglycemia Prominent Alert Banner */}
      {hasSevereHypo && (
        <div
          role="alert"
          className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex items-start gap-3 text-red-900 shadow-md shadow-red-500/10"
        >
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-sm text-red-700">تنبيه انخفاض حاد في السكر</div>
            <div className="text-xs font-bold text-red-900 mt-1 leading-relaxed">
              {SEVERE_HYPO_ALERT}
            </div>
          </div>
        </div>
      )}

      {/* Main Clinical Table Container with horizontal scroll on mobile/tablet */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs min-w-[860px]">
            {/* Column Widths */}
            <colgroup>
              <col style={{ width: '130px' }} />
              {/* Petit dejeuner 3 cols */}
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              {/* Gap */}
              <col style={{ width: '10px' }} />
              {/* Dejeuner 2 cols */}
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              {/* Diner 3 cols */}
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              {/* Actions */}
              <col style={{ width: '48px' }} />
            </colgroup>

            {/* Level 1 Header: Meals */}
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900">
                <th
                  rowSpan={2}
                  className="border-r border-slate-400 p-2 text-center font-bold text-sm bg-slate-200/70"
                >
                  اليوم / التاريخ
                  <div className="text-[11px] font-normal text-slate-500">Jour / Date</div>
                </th>
                <th
                  colSpan={3}
                  className="border-r border-slate-400 py-2.5 px-1 font-bold text-sm bg-amber-50 text-amber-950"
                >
                  الصباح <span className="text-xs font-normal text-amber-800">petit déjeuner</span>
                </th>
                <th rowSpan={2} className="bg-slate-300 w-2.5 p-0 border-r border-slate-400"></th>
                <th
                  colSpan={2}
                  className="border-r border-slate-400 py-2.5 px-1 font-bold text-sm bg-sky-50 text-sky-950"
                >
                  الغداء: <span className="text-xs font-normal text-sky-800">déjeuner</span>
                </th>
                <th
                  colSpan={3}
                  className="border-r border-slate-400 py-2.5 px-1 font-bold text-sm bg-indigo-50 text-indigo-950"
                >
                  العشاء: <span className="text-xs font-normal text-indigo-800">diner</span>
                </th>
                <th rowSpan={2} className="p-1 font-normal text-slate-400"></th>
              </tr>

              {/* Level 2 Header: Columns */}
              <tr className="bg-slate-50 text-slate-800 border-b-2 border-slate-900 text-[11px]">
                {/* b1 */}
                <th className="border-r border-slate-300 p-2 font-medium">
                  <div>نسبة السكر</div>
                  <div className="font-bold text-slate-900">قبل الأكل</div>
                </th>
                {/* b2 */}
                <th className="border-r border-slate-300 p-2 font-medium bg-amber-50/40">
                  <div>كمية الإنسولين</div>
                  <div className="font-bold text-amber-900">NOVO rapid</div>
                </th>
                {/* b3 */}
                <th className="border-r border-slate-400 p-2 font-medium">
                  <div>نسبة السكر</div>
                  <div className="font-bold text-slate-900">بعد الأكل ب 2 ساعة</div>
                </th>

                {/* l1 */}
                <th className="border-r border-slate-300 p-2 font-medium bg-sky-50/40">
                  <div>كمية الإنسولين</div>
                  <div className="font-bold text-sky-900">NOVO rapid</div>
                </th>
                {/* l2 */}
                <th className="border-r border-slate-400 p-2 font-medium">
                  <div>نسبة السكر</div>
                  <div className="font-bold text-slate-900">بعد الأكل ب 2 ساعة</div>
                </th>

                {/* d1 */}
                <th className="border-r border-slate-300 p-2 font-medium bg-purple-50/40">
                  <div>كمية الإنسولين</div>
                  <div className="font-bold text-purple-900">NOVO Mix</div>
                </th>
                {/* d2 */}
                <th className="border-r border-slate-300 p-2 font-medium">
                  <div>نسبة السكر</div>
                  <div className="font-bold text-slate-900">بعد الأكل ب 2 ساعة</div>
                </th>
                {/* d3 */}
                <th className="border-r border-slate-400 p-2 font-medium bg-blue-50/40">
                  <div>كمية الإنسولين</div>
                  <div className="font-bold text-blue-900">GLARUS / TRESIBA</div>
                </th>
              </tr>
            </thead>

            {/* Table Rows for each day */}
            <tbody className="divide-y divide-slate-300">
              {days.map((dayLabel, idx) => {
                const dayNum = idx + 1;
                const dateKey = `date_${dayNum}`;
                const dateVal = data[dateKey] || '';

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* Day / Date Cell */}
                    <td className="border-r border-slate-400 p-2 bg-slate-50/80 align-middle">
                      <div className="font-bold text-slate-900 text-sm">{dayLabel}</div>
                      <div className="text-[10px] text-slate-500">اليوم {dayNum}</div>
                      <div className="mt-1">
                        <input
                          type="date"
                          value={dateVal}
                          onChange={(e) => onUpdateValue(dateKey, e.target.value)}
                          className="w-full text-[11px] bg-white border border-slate-300 rounded px-1 py-0.5 text-center text-slate-700"
                        />
                      </div>
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="ملاحظة (رياضة، مرض...)"
                          value={data[`d${dayNum}_note`] || ''}
                          onChange={(e) => onUpdateValue(`d${dayNum}_note`, e.target.value)}
                          className="w-full text-[10px] bg-white border border-slate-300 focus:border-sky-500 rounded px-1.5 py-0.5 text-slate-700 placeholder:text-slate-400 focus:outline-none"
                          title="ملاحظة اليوم (اختياري)"
                        />
                      </div>
                    </td>

                    {/* b1 */}
                    <td
                      className={`border-r border-slate-300 p-1 align-middle ${getCellBg(
                        data[`d${dayNum}_b1`],
                        true,
                        true
                      )}`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data[`d${dayNum}_b1`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_b1`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold bg-transparent outline-none tabular-nums focus:bg-sky-100/40 rounded transition-all"
                      />
                    </td>

                    {/* b2 */}
                    <td className="border-r border-slate-300 p-1 align-middle bg-amber-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data[`d${dayNum}_b2`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_b2`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold text-amber-900 bg-transparent outline-none tabular-nums focus:bg-amber-100/50 rounded transition-all"
                      />
                    </td>

                    {/* b3 */}
                    <td
                      className={`border-r border-slate-400 p-1 align-middle ${getCellBg(
                        data[`d${dayNum}_b3`],
                        true,
                        false
                      )}`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data[`d${dayNum}_b3`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_b3`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold bg-transparent outline-none tabular-nums focus:bg-sky-100/40 rounded transition-all"
                      />
                    </td>

                    {/* Gap Column */}
                    <td className="bg-slate-200/80 p-0 border-r border-slate-400"></td>

                    {/* l1 */}
                    <td className="border-r border-slate-300 p-1 align-middle bg-sky-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data[`d${dayNum}_l1`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_l1`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold text-sky-900 bg-transparent outline-none tabular-nums focus:bg-sky-100/50 rounded transition-all"
                      />
                    </td>

                    {/* l2 */}
                    <td
                      className={`border-r border-slate-400 p-1 align-middle ${getCellBg(
                        data[`d${dayNum}_l2`],
                        true,
                        false
                      )}`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data[`d${dayNum}_l2`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_l2`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold bg-transparent outline-none tabular-nums focus:bg-sky-100/40 rounded transition-all"
                      />
                    </td>

                    {/* d1 */}
                    <td className="border-r border-slate-300 p-1 align-middle bg-purple-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data[`d${dayNum}_d1`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_d1`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold text-purple-900 bg-transparent outline-none tabular-nums focus:bg-purple-100/50 rounded transition-all"
                      />
                    </td>

                    {/* d2 */}
                    <td
                      className={`border-r border-slate-300 p-1 align-middle ${getCellBg(
                        data[`d${dayNum}_d2`],
                        true,
                        false
                      )}`}
                    >
                      <input
                        type="text"
                        inputMode="decimal"
                        value={data[`d${dayNum}_d2`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_d2`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold bg-transparent outline-none tabular-nums focus:bg-sky-100/40 rounded transition-all"
                      />
                    </td>

                    {/* d3 */}
                    <td className="border-r border-slate-400 p-1 align-middle bg-blue-50/20">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data[`d${dayNum}_d3`] || ''}
                        onChange={(e) =>
                          onUpdateValue(`d${dayNum}_d3`, normalizeArabicNums(e.target.value))
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="—"
                        className="tablet-grid-cell-input w-full h-12 text-center text-base font-bold text-blue-900 bg-transparent outline-none tabular-nums focus:bg-blue-100/50 rounded transition-all"
                      />
                    </td>

                    {/* Action */}
                    <td className="p-1 align-middle">
                      {days.length > 1 && (
                        <button
                          onClick={() => onRemoveDay(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="حذف هذا اليوم"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">دلالات الألوان:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-red-700 inline-block"></span>
              <span className="font-semibold text-red-700">انخفاض شديد (&lt; {currentUnit === 'g/L' ? '0.54' : '54'})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-300 border border-amber-400 inline-block"></span>
              <span>انخفاض (هبوط سكر)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-300 border border-emerald-400 inline-block"></span>
              <span>طبيعي ضمن الهدف</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-300 border border-rose-400 inline-block"></span>
              <span>مرتفع</span>
            </span>
          </div>

          <div className="text-slate-500">
            اضغط <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px]">Enter</kbd> للانتقال التلقائي للخانة التالية
          </div>
        </div>
      </div>
    </div>
  );
};
