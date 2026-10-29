import React from 'react';
import { Printer, Download, ArrowRight, FileCheck } from 'lucide-react';
import { GlycemiaData, COLS_DEF, getInsulinChoice } from '../types/glycemia';
import { downloadDocx } from '../utils/docxExport';

interface PrintSheetViewProps {
  data: GlycemiaData;
  days: string[];
  onBackToApp: () => void;
}

export const PrintSheetView: React.FC<PrintSheetViewProps> = ({
  data,
  days,
  onBackToApp,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDocx = () => {
    downloadDocx(data, days);
  };

  const insB2 = getInsulinChoice(data, 'b2');
  const insL1 = getInsulinChoice(data, 'l1');
  const insD1 = getInsulinChoice(data, 'd1');

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
      {/* Top action bar (hidden when printing) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="العودة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              معاينة استمارة المتابعة الورقية (A4)
            </h2>
            <p className="text-xs text-slate-500">
              استمارة سريرية مطابقة للنموذج الطبي، منسقة للطباعة المباشرة أو التصدير
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>تنزيل Word (.docx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة فورية / PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable A4 Sheet container */}
      <div className="bg-slate-200/50 p-2 sm:p-6 rounded-2xl overflow-x-auto no-print">
        <div
          id="clinical-paper"
          className="bg-white shadow-md mx-auto p-6 sm:p-8 rounded-lg max-w-[920px] min-w-[780px] print:shadow-none print:p-0 print:max-w-full text-slate-900"
          style={{ fontFamily: 'Arial, Tahoma, sans-serif' }}
        >
          {/* Header Title */}
          <div className="text-center pb-4 mb-4 border-b border-slate-300">
            <h1 className="text-xl font-bold text-slate-900 tracking-wide">
              ورقة متابعة نسبة السكر والإنسولين
            </h1>
            <div className="text-xs text-slate-500 mt-1" dir="ltr">
              Feuille de Surveillance Glycémique et Protocole d'Insuline
            </div>
          </div>

          {/* Patient Header Block */}
          <div className="flex items-center justify-between gap-4 text-sm font-medium pb-4 mb-4 border-b border-slate-800" dir="ltr">
            <div className="flex-1">
              <span className="font-bold">Nom :</span>{' '}
              <span className="border-b border-slate-400 px-2 min-w-[120px] inline-block font-semibold">
                {data.nom || '—'}
              </span>
            </div>
            <div className="flex-1">
              <span className="font-bold">Prénom :</span>{' '}
              <span className="border-b border-slate-400 px-2 min-w-[120px] inline-block font-semibold">
                {data.prenom || '—'}
              </span>
            </div>
            <div className="flex-1">
              <span className="font-bold">Age :</span>{' '}
              <span className="border-b border-slate-400 px-2 min-w-[60px] inline-block font-semibold">
                {data.age || '—'}
              </span>
            </div>
            {data.doctor && (
              <div className="flex-1 text-right">
                <span className="font-bold">Médecin :</span>{' '}
                <span className="border-b border-slate-400 px-2 inline-block font-semibold">
                  {data.doctor}
                </span>
              </div>
            )}
          </div>

          {/* Clinical Matrix Table */}
          <table className="w-full border-collapse border-[1.5px] border-slate-900 text-center text-xs">
            <colgroup>
              <col style={{ width: '105px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '10px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '105px' }} />
            </colgroup>

            <thead>
              {/* Level 1 Meal Groups */}
              <tr className="border-b border-slate-900">
                <th
                  rowSpan={2}
                  className="border-r border-slate-900 p-2 font-bold bg-slate-100"
                ></th>
                <th
                  colSpan={3}
                  className="border-r border-slate-900 py-2 text-sm font-bold bg-slate-50"
                  dir="rtl"
                >
                  الصباح <span className="font-normal text-xs">petit déjeuner</span>
                </th>
                <th
                  rowSpan={2}
                  className="w-2.5 p-0 bg-white border-r border-slate-900"
                ></th>
                <th
                  colSpan={2}
                  className="border-r border-slate-900 py-2 text-sm font-bold bg-slate-50"
                  dir="rtl"
                >
                  الغذاء: <span className="font-normal text-xs">déjeuner</span>
                </th>
                <th
                  colSpan={3}
                  className="border-r border-slate-900 py-2 text-sm font-bold bg-slate-50"
                  dir="rtl"
                >
                  العشاء: <span className="font-normal text-xs">diner</span>
                </th>
              </tr>

              {/* Level 2 Sub-headers with Exact French/Arabic Headings */}
              <tr className="border-b-[1.5px] border-slate-900 text-[11px] leading-tight">
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">نسبة السكر قبل الاكل</span>
                </th>
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">كمية الانسلين</span>
                  <div className="text-left font-bold text-xs mt-3 pl-1 leading-snug">
                    NOVO<br />
                    <span className={insB2 === 'rapid' ? 'italic font-normal' : 'font-normal'}>
                      {insB2 === 'rapid' ? 'rapid' : 'Mix'}
                    </span>
                  </div>
                </th>
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">نسبة السكر بعد الاكل ب 2 ساعة</span>
                </th>

                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">كمية الانسلين</span>
                  <div className="text-left font-bold text-xs mt-3 pl-1 leading-snug">
                    NOVO<br />
                    <span className={insL1 === 'rapid' ? 'font-normal' : 'font-normal'}>
                      {insL1 === 'rapid' ? 'rapid' : 'Mix'}
                    </span>
                  </div>
                </th>
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">نسبة السكر بعد الاكل ب 2 ساعة</span>
                </th>

                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">كمية الانسلين</span>
                  <div className="text-left font-bold text-xs mt-3 pl-1 leading-snug">
                    NOVO<br />
                    <span className={insD1 === 'rapid' ? 'italic font-normal' : 'font-normal'}>
                      {insD1 === 'rapid' ? 'rapid' : 'Mix'}
                    </span>
                  </div>
                </th>
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">نسبة السكر بعد الاكل ب 2 ساعة</span>
                </th>
                <th className="border-r border-slate-900 p-1.5 h-32 align-top">
                  <span dir="rtl" className="block font-medium">كمية الانسلين</span>
                  <div className="text-left font-bold text-xs mt-3 pl-1 leading-snug">
                    GLARUS<br />
                    <span className="font-normal">TRESIBA</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {days.map((dayLabel, idx) => {
                const dayNum = idx + 1;
                const dateVal = data[`date_${dayNum}`] || '';
                const dayNote = data[`d${dayNum}_note`] || '';

                return (
                  <tr
                    key={idx}
                    className="border-b border-slate-900 h-24 align-middle"
                  >
                    {/* Day / Date Cell */}
                    <td className="border-r border-slate-900 p-1 text-center font-bold text-sm bg-slate-50">
                      <div>{dayLabel}</div>
                      <div className="text-xs font-normal text-slate-600 mt-0.5">
                        {dateVal || '..../../..'}
                      </div>
                      {dayNote && (
                        <div className="mt-1 px-1 py-0.5 bg-amber-50 rounded border border-amber-200 text-[10px] font-normal text-amber-950 leading-tight">
                          <span className="font-semibold">ملاحظة:</span> {dayNote}
                        </div>
                      )}
                    </td>

                    {/* b1 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_b1`] || ''}
                    </td>

                    {/* b2 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_b2`] || ''}
                    </td>

                    {/* b3 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_b3`] || ''}
                    </td>

                    {/* Gap */}
                    <td className="bg-white border-r border-slate-900 p-0"></td>

                    {/* l1 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_l1`] || ''}
                    </td>

                    {/* l2 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_l2`] || ''}
                    </td>

                    {/* d1 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_d1`] || ''}
                    </td>

                    {/* d2 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_d2`] || ''}
                    </td>

                    {/* d3 */}
                    <td className="border-r border-slate-900 p-1 text-3xl font-bold tabular-nums text-center align-middle">
                      {data[`d${dayNum}_d3`] || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Day Notes summary section if present */}
          {days.some((_, i) => data[`d${i + 1}_note`]) && (
            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-700">
              <span className="font-bold text-slate-900">ملاحظات الأيام (Remarques) :</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px]">
                {days.map((d, i) => {
                  const n = data[`d${i + 1}_note`];
                  if (!n) return null;
                  return (
                    <span key={i}>
                      <span className="font-semibold">{d}:</span> {n}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer note and signatures */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs text-slate-600">
            <div>
              <span className="font-semibold">تاريخ الطباعة:</span> {new Date().toLocaleDateString('ar-EG')}
              <div className="text-[11px] text-slate-400 mt-0.5">
                تُحفظ البيانات محلياً على الجهاز. راجع الطبيب المعالج لأي تعديل في جرعات الإنسولين.
              </div>
            </div>
            <div className="text-center min-w-[160px] border-t border-slate-400 pt-1">
              <span className="font-semibold text-slate-700">توقيع وختم الطبيب المعالج</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
