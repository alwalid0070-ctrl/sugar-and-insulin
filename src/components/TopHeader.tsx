import React from 'react';
import { Smartphone, Table2, TrendingUp, Printer, Download, Sparkles } from 'lucide-react';

interface TopHeaderProps {
  currentTab: 'mobile' | 'tablet' | 'analytics' | 'print';
  setCurrentTab: (tab: 'mobile' | 'tablet' | 'analytics' | 'print') => void;
  onOpenExportModal: () => void;
  onLoadDemo: () => boolean | void;
  hasData: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenExportModal,
  onLoadDemo,
  hasData,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            غ
          </div>
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block">
              ورقة متابعة السكري
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-normal hidden sm:block">
              Surveillance Glycémique
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setCurrentTab('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 min-h-[38px] ${
              currentTab === 'mobile'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="عرض البطاقات اليومية للهاتف"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>عرض الهاتف</span>
          </button>

          <button
            onClick={() => setCurrentTab('tablet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 min-h-[38px] ${
              currentTab === 'tablet'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="الجدول السريري للتابلت"
          >
            <Table2 className="w-4 h-4 shrink-0" />
            <span>الجدول الطبي</span>
          </button>

          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 min-h-[38px] ${
              currentTab === 'analytics'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="المخطط البياني ومؤشرات السكر"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>التحليلات</span>
          </button>

          <button
            onClick={() => setCurrentTab('print')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 min-h-[38px] ${
              currentTab === 'print'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="معاينة طباعة ورقة A4"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">طباعة / PDF</span>
            <span className="sm:hidden">طباعة</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasData && (
            <button
              onClick={onLoadDemo}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              title="ملء بيانات تجريبية للتجربة السريعة"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>بيانات تجريبية</span>
            </button>
          )}

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            title="تصدير واستيراد وطباعة"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>تصدير واستيراد</span>
          </button>
        </div>
      </div>
    </header>
  );
};
