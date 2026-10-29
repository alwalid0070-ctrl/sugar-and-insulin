import React from 'react';
import { Syringe } from 'lucide-react';
import { GlycemiaData, getInsulinChoice } from '../types/glycemia';

interface InsulinPrescriptionProps {
  data: GlycemiaData;
  onChangeData: (updates: Partial<GlycemiaData>) => void;
}

export const InsulinPrescription: React.FC<InsulinPrescriptionProps> = ({
  data,
  onChangeData,
}) => {
  const b2Choice = getInsulinChoice(data, 'b2');
  const l1Choice = getInsulinChoice(data, 'l1');
  const d1Choice = getInsulinChoice(data, 'd1');

  const periods: {
    key: 'ins_b2' | 'ins_l1' | 'ins_d1';
    titleAr: string;
    titleFr: string;
    currentValue: 'rapid' | 'mix';
  }[] = [
    {
      key: 'ins_b2',
      titleAr: 'الصباح',
      titleFr: 'petit déjeuner',
      currentValue: b2Choice,
    },
    {
      key: 'ins_l1',
      titleAr: 'الغداء',
      titleFr: 'déjeuner',
      currentValue: l1Choice,
    },
    {
      key: 'ins_d1',
      titleAr: 'العشاء',
      titleFr: 'diner',
      currentValue: d1Choice,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs no-print">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Header Section */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Syringe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                نوع الإنسولين حسب وصفة الطبيب لكل فترة
              </h3>
              <p className="text-[11px] text-slate-500">
                حدد نوع الإنسولين المطلوب (سريع أو مختلط) لكل وجبة
              </p>
            </div>
          </div>

          {/* 3 Periods Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {periods.map((p) => (
              <div
                key={p.key}
                className="bg-slate-50/80 rounded-xl p-2 border border-slate-200 flex flex-col justify-center"
              >
                <div className="text-[11px] font-bold text-slate-800 mb-1.5 flex items-center justify-between px-1">
                  <span>{p.titleAr}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{p.titleFr}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Option 1: NOVO rapid */}
                  <label
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer min-h-[44px] transition-all select-none ${
                      p.currentValue === 'rapid'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`prescription_${p.key}`}
                      value="rapid"
                      checked={p.currentValue === 'rapid'}
                      onChange={() => onChangeData({ [p.key]: 'rapid' })}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        p.currentValue === 'rapid'
                          ? 'border-amber-600 bg-amber-600'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {p.currentValue === 'rapid' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-[11px] leading-tight">NOVO rapid</span>
                  </label>

                  {/* Option 2: NOVO Mix */}
                  <label
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer min-h-[44px] transition-all select-none ${
                      p.currentValue === 'mix'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`prescription_${p.key}`}
                      value="mix"
                      checked={p.currentValue === 'mix'}
                      onChange={() => onChangeData({ [p.key]: 'mix' })}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        p.currentValue === 'mix'
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {p.currentValue === 'mix' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-[11px] leading-tight">NOVO Mix</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
