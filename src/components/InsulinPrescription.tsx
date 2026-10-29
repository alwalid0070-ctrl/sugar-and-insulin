import React, { useState } from 'react';
import { Syringe, ChevronDown, X, Check } from 'lucide-react';
import {
  GlycemiaData,
  getInsulinChoice,
  getDrugName,
  LONG_ACTING_DRUGS,
  RAPID_DRUGS,
  MIXED_DRUGS,
} from '../types/glycemia';

interface InsulinPrescriptionProps {
  data: GlycemiaData;
  onChangeData: (updates: Partial<GlycemiaData>) => void;
}

export const InsulinPrescription: React.FC<InsulinPrescriptionProps> = ({
  data,
  onChangeData,
}) => {
  // Track which meal periods have been explicitly selected/clicked by user
  const [revealedPeriods, setRevealedPeriods] = useState<Record<string, boolean>>({});
  // Track whether long-acting drug selector is opened
  const [showLongActingList, setShowLongActingList] = useState<boolean>(() => {
    return Boolean(data.drug_d3);
  });

  const b2Choice = getInsulinChoice(data, 'b2');
  const l1Choice = getInsulinChoice(data, 'l1');
  const d1Choice = getInsulinChoice(data, 'd1');

  const periods: {
    slotKey: 'b2' | 'l1' | 'd1';
    insKey: 'ins_b2' | 'ins_l1' | 'ins_d1';
    drugKey: 'drug_b2' | 'drug_l1' | 'drug_d1';
    drugOtherKey: 'drugOther_b2' | 'drugOther_l1' | 'drugOther_d1';
    titleAr: string;
    titleFr: string;
    currentCategory: 'rapid' | 'mix';
  }[] = [
    {
      slotKey: 'b2',
      insKey: 'ins_b2',
      drugKey: 'drug_b2',
      drugOtherKey: 'drugOther_b2',
      titleAr: 'الصباح',
      titleFr: 'petit déjeuner',
      currentCategory: b2Choice,
    },
    {
      slotKey: 'l1',
      insKey: 'ins_l1',
      drugKey: 'drug_l1',
      drugOtherKey: 'drugOther_l1',
      titleAr: 'الغداء',
      titleFr: 'déjeuner',
      currentCategory: l1Choice,
    },
    {
      slotKey: 'd1',
      insKey: 'ins_d1',
      drugKey: 'drug_d1',
      drugOtherKey: 'drugOther_d1',
      titleAr: 'العشاء',
      titleFr: 'diner',
      currentCategory: d1Choice,
    },
  ];

  // Handle changing insulin category (rapid vs mix)
  const handleCategoryChange = (
    p: (typeof periods)[number],
    newCategory: 'rapid' | 'mix'
  ) => {
    setRevealedPeriods((prev) => ({ ...prev, [p.insKey]: true }));

    const updates: Partial<GlycemiaData> = {
      [p.insKey]: newCategory,
    };

    // Rule: Upon changing category, wipe previous drug selection if not in the new category's list
    const currentDrug = data[p.drugKey];
    if (currentDrug) {
      const targetList = newCategory === 'rapid' ? (RAPID_DRUGS as readonly string[]) : (MIXED_DRUGS as readonly string[]);
      if (!targetList.includes(currentDrug)) {
        updates[p.drugKey] = '';
        updates[p.drugOtherKey] = '';
      }
    }

    onChangeData(updates);
  };

  // Handle choosing a specific drug
  const handleSelectDrug = (
    drugKey: 'drug_b2' | 'drug_l1' | 'drug_d1' | 'drug_d3',
    otherKey: 'drugOther_b2' | 'drugOther_l1' | 'drugOther_d1' | 'drugOther_d3',
    drugValue: string
  ) => {
    const updates: Partial<GlycemiaData> = {
      [drugKey]: drugValue,
    };
    if (drugValue !== 'other') {
      updates[otherKey] = '';
    }
    onChangeData(updates);
  };

  // Handle clearing drug selection back to default
  const handleClearDrug = (
    drugKey: 'drug_b2' | 'drug_l1' | 'drug_d1' | 'drug_d3',
    otherKey: 'drugOther_b2' | 'drugOther_l1' | 'drugOther_d1' | 'drugOther_d3'
  ) => {
    onChangeData({
      [drugKey]: '',
      [otherKey]: '',
    });
  };

  const currentD3Drug = getDrugName(data, 'd3');

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs no-print">
      <div className="max-w-7xl mx-auto space-y-3">
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
              حدد نوع الإنسولين المطلوب (سريع أو مختلط) والدواء الموصوف لكل وجبة، مع تحديد الإنسولين طويل المفعول
            </p>
          </div>
        </div>

        {/* 4 Cards Grid (3 Meals + 1 Long-Acting Block) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Blocks 1, 2, 3: Breakfast, Lunch, Dinner */}
          {periods.map((p) => {
            const isRevealed = Boolean(revealedPeriods[p.insKey]);
            const drugList = p.currentCategory === 'rapid' ? RAPID_DRUGS : MIXED_DRUGS;
            const selectedDrug = data[p.drugKey] || '';
            const otherText = data[p.drugOtherKey] || '';

            return (
              <div
                key={p.insKey}
                className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2.5 transition-all shadow-xs"
              >
                {/* Period Title */}
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between px-1">
                  <span>{p.titleAr}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{p.titleFr}</span>
                </div>

                {/* 2 Category Radios: NOVO rapid / NOVO Mix */}
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Option 1: rapid */}
                  <label
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer min-h-[44px] transition-all select-none ${
                      p.currentCategory === 'rapid'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`prescription_${p.insKey}`}
                      value="rapid"
                      checked={p.currentCategory === 'rapid'}
                      onChange={() => handleCategoryChange(p, 'rapid')}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        p.currentCategory === 'rapid'
                          ? 'border-amber-600 bg-amber-600'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {p.currentCategory === 'rapid' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-[11px] leading-tight">NOVO rapid</span>
                  </label>

                  {/* Option 2: mix */}
                  <label
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer min-h-[44px] transition-all select-none ${
                      p.currentCategory === 'mix'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-950 font-bold shadow-xs ring-1 ring-purple-400/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`prescription_${p.insKey}`}
                      value="mix"
                      checked={p.currentCategory === 'mix'}
                      onChange={() => handleCategoryChange(p, 'mix')}
                      className="sr-only"
                    />
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        p.currentCategory === 'mix'
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {p.currentCategory === 'mix' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-[11px] leading-tight">NOVO Mix</span>
                  </label>
                </div>

                {/* Hidden Drug List: revealed smoothly only after explicit category selection */}
                {isRevealed && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-700">
                        {p.currentCategory === 'rapid'
                          ? 'أدوية الإنسولين السريع:'
                          : 'أدوية الإنسولين المختلط:'}
                      </span>
                      {selectedDrug && (
                        <button
                          type="button"
                          onClick={() => handleClearDrug(p.drugKey, p.drugOtherKey)}
                          className="text-[10px] text-slate-500 hover:text-rose-600 flex items-center gap-0.5 transition-colors"
                          title="إلغاء اختيار الدواء والعودة للافتراضي"
                        >
                          <X className="w-3 h-3" />
                          <span>إلغاء التحديد</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {drugList.map((drug) => {
                        const isSelected = selectedDrug === drug;
                        return (
                          <label
                            key={drug}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer min-h-[44px] transition-all select-none ${
                              isSelected
                                ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`drug_list_${p.slotKey}`}
                                value={drug}
                                checked={isSelected}
                                onChange={() => handleSelectDrug(p.drugKey, p.drugOtherKey, drug)}
                                className="sr-only"
                              />
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected
                                    ? 'border-sky-600 bg-sky-600'
                                    : 'border-slate-400 bg-white'
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-xs">{drug}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                          </label>
                        );
                      })}

                      {/* Option: دواء آخر (غير مدرج) */}
                      <label
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer min-h-[44px] transition-all select-none ${
                          selectedDrug === 'other'
                            ? 'bg-sky-50 border-sky-400 text-sky-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`drug_list_${p.slotKey}`}
                            value="other"
                            checked={selectedDrug === 'other'}
                            onChange={() => handleSelectDrug(p.drugKey, p.drugOtherKey, 'other')}
                            className="sr-only"
                          />
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              selectedDrug === 'other'
                                ? 'border-sky-600 bg-sky-600'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {selectedDrug === 'other' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="text-xs">دواء آخر (غير مدرج)</span>
                        </div>
                        {selectedDrug === 'other' && (
                          <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        )}
                      </label>

                      {/* Free text input if 'other' is chosen */}
                      {selectedDrug === 'other' && (
                        <div className="pt-1.5 px-0.5 animate-in fade-in duration-150">
                          <input
                            type="text"
                            maxLength={30}
                            placeholder="اكتب اسم الدواء الموصوف..."
                            value={otherText}
                            onChange={(e) =>
                              onChangeData({
                                [p.drugOtherKey]: e.target.value.slice(0, 30),
                              })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white text-slate-900"
                          />
                          <div className="text-[10px] text-slate-400 mt-0.5 text-left pl-1">
                            {otherText.length}/30
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Block 4: الإنسولين طويل المفعول (Glarus / Tresiba…) */}
          <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200 flex flex-col justify-between space-y-2.5 transition-all shadow-xs">
            {/* Block 4 Header */}
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between px-1">
                <span>الإنسولين طويل المفعول (Glarus / Tresiba…)</span>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                  diner d3
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 px-1">
                {currentD3Drug ? (
                  <span className="font-semibold text-blue-900">الدواء المحدد: {currentD3Drug}</span>
                ) : (
                  'الافتراضي: GLARUS / TRESIBA'
                )}
              </p>
            </div>

            {/* Toggle / Trigger button */}
            {!showLongActingList ? (
              <button
                type="button"
                onClick={() => setShowLongActingList(true)}
                className="w-full min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <ChevronDown className="w-4 h-4 text-slate-500" />
                <span>{currentD3Drug ? 'تغيير دواء الإنسولين الطويل' : 'اختيار الدواء'}</span>
              </button>
            ) : (
              <div className="space-y-2 pt-1 border-t border-slate-200/80 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    أدوية الإنسولين بطيء / ممتد المفعول:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleClearDrug('drug_d3', 'drugOther_d3');
                      setShowLongActingList(false);
                    }}
                    className="text-[10px] text-slate-500 hover:text-rose-600 flex items-center gap-0.5 transition-colors font-medium"
                    title="العودة إلى الوضع الافتراضي"
                  >
                    <X className="w-3 h-3" />
                    <span>إلغاء الاختيار</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {LONG_ACTING_DRUGS.map((drug) => {
                    const isSelected = data.drug_d3 === drug;
                    return (
                      <label
                        key={drug}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer min-h-[44px] transition-all select-none ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="drug_list_d3"
                            value={drug}
                            checked={isSelected}
                            onChange={() => handleSelectDrug('drug_d3', 'drugOther_d3', drug)}
                            className="sr-only"
                          />
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="text-xs">{drug}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </label>
                    );
                  })}

                  {/* Option: دواء آخر (غير مدرج) */}
                  <label
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs cursor-pointer min-h-[44px] transition-all select-none ${
                      data.drug_d3 === 'other'
                        ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="drug_list_d3"
                        value="other"
                        checked={data.drug_d3 === 'other'}
                        onChange={() => handleSelectDrug('drug_d3', 'drugOther_d3', 'other')}
                        className="sr-only"
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          data.drug_d3 === 'other'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {data.drug_d3 === 'other' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-xs">دواء آخر (غير مدرج)</span>
                    </div>
                    {data.drug_d3 === 'other' && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </label>

                  {/* Free text input if 'other' is chosen for d3 */}
                  {data.drug_d3 === 'other' && (
                    <div className="pt-1.5 px-0.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        maxLength={30}
                        placeholder="اكتب اسم الإنسولين الطويل الموصوف..."
                        value={data.drugOther_d3 || ''}
                        onChange={(e) =>
                          onChangeData({
                            drugOther_d3: e.target.value.slice(0, 30),
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-slate-900"
                      />
                      <div className="text-[10px] text-slate-400 mt-0.5 text-left pl-1">
                        {(data.drugOther_d3 || '').length}/30
                      </div>
                    </div>
                  )}

                  {/* Close / Return to default button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        handleClearDrug('drug_d3', 'drugOther_d3');
                        setShowLongActingList(false);
                      }}
                      className="px-2.5 py-1.5 text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors font-medium"
                    >
                      إلغاء الاختيار (العودة للافتراضي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLongActingList(false)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                      إغلاق القائمة
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
