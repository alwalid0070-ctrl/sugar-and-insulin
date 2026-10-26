import React, { useState, useEffect } from 'react';
import { Smartphone, Table2, TrendingUp, Printer, Plus, Download, Sparkles } from 'lucide-react';
import { GlycemiaData } from './types/glycemia';
import { STORAGE_KEY, loadSampleDemoData } from './utils/csvHelper';
import { TopHeader } from './components/TopHeader';
import { PatientBar } from './components/PatientBar';
import { MobileDayView } from './components/MobileDayView';
import { TabletGridView } from './components/TabletGridView';
import { AnalyticsView } from './components/AnalyticsView';
import { PrintSheetView } from './components/PrintSheetView';
import { ImportExportModal } from './components/ImportExportModal';
import { PatientModal } from './components/PatientModal';

const DEFAULT_DAYS = ['jour 1', 'Jour 2', 'Jour 3', 'Jour 4'];

export default function App() {
  const [data, setData] = useState<GlycemiaData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
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

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, daysCount: days.length }));
    } catch {
      // LocalStorage might fail in private browsing
    }
  }, [data, days]);

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
        const d = new Date(prevDateStr);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
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

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${days[index]}؟`)) return;

    const newDays = days.filter((_, i) => i !== index);
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
    if (mode === 'replace') {
      setData(imported);
      // Determine max days in imported data
      let maxDay = 4;
      Object.keys(imported).forEach((k) => {
        const m = k.match(/^d(\d+)_/);
        if (m) {
          const dNum = parseInt(m[1], 10);
          if (dNum > maxDay) maxDay = dNum;
        }
      });
      setDays(Array.from({ length: maxDay }, (_, i) => `Jour ${i + 1}`));
    } else {
      setData((prev) => {
        const next = { ...prev };
        Object.entries(imported).forEach(([k, v]) => {
          if (v === undefined || v === '') return;
          if (next[k] === undefined || next[k] === '' || overwrite) {
            next[k] = v;
          }
        });
        return next;
      });
    }
  };

  const handleClearAll = () => {
    setData({
      nom: '',
      prenom: '',
      age: '',
      unit: 'g/L',
      daysCount: 4,
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
    const demo = loadSampleDemoData();
    setData(demo);
    setDays(['Jour 1', 'Jour 2', 'Jour 3', 'Jour 4']);
    setActiveDayIndex(0);
  };

  const hasData =
    Boolean(data.nom || data.prenom) ||
    Object.keys(data).some((k) => k.startsWith('d') && data[k]);

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
        <PatientBar
          data={data}
          onChangeData={handleChangeData}
          onOpenPatientModal={() => setIsPatientModalOpen(true)}
        />
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
          <AnalyticsView data={data} days={days} />
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
