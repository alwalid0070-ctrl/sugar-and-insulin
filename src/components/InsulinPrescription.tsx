import React, { useState, useMemo } from 'react';
import {
  Syringe,
  Plus,
  Edit2,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';
import {
  GlycemiaData,
  getDrugName,
  getExtraInsulin,
  getFixedPeriodLabel,
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

export const SLOT_OPTIONS = [
  { value: 0 as const, label: 'قبل الصباح' },
  { value: 1 as const, label: 'بين الصباح والغداء' },
  { value: 2 as const, label: 'بين الغداء والعشاء' },
  { value: 3 as const, label: 'بعد العشاء' },
];

export const InsulinPrescription: React.FC<InsulinPrescriptionProps> = ({
  data,
  onChangeData,
}) => {
  // Mode state: 'view' (default / summary), 'wizard' (adding new insulin), 'edit' (editing periods/positions)
  const [mode, setMode] = useState<'view' | 'wizard' | 'edit'>('view');
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
  const [wizardExtraLabel, setWizardExtraLabel] = useState<string>('');
  const [wizardExtraSlot, setWizardExtraSlot] = useState<0 | 1 | 2 | 3>(3);

  // Inline editing state for fixed period labels inside Wizard / Edit mode
  const [editingFixedSlot, setEditingFixedSlot] = useState<'b2' | 'l1' | 'd1' | null>(null);
  const [fixedLabelDraft, setFixedLabelDraft] = useState<string>('');

  // Draft state for Edit Mode (modifying existing extra items & fixed labels)
  const [draftExtraList, setDraftExtraList] = useState<ExtraInsulinItem[]>([]);
  const [draftFixedLabels, setDraftFixedLabels] = useState<{
    b2: string;
    l1: string;
    d1: string;
  }>({ b2: '', l1: '', d1: '' });

  // Inline editing for a specific extra period label in Edit Mode
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [extraLabelDraft, setExtraLabelDraft] = useState<string>('');

  // Read current adopted drugs
  const drugB2 = getDrugName(data, 'b2');
  const drugL1 = getDrugName(data, 'l1');
  const drugD1 = getDrugName(data, 'd1');
  const drugD3 = getDrugName(data, 'd3');
  const extraList = getExtraInsulin(data);

  const hasAdoptedDrugs = Boolean(
    drugB2 || drugL1 || drugD1 || drugD3 || extraList.length > 0
  );

  // Normalize order in draft extra list
  const normalizeOrders = (items: ExtraInsulinItem[]): ExtraInsulinItem[] => {
    const result: ExtraInsulinItem[] = [];
    [0, 1, 2, 3].forEach((s) => {
      const inSlot = items.filter((x) => (x.slot ?? 3) === s).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      inSlot.forEach((item, idx) => {
        result.push({
          ...item,
          slot: s as 0 | 1 | 2 | 3,
          order: idx,
        });
      });
    });
    return result;
  };

  // Reset wizard draft
  const resetWizardDraft = () => {
    setWizardStep(1);
    setSelectedCategory(null);
    setSelectedDrug('');
    setCustomDrugName('');
    setSelectedPeriods({ b2: false, l1: false, d1: false, extra: false });
    setWizardExtraLabel('');
    setWizardExtraSlot(3);
    setEditingFixedSlot(null);
    setFixedLabelDraft('');
  };

  const handleOpenWizard = () => {
    resetWizardDraft();
    setMode('wizard');
  };

  const handleOpenEditMode = () => {
    setDraftExtraList(getExtraInsulin(data));
    setDraftFixedLabels({
      b2: data.periodLabel_b2 || '',
      l1: data.periodLabel_l1 || '',
      d1: data.periodLabel_d1 || '',
    });
    setEditingExtraId(null);
    setExtraLabelDraft('');
    setEditingFixedSlot(null);
    setFixedLabelDraft('');
    setMode('edit');
  };

  const handleCancelAll = () => {
    resetWizardDraft();
    setMode('view');
  };

  const handleBackWizard = () => {
    if (wizardStep === 1) {
      setMode('view');
      resetWizardDraft();
    } else if (wizardStep === 2) {
      setWizardStep(1);
    } else if (wizardStep === 3) {
      setWizardStep(2);
    }
  };

  // Build Unified Timeline of items (Slot 0 -> Morning -> Slot 1 -> Lunch -> Slot 2 -> Dinner -> Slot 3)
  type TimelineItem =
    | {
        type: 'fixed';
        slotKey: 'b2' | 'l1' | 'd1';
        label: string;
        defaultLabel: string;
        drug: string | null;
      }
    | {
        type: 'extra';
        item: ExtraInsulinItem;
      };

  const buildTimeline = (
    currentExtraList: ExtraInsulinItem[],
    fixedLabels: { b2: string; l1: string; d1: string }
  ): TimelineItem[] => {
    const res: TimelineItem[] = [];

    // Slot 0: قبل الصباح
    currentExtraList
      .filter((x) => (x.slot ?? 3) === 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((item) => res.push({ type: 'extra', item }));

    // Fixed b2
    res.push({
      type: 'fixed',
      slotKey: 'b2',
      label: fixedLabels.b2.trim() || 'الصباح',
      defaultLabel: 'الصباح',
      drug: drugB2,
    });

    // Slot 1: بين الصباح والغداء
    currentExtraList
      .filter((x) => (x.slot ?? 3) === 1)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((item) => res.push({ type: 'extra', item }));

    // Fixed l1
    res.push({
      type: 'fixed',
      slotKey: 'l1',
      label: fixedLabels.l1.trim() || 'الغداء',
      defaultLabel: 'الغداء',
      drug: drugL1,
    });

    // Slot 2: بين الغداء والعشاء
    currentExtraList
      .filter((x) => (x.slot ?? 3) === 2)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((item) => res.push({ type: 'extra', item }));

    // Fixed d1
    res.push({
      type: 'fixed',
      slotKey: 'd1',
      label: fixedLabels.d1.trim() || 'العشاء',
      defaultLabel: 'العشاء',
      drug: drugD1,
    });

    // Slot 3: بعد العشاء
    currentExtraList
      .filter((x) => (x.slot ?? 3) === 3)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((item) => res.push({ type: 'extra', item }));

    return res;
  };

  // Timeline for Edit Mode
  const editTimeline = useMemo(() => {
    return buildTimeline(draftExtraList, draftFixedLabels);
  }, [draftExtraList, draftFixedLabels, drugB2, drugL1, drugD1]);

  // Timeline for Display / Summary View
  const displayTimeline = useMemo(() => {
    return buildTimeline(extraList, {
      b2: data.periodLabel_b2 || '',
      l1: data.periodLabel_l1 || '',
      d1: data.periodLabel_d1 || '',
    });
  }, [extraList, data.periodLabel_b2, data.periodLabel_l1, data.periodLabel_d1, drugB2, drugL1, drugD1]);

  // Grouped Summary by drug in chronological order
  const groupedSummary = useMemo(() => {
    const map = new Map<string, string[]>();

    const add = (drug: string | null, period: string) => {
      if (!drug) return;
      const existing = map.get(drug) || [];
      existing.push(period);
      map.set(drug, existing);
    };

    // Iterate through the chronological display timeline
    displayTimeline.forEach((t) => {
      if (t.type === 'fixed' && t.drug) {
        add(t.drug, t.label);
      } else if (t.type === 'extra' && t.item.drug) {
        add(t.item.drug, `فترة: ${t.item.label}`);
      }
    });

    // Also add long-acting basal if set
    if (drugD3) {
      add(drugD3, 'العمود المخصص للإنسولين طويل المفعول');
    }

    return Array.from(map.entries()).map(([drug, periods]) => ({
      drug,
      periodsText: periods.join('، '),
    }));
  }, [displayTimeline, drugD3]);

  // Move Extra Item Up in Edit Mode
  const handleMoveExtraUp = (itemId: string) => {
    const idx = editTimeline.findIndex((t) => t.type === 'extra' && t.item.id === itemId);
    if (idx <= 0) return; // already at top

    const currentItem = draftExtraList.find((x) => x.id === itemId);
    if (!currentItem) return;

    const prevItem = editTimeline[idx - 1];

    if (prevItem.type === 'extra') {
      // Swap order with previous extra item in same slot
      const otherId = prevItem.item.id;
      setDraftExtraList((prev) => {
        const a = prev.find((x) => x.id === itemId);
        const b = prev.find((x) => x.id === otherId);
        if (!a || !b) return prev;
        return normalizeOrders(
          prev.map((x) =>
            x.id === itemId ? { ...x, order: b.order } : x.id === otherId ? { ...x, order: a.order } : x
          )
        );
      });
    } else {
      // Moves above a fixed period!
      // If prev is b2 (morning), new slot is 0 (before morning)
      // If prev is l1 (lunch), new slot is 1 (between morning and lunch)
      // If prev is d1 (dinner), new slot is 2 (between lunch and dinner)
      let newSlot: 0 | 1 | 2 | 3 = 0;
      if (prevItem.slotKey === 'b2') newSlot = 0;
      else if (prevItem.slotKey === 'l1') newSlot = 1;
      else if (prevItem.slotKey === 'd1') newSlot = 2;

      setDraftExtraList((prev) => {
        const next = prev.map((x) => {
          if (x.id === itemId) {
            return { ...x, slot: newSlot, order: 999 };
          }
          return x;
        });
        return normalizeOrders(next);
      });
    }
  };

  // Move Extra Item Down in Edit Mode
  const handleMoveExtraDown = (itemId: string) => {
    const idx = editTimeline.findIndex((t) => t.type === 'extra' && t.item.id === itemId);
    if (idx < 0 || idx >= editTimeline.length - 1) return; // already at bottom

    const currentItem = draftExtraList.find((x) => x.id === itemId);
    if (!currentItem) return;

    const nextItem = editTimeline[idx + 1];

    if (nextItem.type === 'extra') {
      // Swap order with next extra item in same slot
      const otherId = nextItem.item.id;
      setDraftExtraList((prev) => {
        const a = prev.find((x) => x.id === itemId);
        const b = prev.find((x) => x.id === otherId);
        if (!a || !b) return prev;
        return normalizeOrders(
          prev.map((x) =>
            x.id === itemId ? { ...x, order: b.order } : x.id === otherId ? { ...x, order: a.order } : x
          )
        );
      });
    } else {
      // Moves below a fixed period!
      // If next is b2 (morning), new slot is 1 (between morning & lunch)
      // If next is l1 (lunch), new slot is 2 (between lunch & dinner)
      // If next is d1 (dinner), new slot is 3 (after dinner)
      let newSlot: 0 | 1 | 2 | 3 = 1;
      if (nextItem.slotKey === 'b2') newSlot = 1;
      else if (nextItem.slotKey === 'l1') newSlot = 2;
      else if (nextItem.slotKey === 'd1') newSlot = 3;

      setDraftExtraList((prev) => {
        const next = prev.map((x) => {
          if (x.id === itemId) {
            return { ...x, slot: newSlot, order: -1 };
          }
          return x;
        });
        return normalizeOrders(next);
      });
    }
  };

  // Change slot via Dropdown in Edit Mode
  const handleChangeSlot = (itemId: string, newSlot: 0 | 1 | 2 | 3) => {
    setDraftExtraList((prev) => {
      const next = prev.map((x) => {
        if (x.id === itemId) {
          return { ...x, slot: newSlot, order: 999 };
        }
        return x;
      });
      return normalizeOrders(next);
    });
  };

  // Delete Extra Period in Edit Mode
  const handleDeleteExtra = (itemId: string) => {
    setDraftExtraList((prev) => normalizeOrders(prev.filter((x) => x.id !== itemId)));
  };

  // Save changes made in Edit Mode
  const handleSaveEditMode = () => {
    onChangeData({
      insExtra: draftExtraList,
      periodLabel_b2: draftFixedLabels.b2.trim() || undefined,
      periodLabel_l1: draftFixedLabels.l1.trim() || undefined,
      periodLabel_d1: draftFixedLabels.d1.trim() || undefined,
    });
    setMode('view');
  };

  // Reset to original defaults
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
      periodLabel_b2: '',
      periodLabel_l1: '',
      periodLabel_d1: '',
      insExtra: [],
      ins_b2: 'rapid',
      ins_l1: 'rapid',
      ins_d1: 'mix',
    });
    setMode('view');
    resetWizardDraft();
  };

  // Effective drug name in Wizard
  const effectiveDrugName = useMemo(() => {
    if (selectedCategory === 'other' || selectedDrug === 'other') {
      return customDrugName.trim();
    }
    return selectedDrug.trim();
  }, [selectedCategory, selectedDrug, customDrugName]);

  // Conflicts checking in Wizard
  const conflicts = useMemo(() => {
    if (!effectiveDrugName) return [];
    const list: string[] = [];

    if (selectedCategory === 'lente') {
      if (drugD3 && drugD3 !== effectiveDrugName) {
        list.push(`سيحل ${effectiveDrugName} محل ${drugD3} في العمود المخصص للإنسولين طويل المفعول`);
      }
      return list;
    }

    const b2Label = getFixedPeriodLabel(data, 'b2');
    const l1Label = getFixedPeriodLabel(data, 'l1');
    const d1Label = getFixedPeriodLabel(data, 'd1');

    if (selectedPeriods.b2 && drugB2 && drugB2 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugB2} في فترة ${b2Label}`);
    }
    if (selectedPeriods.l1 && drugL1 && drugL1 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugL1} في فترة ${l1Label}`);
    }
    if (selectedPeriods.d1 && drugD1 && drugD1 !== effectiveDrugName) {
      list.push(`سيحل ${effectiveDrugName} محل ${drugD1} في فترة ${d1Label}`);
    }

    return list;
  }, [selectedCategory, selectedPeriods, effectiveDrugName, drugB2, drugL1, drugD1, drugD3, data]);

  // Validation in Wizard
  const isAdoptionValid = useMemo(() => {
    if (!effectiveDrugName) return false;

    if (selectedCategory === 'lente') return true;

    const hasFixedPeriod = selectedPeriods.b2 || selectedPeriods.l1 || selectedPeriods.d1;
    const hasValidExtra = selectedPeriods.extra && wizardExtraLabel.trim().length > 0;

    return Boolean(hasFixedPeriod || hasValidExtra);
  }, [selectedCategory, effectiveDrugName, selectedPeriods, wizardExtraLabel]);

  // Wizard Adopt Action
  const handleAdoptWizard = () => {
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

      if (selectedPeriods.extra && wizardExtraLabel.trim()) {
        const extraLabel = wizardExtraLabel.trim().slice(0, 30);
        const curExtra = getExtraInsulin(data);

        // Check max 5 extra periods limit
        if (curExtra.length < 5) {
          const maxOrderInSlot = curExtra
            .filter((x) => (x.slot ?? 3) === wizardExtraSlot)
            .reduce((max, x) => Math.max(max, x.order ?? 0), -1);

          const newItem: ExtraInsulinItem = {
            id: `extra_${Date.now()}`,
            label: extraLabel,
            drug: effectiveDrugName,
            drugOther: drugOtherVal || undefined,
            slot: wizardExtraSlot,
            order: maxOrderInSlot + 1,
          };

          const merged = [...curExtra, newItem];
          updates.insExtra = normalizeOrders(merged);
        }
      }
    }

    onChangeData(updates);
    setMode('view');
    resetWizardDraft();
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs no-print">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* ========================================================= */}
        {/* VIEW 1: Initial Default View (No drug chosen, mode: 'view') */}
        {/* ========================================================= */}
        {mode === 'view' && !hasAdoptedDrugs && (
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
        {/* VIEW 2: Summary View (Adopted Drugs Exist, mode: 'view') */}
        {/* ========================================================= */}
        {mode === 'view' && hasAdoptedDrugs && (
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
                    الأدوية المعتمدة حسب وصفة الطبيب مرتبة زمنيًا
                  </p>
                </div>
              </div>

              {/* Action Buttons in Summary View (All >= 44px) */}
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
                  onClick={handleOpenEditMode}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>تعديل الفترات والأسماء</span>
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

            {/* Compact Grouped Items (Chronological Periods per Drug) */}
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
        {/* VIEW 3: Dedicated Edit Mode (Editing periods, names, positions) */}
        {/* ========================================================= */}
        {mode === 'edit' && (
          <div className="bg-slate-50/95 rounded-2xl p-4 sm:p-5 border border-purple-300 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-purple-600" />
                  <span>تعديل أسماء وأماكن الفترات المعتمدة</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  يمكنك تعديل أسماء الوجبات، وتغيير ترتيب الفترات الإضافية بنقلها لأعلى أو لأسفل أو اختيار مكانها
                </p>
              </div>
              <div className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg">
                الفترات الإضافية: {draftExtraList.length} / 5
              </div>
            </div>

            {/* Unified Ordered List */}
            <div className="space-y-2.5">
              {editTimeline.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === editTimeline.length - 1;

                if (item.type === 'fixed') {
                  const isEditingThisFixed = editingFixedSlot === item.slotKey;
                  const customVal = draftFixedLabels[item.slotKey];

                  return (
                    <div
                      key={`fixed_${item.slotKey}`}
                      className="bg-white rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{item.label}</span>
                            {customVal && (
                              <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-normal">
                                مخصص
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.defaultLabel} (ثابتة) — الدواء:{' '}
                            <span className="font-semibold text-slate-700">
                              {item.drug || 'الافتراضي'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit Name Button / Input for Fixed Period */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!isEditingThisFixed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFixedSlot(item.slotKey);
                              setFixedLabelDraft(customVal || item.defaultLabel);
                            }}
                            className="min-h-[44px] px-3 py-1.5 text-xs text-slate-700 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-xl transition-colors font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل الاسم</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              maxLength={30}
                              value={fixedLabelDraft}
                              onChange={(e) => setFixedLabelDraft(e.target.value.slice(0, 30))}
                              className="px-2.5 py-1 text-xs border border-purple-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300 w-36"
                              placeholder={item.defaultLabel}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setDraftFixedLabels((prev) => ({
                                  ...prev,
                                  [item.slotKey]: fixedLabelDraft.trim(),
                                }));
                                setEditingFixedSlot(null);
                              }}
                              className="min-h-[44px] px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              حفظ
                            </button>
                            {customVal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftFixedLabels((prev) => ({
                                    ...prev,
                                    [item.slotKey]: '',
                                  }));
                                  setEditingFixedSlot(null);
                                }}
                                className="min-h-[44px] px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="إعادة الاسم الأصلي"
                              >
                                إعادة الأصلي
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingFixedSlot(null)}
                              className="min-h-[44px] px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Extra Period Item
                const extraItem = item.item;
                const isEditingThisExtra = editingExtraId === extraItem.id;

                return (
                  <div
                    key={`extra_${extraItem.id}`}
                    className="bg-purple-50/60 rounded-xl p-3 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                      <div>
                        {!isEditingThisExtra ? (
                          <div className="text-xs font-bold text-purple-950 flex items-center gap-2">
                            <span>{extraItem.label}</span>
                            <span className="text-[10px] text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded font-normal">
                              فترة إضافية
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              maxLength={30}
                              value={extraLabelDraft}
                              onChange={(e) => setExtraLabelDraft(e.target.value.slice(0, 30))}
                              className="px-2.5 py-1 text-xs border border-purple-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300 w-44"
                              placeholder="اسم الفترة..."
                            />
                            <button
                              type="button"
                              disabled={!extraLabelDraft.trim()}
                              onClick={() => {
                                if (!extraLabelDraft.trim()) return;
                                setDraftExtraList((prev) =>
                                  prev.map((x) =>
                                    x.id === extraItem.id
                                      ? { ...x, label: extraLabelDraft.trim().slice(0, 30) }
                                      : x
                                  )
                                );
                                setEditingExtraId(null);
                              }}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExtraId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          الدواء:{' '}
                          <span className="font-semibold text-purple-900">
                            {extraItem.drug}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls: Dropdown + Up/Down + Rename + Delete */}
                    <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto">
                      {/* Dropdown: المكان */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">المكان:</span>
                        <select
                          value={extraItem.slot ?? 3}
                          onChange={(e) =>
                            handleChangeSlot(extraItem.id!, Number(e.target.value) as 0 | 1 | 2 | 3)
                          }
                          className="text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 min-h-[44px]"
                        >
                          {SLOT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Button: Up ↑ (min-h 44px) */}
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveExtraUp(extraItem.id!)}
                        className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border flex items-center justify-center transition-all ${
                          isFirst
                            ? 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-100'
                            : 'border-slate-300 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 cursor-pointer shadow-2xs'
                        }`}
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Button: Down ↓ (min-h 44px) */}
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMoveExtraDown(extraItem.id!)}
                        className={`min-h-[44px] min-w-[44px] p-2 rounded-xl border flex items-center justify-center transition-all ${
                          isLast
                            ? 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-100'
                            : 'border-slate-300 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 cursor-pointer shadow-2xs'
                        }`}
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Rename Extra Button */}
                      {!isEditingThisExtra && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExtraId(extraItem.id!);
                            setExtraLabelDraft(extraItem.label);
                          }}
                          className="min-h-[44px] px-3 py-2 text-xs text-slate-700 hover:text-purple-700 hover:bg-white border border-slate-200 rounded-xl transition-colors font-medium flex items-center gap-1 cursor-pointer"
                          title="تعديل اسم الفترة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تعديل الاسم</span>
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteExtra(extraItem.id!)}
                        className="min-h-[44px] min-w-[44px] p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                        title="حذف الفترة الإضافية"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Buttons in Edit Mode (>= 44px) */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelAll}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>تراجع</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelAll}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveEditMode}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد التعديلات</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: Step-by-Step Wizard (mode: 'wizard') */}
        {/* ========================================================= */}
        {mode === 'wizard' && (
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

                {/* Lente specific note */}
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
                  <div className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
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
                        <div className="text-xs font-bold text-slate-900">
                          {getFixedPeriodLabel(data, 'b2')} (petit déjeuner)
                        </div>
                        <div className="text-[10px] text-slate-500">العمود b2 في الورقة</div>
                      </div>
                    </label>

                    {/* Inline edit label trigger for b2 */}
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {editingFixedSlot !== 'b2' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFixedSlot('b2');
                            setFixedLabelDraft(data.periodLabel_b2 || 'الصباح');
                          }}
                          className="text-[10px] text-slate-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل الاسم</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            maxLength={30}
                            value={fixedLabelDraft}
                            onChange={(e) => setFixedLabelDraft(e.target.value.slice(0, 30))}
                            className="px-2 py-0.5 text-xs border border-purple-300 rounded w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onChangeData({ periodLabel_b2: fixedLabelDraft.trim() || undefined });
                              setEditingFixedSlot(null);
                            }}
                            className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold"
                          >
                            حفظ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Period l1 */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
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
                        <div className="text-xs font-bold text-slate-900">
                          {getFixedPeriodLabel(data, 'l1')} (déjeuner)
                        </div>
                        <div className="text-[10px] text-slate-500">العمود l1 في الورقة</div>
                      </div>
                    </label>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {editingFixedSlot !== 'l1' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFixedSlot('l1');
                            setFixedLabelDraft(data.periodLabel_l1 || 'الغداء');
                          }}
                          className="text-[10px] text-slate-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل الاسم</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            maxLength={30}
                            value={fixedLabelDraft}
                            onChange={(e) => setFixedLabelDraft(e.target.value.slice(0, 30))}
                            className="px-2 py-0.5 text-xs border border-purple-300 rounded w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onChangeData({ periodLabel_l1: fixedLabelDraft.trim() || undefined });
                              setEditingFixedSlot(null);
                            }}
                            className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold"
                          >
                            حفظ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Period d1 */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
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
                        <div className="text-xs font-bold text-slate-900">
                          {getFixedPeriodLabel(data, 'd1')} (diner)
                        </div>
                        <div className="text-[10px] text-slate-500">العمود d1 في الورقة</div>
                      </div>
                    </label>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      {editingFixedSlot !== 'd1' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFixedSlot('d1');
                            setFixedLabelDraft(data.periodLabel_d1 || 'العشاء');
                          }}
                          className="text-[10px] text-slate-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل الاسم</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            maxLength={30}
                            value={fixedLabelDraft}
                            onChange={(e) => setFixedLabelDraft(e.target.value.slice(0, 30))}
                            className="px-2 py-0.5 text-xs border border-purple-300 rounded w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onChangeData({ periodLabel_d1: fixedLabelDraft.trim() || undefined });
                              setEditingFixedSlot(null);
                            }}
                            className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold"
                          >
                            حفظ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Period Extra */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2">
                    <label className={`flex items-center gap-3 select-none ${extraList.length >= 5 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        disabled={extraList.length >= 5}
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
                        <div className="text-xs font-bold text-slate-900">أخرى (فترة إضافية)</div>
                        <div className="text-[10px] text-slate-500">قد يضيف الطبيب فترة أخرى</div>
                      </div>
                    </label>

                    <div className={`text-[10px] ${extraList.length >= 5 ? 'text-amber-700 font-semibold' : 'text-purple-700'}`}>
                      {extraList.length >= 5
                        ? 'بلغتَ الحد الأقصى (5 فترات إضافية)؛ احذف فترة من «تعديل» لإضافة أخرى'
                        : 'تظهر كسطر إضافي تحت الجدول وفي Word'}
                    </div>
                  </div>
                </div>

                {/* Extra Period Inputs: Name & Location Dropdown */}
                {selectedPeriods.extra && (
                  <div className="p-3.5 bg-white rounded-xl border border-purple-200 space-y-3 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-800 block">
                          اسم الفترة الإضافية (حد أقصى 30 حرفًا):
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          autoFocus
                          placeholder="مثال: قبل الإفطار، الظهيرة، قبل النوم..."
                          value={wizardExtraLabel}
                          onChange={(e) => setWizardExtraLabel(e.target.value.slice(0, 30))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white text-slate-900"
                        />
                      </div>

                      <div className="sm:w-56 space-y-1">
                        <label className="text-xs font-bold text-slate-800 block">
                          مكان ظهور الفترة:
                        </label>
                        <select
                          value={wizardExtraSlot}
                          onChange={(e) =>
                            setWizardExtraSlot(Number(e.target.value) as 0 | 1 | 2 | 3)
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300 min-h-[42px]"
                        >
                          {SLOT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
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
            {/* BOTTOM BUTTONS IN WIZARD (Persistent in each step, >= 44px) */}
            {/* ========================================================= */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackWizard}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>تراجع</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelAll}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </div>

              {(wizardStep === 3 || (wizardStep === 2 && selectedCategory === 'lente')) && (
                <button
                  type="button"
                  disabled={!isAdoptionValid}
                  onClick={handleAdoptWizard}
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
