import React, { useState } from 'react';
import {
  Syringe,
  Plus,
  Edit2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  GlycemiaData,
  getDrugName,
  getExtraInsulin,
  LONG_ACTING_DRUGS,
  RAPID_DRUGS,
  MIXED_DRUGS,
  ExtraInsulinItem,
} from '../types/glycemia';

interface InsulinPrescriptionProps {
  data: GlycemiaData;
  onChangeData: (updates: Partial<GlycemiaData>) => void;
}

type WizardCategory = 'lente' | 'rapide' | 'mixtes' | 'other';

export const InsulinPrescription: React.FC<InsulinPrescriptionProps> = ({
  data,
  onChangeData,
}) => {
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Wizard draft state
  const [selectedCategory, setSelectedCategory] = useState<WizardCategory | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<string>('');
  const [customDrugName, setCustomDrugName] = useState<string>('');
  const [selectedPeriods, setSelectedPeriods] = useState<{
    b2: boolean;
    l1: boolean;
    d1: boolean;
    extra: boolean;
  }>({
    b2: false,
    l1: false,
    d1: false,
    extra: false,
  });
  const [customPeriodLabel, setCustomPeriodLabel] = useState<string>('');

  // Read currently adopted drugs
  const drugB2 = getDrugName(data, 'b2');
  const drugL1 = getDrugName(data, 'l1');
  const drugD1 = getDrugName(data, 'd1');
  const drugD3 = getDrugName(data, 'd3');
  const extraList = getExtraInsulin(data);

  const hasAdoptedDrugs = Boolean(
    drugB2 || drugL1 || drugD1 || drugD3 || extraList.length > 0
  );

  // Reset wizard draft
  const resetDraft = () => {
    setWizardStep(1);
    setSelectedCategory(null);
    setSelectedDrug('');
    setCustomDrugName('');
    setSelectedPeriods({ b2: false, l1: false, d1: false, extra: false });
    setCustomPeriodLabel('');
  };

  const handleOpenWizard = () => {
    resetDraft();
    setIsWizardOpen(true);
  };

  const handleCancelWizard = () => {
    resetDraft();
    setIsWizardOpen(false);
  };

  const handleBackWizard = () => {
    if (wizardStep === 1) {
      setIsWizardOpen(false);
      resetDraft();
    } else if (wizardStep === 2) {
      setWizardStep(1);
    } else if (wizardStep === 3) {
      setWizardStep(2);
    }
  };

  // Grouping adopted drugs for the compact summary
  const groupedSummary = React.useMemo(() => {
    const map = new Map<string, string[]>();

    const add = (drug: string | null, period: string) => {
      if (!drug) return;
      const existing = map.get(drug) || [];
      existing.push(period);
      map.set(drug, existing);
    };

    add(drugB2, 'الصباح');
    add(drugL1, 'الغداء');
    add(drugD1, 'العشاء');
    add(drugD3, 'العمود المخصص للإنسولين طويل المفعول');

    extraList.forEach((item) => {
      if (item.drug && item.label) {
        add(item.drug, `فترة: ${item.label}`);
      }
    });

    return Array.from(map.entries()).map(([drug, periods]) => ({
      drug,
      periodsText: periods.join('، '),
    }));
  }, [drugB2, drugL1, drugD1, drugD3, extraList]);

  // Reset all adopted drugs back to original defaults
  const handleResetToDefaults = () => {
    const confirmed = window.confirm(
      'هل تريد مسح جميع الأدوية المعتمدة والعودة للأسماء الأصلية (NOVO rapid / NOVO Mix / GLARUS / TRESIBA)؟'
    );
    if (!confirmed) return;

    onChangeData({
      drug_b2: '',
      drugOther_b2: '',
      drug_l1: '',
      drugOther_l1: '',
      drug_d1: '',
      drugOther_d1: '',
      drug_d3: '',
      drugOther_d3: '',
      insExtra: [],
      ins_b2: 'rapid',
      ins_l1: 'rapid',
      ins_d1: 'mix',
    });
    setIsWizardOpen(false);
    resetDraft();
  };

  // Compute resolved draft drug name
  const effectiveDrugName = React.useMemo(() => {
    if (selectedCategory === 'other' || selectedDrug === 'other') {
      return customDrugName.trim();
    }
    return selectedDrug.trim();
  }, [selectedCategory, selectedDrug, customDrugName]);

  // Identify any conflicts where this drug would replace an existing one
  const conflicts = React.useMemo(() => {
    if (!effectiveDrugName) return [];
    const list: string[] = [];

    if (selectedCategory === 'lente') {
      if (drugD3 && drugD3 !== effectiveDrugName) {
        list.push(`سيحل ${effectiveDrugName} محل ${drugD3} في فترة العشاء (d3)`);
      }
      return list;
    }

    if (selectedPeriods.b2 && drugB2 && drugB2 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugB2} في فترة الصباح`);
    }
    if (selectedPeriods.l1 && drugL1 && drugL1 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugL1} في فترة الغداء`);
    }
    if (selectedPeriods.d1 && drugD1 && drugD1 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugD1} في فترة العشاء`);
    }

    return list;
  }, [selectedCategory, selectedPeriods, effectiveDrugName, drugB2, drugL1, drugD1, drugD3]);

  // Validation to enable «اعتماد»
  const isAdoptionValid = React.useMemo(() => {
    if (!effectiveDrugName) return false;

    if (selectedCategory === 'lente') {
      return true;
    }

    const hasAnyPeriod =
      selectedPeriods.b2 ||
      selectedPeriods.l1 ||
      selectedPeriods.d1 ||
      (selectedPeriods.extra && customPeriodLabel.trim().length > 0);

    return Boolean(hasAnyPeriod);
  }, [selectedCategory, effectiveDrugName, selectedPeriods, customPeriodLabel]);

  // Execute adoption
  const handleAdopt = () => {
    if (!isAdoptionValid) return;

    const updates: Partial<GlycemiaData> = {};
    const isCustom = selectedCategory === 'other' || selectedDrug === 'other';
    const drugVal = isCustom ? 'other' : selectedDrug;
    const drugOtherVal = isCustom ? customDrugName.trim() : '';

    if (selectedCategory === 'lente') {
      updates.drug_d3 = drugVal;
      updates.drugOther_d3 = drugOtherVal;
    } else {
      const isMixed =
        selectedCategory === 'mixtes' ||
        effectiveDrugName.toLowerCase().includes('mix');
      const cat = isMixed ? 'mix' : 'rapid';

      if (selectedPeriods.b2) {
        updates.drug_b2 = drugVal;
        updates.drugOther_b2 = drugOtherVal;
        updates.ins_b2 = cat;
      }
      if (selectedPeriods.l1) {
        updates.drug_l1 = drugVal;
        updates.drugOther_l1 = drugOtherVal;
        updates.ins_l1 = cat;
      }
      if (selectedPeriods.d1) {
        updates.drug_d1 = drugVal;
        updates.drugOther_d1 = drugOtherVal;
        updates.ins_d1 = cat;
      }
      if (selectedPeriods.extra && customPeriodLabel.trim()) {
        const extraLabel = customPeriodLabel.trim();
        const curExtra = getExtraInsulin(data);
        const filtered = curExtra.filter((x) => x.label !== extraLabel);
        filtered.push({ drug: effectiveDrugName, label: extraLabel });
        updates.insExtra = filtered;
      }
    }

    onChangeData(updates);
    setIsWizardOpen(false);
    resetDraft();
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs no-print">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* ========================================================= */}
        {/* VIEW 1: Initial Default View (No drug chosen, Wizard closed) */}
        {/* ========================================================= */}
        {!isWizardOpen && !hasAdoptedDrugs && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Syringe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  نوع الإنسولين حسب وصفة الطبيب لكل فترة
                </h3>
                <p className="text-[11px] text-slate-500">
                  لم يتم تحديد أدوية مخصصة؛ النموذج يعتمد الأسماء الافتراضية الأصلية (NOVO rapid / NOVO Mix / GLARUS / TRESIBA)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenWizard}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>اختيار الإنسولين</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: Compact Summary View (Adopted Drugs Exist, Wizard closed) */}
        {/* ========================================================= */}
        {!isWizardOpen && hasAdoptedDrugs && (
          <div className="space-y-3 py-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    نوع الإنسولين حسب وصفة الطبيب لكل فترة
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    الأدوية المعتمدة حسب وصفة الطبيب (تنعكس فورًا في الجداول والطباعة والتصدير)
                  </p>
                </div>
              </div>

              {/* Action Buttons in Summary View (All >= 44px min-h) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenWizard}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة إنسولين آخر</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenWizard}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="العودة للأسماء الأصلية"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>إعادة الأسماء الأصلية</span>
                </button>
              </div>
            </div>

            {/* Compact Grouped Items (Grouped by Drug) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {groupedSummary.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/90 rounded-xl p-3 border border-slate-200 flex flex-col justify-center"
                >
                  <div className="font-bold text-xs text-slate-900 leading-tight">
                    {item.drug}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>{item.periodsText}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: Step-by-Step Wizard (when isWizardOpen is true) */}
        {/* ========================================================= */}
        {isWizardOpen && (
          <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-purple-200/80 shadow-sm space-y-4 animate-in fade-in duration-200">
            {/* Wizard Header & Progress Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                  {wizardStep}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    معالج اختيار الإنسولين
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {wizardStep === 1 && 'الخطوة 1: اختر نوع الإنسولين من القائمة'}
                    {wizardStep === 2 && 'الخطوة 2: اختر اسم الدواء المحدد'}
                    {wizardStep === 3 && 'الخطوة 3: حدد الفترات والوجبات المعتمدة لهذا الدواء'}
                  </p>
                </div>
              </div>

              {/* Progress Steps Indicators */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold ${
                    wizardStep === 1
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  1. النوع
                </span>
                <span>←</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold ${
                    wizardStep === 2
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  2. الدواء
                </span>
                {selectedCategory !== 'lente' && (
                  <>
                    <span>←</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        wizardStep === 3
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      3. الفترات
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* STEP 1: Main Category Selection */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 block">
                  اختر فئة الإنسولين التي وصفها طبيبك:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'lente' as WizardCategory,
                      title: 'Insulines à action lente / prolongée',
                      sub: 'إنسولين طويل المفعول (قاعدي)',
                    },
                    {
                      key: 'rapide' as WizardCategory,
                      title: 'Insulines à action rapide',
                      sub: 'إنسولين سريع المفعول',
                    },
                    {
                      key: 'mixtes' as WizardCategory,
                      title: 'Insulines mixtes / prémixées',
                      sub: 'إنسولين مختلط مسبقًا',
                    },
                    {
                      key: 'other' as WizardCategory,
                      title: 'أخرى (للمستخدم، إذا كان نوعه غير مدرج)',
                      sub: 'إدخال دواء ونوع غير مدرج في القوائم',
                    },
                  ].map((cat) => {
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <label
                        key={cat.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                          isSelected
                            ? 'bg-purple-50/70 border-purple-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-100/70'
                        }`}
                        onClick={() => {
                          setSelectedCategory(cat.key);
                          setSelectedDrug('');
                          setCustomDrugName('');
                          setWizardStep(2);
                        }}
                      >
                        <input
                          type="radio"
                          name="wizard_category"
                          value={cat.key}
                          checked={isSelected}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-slate-400 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {cat.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {cat.sub}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Drug Selection for the chosen Category */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {selectedCategory === 'lente' && 'أدوية الإنسولين طويل المفعول (lente):'}
                    {selectedCategory === 'rapide' && 'أدوية الإنسولين السريع (rapide):'}
                    {selectedCategory === 'mixtes' && 'أدوية الإنسولين المختلط (mixtes):'}
                    {selectedCategory === 'other' && 'اكتب اسم الدواء غير المدرج:'}
                  </label>
                  <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                    {selectedCategory === 'lente' && 'عمود d3 في الورقة'}
                    {selectedCategory === 'rapide' && 'إنسولين سريع'}
                    {selectedCategory === 'mixtes' && 'إنسولين مختلط'}
                    {selectedCategory === 'other' && 'دواء حر'}
                  </span>
                </div>

                {/* If selectedCategory has a predefined drug list */}
                {selectedCategory !== 'other' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(selectedCategory === 'lente'
                      ? LONG_ACTING_DRUGS
                      : selectedCategory === 'rapide'
                      ? RAPID_DRUGS
                      : MIXED_DRUGS
                    ).map((drug) => {
                      const isSelected = selectedDrug === drug;
                      return (
                        <label
                          key={drug}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                            isSelected
                              ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setSelectedDrug(drug);
                            setCustomDrugName('');
                            if (selectedCategory !== 'lente') {
                              setWizardStep(3);
                            }
                          }}
                        >
                          <input
                            type="radio"
                            name="wizard_drug"
                            value={drug}
                            checked={isSelected}
                            onChange={() => {}}
                            className="sr-only"
                          />
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'border-purple-600 bg-purple-600'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                          <span className="text-xs">{drug}</span>
                        </label>
                      );
                    })}

                    {/* Unlisted option inside category */}
                    <label
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                        selectedDrug === 'other'
                          ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedDrug('other')}
                    >
                      <input
                        type="radio"
                        name="wizard_drug"
                        value="other"
                        checked={selectedDrug === 'other'}
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          selectedDrug === 'other'
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {selectedDrug === 'other' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="text-xs">دواء آخر (غير مدرج)</span>
                    </label>
                  </div>
                )}

                {/* Free Text Input for unlisted drug */}
                {(selectedCategory === 'other' || selectedDrug === 'other') && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-800 block">
                      اكتب اسم الدواء كما وصفه طبيبك (حد أقصى 30 حرفًا):
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      autoFocus
                      placeholder="مثال: Fiasp, Degludec..."
                      value={customDrugName}
                      onChange={(e) => setCustomDrugName(e.target.value.slice(0, 30))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-slate-900"
                    />
                    <div className="text-[10px] text-slate-400 text-left pl-1">
                      {customDrugName.length}/30 حرف
                    </div>
                  </div>
                )}

                {/* Lente specific note & direct confirmation message */}
                {selectedCategory === 'lente' && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>تأكيد اعتماد الإنسولين طويل المفعول:</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      الإنسولين طويل المفعول (Lente) مخصص له عمود دائم في الورقة السريرية (العشاء d3).
                      عند الاعتماد سيتم تعيين هذا الدواء مباشرة دون الحاجة لاختيار فترات.
                    </p>
                  </div>
                )}

                {/* Conflict warning if replacing an existing d3 drug */}
                {conflicts.length > 0 && selectedCategory === 'lente' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      {conflicts.map((c, i) => (
                        <div key={i} className="font-bold">{c}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proceed button to step 3 for non-lente */}
                {selectedCategory !== 'lente' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!effectiveDrugName}
                      onClick={() => setWizardStep(3)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>متابعة لاختيار الفترات</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Period Selection (Only for non-lente) */}
            {wizardStep === 3 && selectedCategory !== 'lente' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    الفترات المعتمدة للدواء: <span className="text-purple-700">{effectiveDrugName}</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    (اختر فترة واحدة على الأقل)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Period b2 */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                      selectedPeriods.b2
                        ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeriods.b2}
                      onChange={(e) =>
                        setSelectedPeriods((prev) => ({ ...prev, b2: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        selectedPeriods.b2
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {selectedPeriods.b2 && <Check className="w-3 h-3" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold">الصباح (petit déjeuner)</div>
                      <div className="text-[10px] text-slate-500">العمود b2 في الورقة</div>
                    </div>
                  </label>

                  {/* Period l1 */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                      selectedPeriods.l1
                        ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeriods.l1}
                      onChange={(e) =>
                        setSelectedPeriods((prev) => ({ ...prev, l1: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        selectedPeriods.l1
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {selectedPeriods.l1 && <Check className="w-3 h-3" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold">الغداء (déjeuner)</div>
                      <div className="text-[10px] text-slate-500">العمود l1 في الورقة</div>
                    </div>
                  </label>

                  {/* Period d1 */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                      selectedPeriods.d1
                        ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeriods.d1}
                      onChange={(e) =>
                        setSelectedPeriods((prev) => ({ ...prev, d1: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        selectedPeriods.d1
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {selectedPeriods.d1 && <Check className="w-3 h-3" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold">العشاء (diner)</div>
                      <div className="text-[10px] text-slate-500">العمود d1 في الورقة</div>
                    </div>
                  </label>

                  {/* Period Extra */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer min-h-[44px] transition-all select-none ${
                      selectedPeriods.extra
                        ? 'bg-purple-50/80 border-purple-500 text-purple-950 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeriods.extra}
                      onChange={(e) =>
                        setSelectedPeriods((prev) => ({ ...prev, extra: e.target.checked }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        selectedPeriods.extra
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {selectedPeriods.extra && <Check className="w-3 h-3" />}
                    </span>
                    <div>
                      <div className="text-xs font-bold">أخرى (فترة إضافية)</div>
                      <div className="text-[10px] text-slate-500">قد يضيف الطبيب فترة أخرى</div>
                    </div>
                  </label>
                </div>

                {/* Free Text Input for Extra Period Label */}
                {selectedPeriods.extra && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-xs font-bold text-slate-800 block">
                      اكتب اسم الفترة الإضافية (حد أقصى 30 حرفًا):
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      autoFocus
                      placeholder="مثال: الظهيرة، قبل النوم، الرابعة عصرًا..."
                      value={customPeriodLabel}
                      onChange={(e) => setCustomPeriodLabel(e.target.value.slice(0, 30))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-slate-900"
                    />
                    <div className="text-[10px] text-slate-400 text-left pl-1">
                      {customPeriodLabel.length}/30 حرف
                    </div>
                  </div>
                )}

                {/* Explicit Conflict Warnings */}
                {conflicts.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900">تنبيه استبدال دواء سابق:</div>
                      {conflicts.map((c, i) => (
                        <div key={i} className="text-amber-950 font-semibold">• {c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* BOTTOM BUTTONS (Persistent in each step, >= 44px touch height) */}
            {/* ========================================================= */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {/* Button: تراجع */}
                <button
                  type="button"
                  onClick={handleBackWizard}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>تراجع</span>
                </button>

                {/* Button: إلغاء */}
                <button
                  type="button"
                  onClick={handleCancelWizard}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </div>

              {/* Button: اعتماد (Active in final step) */}
              {(wizardStep === 3 || (wizardStep === 2 && selectedCategory === 'lente')) && (
                <button
                  type="button"
                  disabled={!isAdoptionValid}
                  onClick={handleAdopt}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد الاختيار</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
