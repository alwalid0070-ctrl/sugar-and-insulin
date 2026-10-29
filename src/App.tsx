import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Table2,
  TrendingUp,
  Printer,
  Plus,
  Download,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { GlycemiaData } from './types/glycemia';
import { STORAGE_KEY, loadSampleDemoData, convertGlucoseValue } from './utils/csvHelper';
import { TopHeader } from './components/TopHeader';
import { PatientBar } from './components/PatientBar';
import { MobileDayView } from './components/MobileDayView';
import { TabletGridView } from './components/TabletGridView';
import { AnalyticsView } from './components/AnalyticsView';
import { PrintSheetView } from './components/PrintSheetView';
import { ImportExportModal } from './components/ImportExportModal';
import { PatientModal } from './components/PatientModal';
import { UnitChangeModal } from './components/UnitChangeModal';
import { InsulinPrescription } from './components/InsulinPrescription';

const DEFAULT_DAYS = ['jour 1', 'Jour 2', 'Jour 3', 'Jour 4'];

export default function App() {
  const [data, setData] = useState<GlycemiaData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Migrate old note_{n} to unified d{n}_note so no previously saved data is lost
          Object.keys(parsed).forEach((k) => {
            const m = k.match(/^note_(\d+)$/);
            if (m) {
              const dayNum = m[1];
              const newKey = `d${dayNum}_note`;
              if (!parsed[newKey] && parsed[k]) {
                parsed[newKey] = parsed[k];
              }
              delete parsed[k];
            }
          });
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      nom: '',
      prenom: '',
      age: '',
      unit: 'g/L',
      daysCount: 4,
    };
  });

  const [days, setDays] = useState<string[]>(() => {
    const count = data.daysCount || 4;
    return Array.from({ length: Math.max(count, 4) }, (_, i) => `Jour ${i + 1}`);
  });

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<'mobile' | 'tablet' | 'analytics' | 'print'>('mobile');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState<boolean>(false);
  const [pendingUnitChange, setPendingUnitChange] = useState<{
    fromUnit: 'g/L' | 'mg/dL';
    toUnit: 'g/L' | 'mg/dL';
    count: number;
  } | null>(null);
  const [unitAlertMessage, setUnitAlertMessage] = useState<string | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, daysCount: days.length }));
    } catch {
      // LocalStorage might fail in private browsing
    }
  }, [data, days]);

  const handleRequestUnitChange = (newUnit: 'g/L' | 'mg/dL') => {
    const currentUnit = data.unit || 'g/L';
    if (newUnit === currentUnit) return;

    // Count recorded blood sugar readings in b1, b3, l2, d2 across all days
    let glucoseReadingsCount = 0;
    Object.keys(data).forEach((k) => {
      const m = k.match(/^d\d+_(b1|b3|l2|d2)$/);
      if (m && data[k] !== undefined && String(data[k]).trim() !== '') {
        glucoseReadingsCount++;
      }
    });

    if (glucoseReadingsCount === 0) {
      // No recorded glucose readings exist: switch directly and save
      setData((prev) => ({ ...prev, unit: newUnit }));
      setUnitAlertMessage(null);
      return;
    }

    // Recorded readings exist: Ask the patient first! Do not switch before answer.
    setPendingUnitChange({
      fromUnit: currentUnit,
      toUnit: newUnit,
      count: glucoseReadingsCount,
    });
  };

  const handleConfirmUnitChange = (convert: boolean) => {
    if (!pendingUnitChange) return;
    const { fromUnit, toUnit } = pendingUnitChange;

    if (convert) {
      // Convert ONLY glucose slots (b1, b3, l2, d2 across all days); DO NOT touch insulin slots!
      setData((prev) => {
        const next: GlycemiaData = { ...prev, unit: toUnit };
        Object.keys(next).forEach((k) => {
          const m = k.match(/^d\d+_(b1|b3|l2|d2)$/);
          if (m && next[k] !== undefined && String(next[k]).trim() !== '') {
            next[k] = convertGlucoseValue(String(next[k]), fromUnit, toUnit);
          }
        });

        // Also convert custom target thresholds if configured
        const convertTarget = (val: any) => {
          if (val === undefined || val === null || val === '') return undefined;
          const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          if (isNaN(parsed)) return undefined;
          return toUnit === 'mg/dL' ? Math.round(parsed * 100) : +(parsed / 100).toFixed(2);
        };

        if (next.targetMin !== undefined) next.targetMin = convertTarget(next.targetMin);
        if (next.targetMaxFasting !== undefined) next.targetMaxFasting = convertTarget(next.targetMaxFasting);
        if (next.targetMaxPost !== undefined) next.targetMaxPost = convertTarget(next.targetMaxPost);

        return next;
      });
      setUnitAlertMessage(null);
    } else {
      // Leave values as-is with a clear alert that current numbers may not match the new unit!
      setData((prev) => ({ ...prev, unit: toUnit }));
      setUnitAlertMessage(
        `تنبيه: تم تغيير الوحدة إلى (${toUnit}) دون تحويل القراءات السابقة؛ قد لا تتوافق الأرقام الحالية المسجلة مع الوحدة الجديدة.`
      );
    }

    setPendingUnitChange(null);
  };

  const handleCancelUnitChange = () => {
    // Cancel: keep current unit and values untouched
    setPendingUnitChange(null);
  };

  const handleUpdateValue = (id: string, value: string) => {
    setData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleChangeData = (updates: Partial<GlycemiaData>) => {
    setData((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleAddDay = () => {
    const nextIdx = days.length + 1;
    const newDayLabel = `Jour ${nextIdx}`;

    // Predict next date if previous day had a date
    let nextDate = '';
    const prevDateStr = data[`date_${days.length}`];
    if (prevDateStr) {
      try {
        const d = new Date(prevDateStr + 'T00:00:00Z');
        if (!isNaN(d.getTime())) {
          d.setUTCDate(d.getUTCDate() + 1);
          nextDate = d.toISOString().split('T')[0];
        }
      } catch {
        // ignore
      }
    }

    setDays((prev) => [...prev, newDayLabel]);
    if (nextDate) {
      setData((prev) => ({
        ...prev,
        [`date_${nextIdx}`]: nextDate,
        daysCount: nextIdx,
      }));
    } else {
      setData((prev) => ({
        ...prev,
        daysCount: nextIdx,
      }));
    }
    setActiveDayIndex(days.length);
  };

  const hasData =
    Boolean((data.nom && data.nom.trim()) || (data.prenom && data.prenom.trim())) ||
    Object.keys(data).some(
      (k) =>
        (k.startsWith('d') || k.startsWith('date_')) &&
        Boolean(data[k] && String(data[k]).trim())
    );

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    const dayLabel = days[index] || `اليوم ${index + 1}`;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${dayLabel}؟ سيتم حذف جميع قياساته وتاريخه وملاحظاته نهائيًا، وإعادة ترقيم الأيام التالية ونقل بياناتها.`
    );
    if (!confirmed) return;

    const dayNumToDelete = index + 1;
    const totalDays = days.length;
    const nextTotalDays = totalDays - 1;

    setData((prev) => {
      const nextData: GlycemiaData = { ...prev };

      // Shift subsequent days: from dayNumToDelete up to totalDays - 1
      for (let d = dayNumToDelete; d < totalDays; d++) {
        const srcDay = d + 1;

        // 1. Delete all current keys for day d first to ensure no leftover keys remain
        delete nextData[`date_${d}`];
        Object.keys(nextData).forEach((k) => {
          if (k.startsWith(`d${d}_`)) {
            delete nextData[k];
          }
        });

        // 2. Copy date from srcDay if it exists
        if (prev[`date_${srcDay}`]) {
          nextData[`date_${d}`] = prev[`date_${srcDay}`];
        }

        // 3. Copy all keys starting with d${srcDay}_ to d${d}_ (including d${srcDay}_note)
        Object.keys(prev).forEach((k) => {
          if (k.startsWith(`d${srcDay}_`)) {
            const suffix = k.slice(`d${srcDay}_`.length);
            nextData[`d${d}_${suffix}`] = prev[k];
          }
        });
      }

      // 4. Delete the last day's (totalDays) date and measurements (including d${totalDays}_note) completely
      delete nextData[`date_${totalDays}`];
      Object.keys(nextData).forEach((k) => {
        if (k.startsWith(`d${totalDays}_`)) {
          delete nextData[k];
        }
      });

      nextData.daysCount = nextTotalDays;
      return nextData;
    });

    const newDays = Array.from({ length: nextTotalDays }, (_, i) => `Jour ${i + 1}`);
    setDays(newDays);

    if (activeDayIndex >= newDays.length) {
      setActiveDayIndex(newDays.length - 1);
    }
  };

  const handleCopyPreviousInsulin = (targetDayIndex: number) => {
    if (targetDayIndex <= 0) return;
    const prevDay = targetDayIndex; // 1-indexed prev
    const curDay = targetDayIndex + 1; // 1-indexed target

    setData((prev) => ({
      ...prev,
      [`d${curDay}_b2`]: prev[`d${prevDay}_b2`] || '',
      [`d${curDay}_l1`]: prev[`d${prevDay}_l1`] || '',
      [`d${curDay}_d1`]: prev[`d${prevDay}_d1`] || '',
      [`d${curDay}_d3`]: prev[`d${prevDay}_d3`] || '',
    }));
  };

  const handleApplyImport = (
    imported: Partial<GlycemiaData>,
    mode: 'merge' | 'replace',
    overwrite: boolean
  ) => {
    // Migrate old note_{n} in imported data to d{n}_note if present
    const normalizedImported: Partial<GlycemiaData> = { ...imported };
    Object.keys(normalizedImported).forEach((k) => {
      const m = k.match(/^note_(\d+)$/);
      if (m) {
        const dayNum = m[1];
        const newKey = `d${dayNum}_note`;
        if (!normalizedImported[newKey] && normalizedImported[k]) {
          normalizedImported[newKey] = normalizedImported[k];
        }
        delete normalizedImported[k];
      }
    });

    // 1. Determine maximum day index present across both existing and imported data
    let maxDay = mode === 'replace' ? 4 : days.length;

    Object.keys(normalizedImported).forEach((k) => {
      const m = k.match(/^d(\d+)_/) || k.match(/^date_(\d+)/);
      if (m) {
        const dNum = parseInt(m[1], 10);
        if (dNum > maxDay) maxDay = dNum;
      }
    });

    if (normalizedImported.daysCount && typeof normalizedImported.daysCount === 'number' && normalizedImported.daysCount > maxDay) {
      maxDay = normalizedImported.daysCount;
    }

    if (mode === 'replace') {
      const nextData: GlycemiaData = {
        unit: normalizedImported.unit || data.unit || 'g/L',
        targetMin: normalizedImported.targetMin ?? data.targetMin,
        targetMaxFasting: normalizedImported.targetMaxFasting ?? data.targetMaxFasting,
        targetMaxPost: normalizedImported.targetMaxPost ?? data.targetMaxPost,
        diabetesType: normalizedImported.diabetesType ?? data.diabetesType,
        doctor: normalizedImported.doctor ?? data.doctor,
        ins_b2: normalizedImported.ins_b2 ?? data.ins_b2,
        ins_l1: normalizedImported.ins_l1 ?? data.ins_l1,
        ins_d1: normalizedImported.ins_d1 ?? data.ins_d1,
        ...normalizedImported,
        daysCount: maxDay,
      };
      setData(nextData);
      setDays(Array.from({ length: maxDay }, (_, i) => `Jour ${i + 1}`));
    } else {
      setData((prev) => {
        const next = { ...prev };
        Object.entries(normalizedImported).forEach(([k, v]) => {
          if (v === undefined || v === '') return;
          if (next[k] === undefined || next[k] === '' || overwrite) {
            next[k] = v;
          }
        });
        next.daysCount = maxDay;
        return next;
      });
      if (maxDay > days.length) {
        setDays(Array.from({ length: maxDay }, (_, i) => `Jour ${i + 1}`));
      }
    }
  };

  const handleClearAll = () => {
    setData({
      nom: '',
      prenom: '',
      age: '',
      unit: 'g/L',
      daysCount: 4,
      ins_b2: 'rapid',
      ins_l1: 'rapid',
      ins_d1: 'mix',
      drug_b2: '',
      drug_l1: '',
      drug_d1: '',
      drug_d3: '',
      drugOther_b2: '',
      drugOther_l1: '',
      drugOther_d1: '',
      drugOther_d3: '',
    });
    setDays(DEFAULT_DAYS);
    setActiveDayIndex(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleLoadDemo = () => {
    if (hasData) {
      const confirmed = window.confirm(
        'تنبيه: توجد بيانات مدخلة حاليًا في الاستمارة. هل أنت متأكد من استبدالها بالبيانات التجريبية؟ سيتم مسح بيانات المريض الحالية.'
      );
      if (!confirmed) return false;
    }
    const demo = loadSampleDemoData();
    setData(demo);
    setDays(['Jour 1', 'Jour 2', 'Jour 3', 'Jour 4']);
    setActiveDayIndex(0);
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 sm:pb-8">
      {/* Top Header Navigation */}
      <TopHeader
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        hasData={hasData}
      />

      {/* Patient Profile Bar (hidden in print preview) */}
      {currentTab !== 'print' && (
        <>
          <PatientBar
            data={data}
            onChangeData={handleChangeData}
            onOpenPatientModal={() => setIsPatientModalOpen(true)}
            onRequestUnitChange={handleRequestUnitChange}
          />

          {(currentTab === 'mobile' || currentTab === 'tablet') && (
            <InsulinPrescription
              data={data}
              onChangeData={handleChangeData}
            />
          )}

          {unitAlertMessage && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sm:px-6 no-print animate-in fade-in duration-150">
              <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs text-amber-900 font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{unitAlertMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnitAlertMessage(null)}
                  className="text-amber-800 hover:text-amber-950 font-bold px-2 py-0.5 rounded hover:bg-amber-100 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {currentTab === 'mobile' && (
          <MobileDayView
            data={data}
            days={days}
            activeDayIndex={activeDayIndex}
            setActiveDayIndex={setActiveDayIndex}
            onUpdateValue={handleUpdateValue}
            onAddDay={handleAddDay}
            onRemoveDay={handleRemoveDay}
            onCopyPreviousInsulin={handleCopyPreviousInsulin}
          />
        )}

        {currentTab === 'tablet' && (
          <TabletGridView
            data={data}
            days={days}
            onUpdateValue={handleUpdateValue}
            onAddDay={handleAddDay}
            onRemoveDay={handleRemoveDay}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            data={data}
            days={days}
            onChangeData={handleChangeData}
          />
        )}

        {currentTab === 'print' && (
          <PrintSheetView
            data={data}
            days={days}
            onBackToApp={() => setCurrentTab('mobile')}
          />
        )}
      </main>

      {/* Fixed Bottom Tab Bar for Mobile Viewport Ergonomics (matches Pattern 1) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 sm:hidden no-print">
        <div className="grid grid-cols-4 items-center h-16 px-2">
          <button
            onClick={() => setCurrentTab('mobile')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'mobile' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">عرض الهاتف</span>
          </button>

          <button
            onClick={() => setCurrentTab('tablet')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'tablet' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <Table2 className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">الجدول</span>
          </button>

          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'analytics' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">التحليلات</span>
          </button>

          <button
            onClick={() => setCurrentTab('print')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'print' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <Printer className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">طباعة / PDF</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <ImportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={data}
        days={days}
        onApplyImport={handleApplyImport}
        onClearAll={handleClearAll}
        onLoadDemo={handleLoadDemo}
      />

      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        data={data}
        onSave={handleChangeData}
      />
    </div>
  );
}
