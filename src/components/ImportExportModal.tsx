import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  AlertTriangle,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GlycemiaData, ImportPreviewResult } from '../types/glycemia';
import { exportCsv, parseCsvImport, loadSampleDemoData } from '../utils/csvHelper';
import { downloadDocx } from '../utils/docxExport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GlycemiaData;
  days: string[];
  onApplyImport: (importedData: Partial<GlycemiaData>, mode: 'merge' | 'replace', overwrite: boolean) => void;
  onClearAll: () => void;
  onLoadDemo: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  data,
  days,
  onApplyImport,
  onClearAll,
  onLoadDemo,
}) => {
  const [importResult, setImportResult] = useState<ImportPreviewResult | null>(null);
  const [overwriteConflicts, setOverwriteConflicts] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCsvFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const res = parseCsvImport(text, days);
        setImportResult(res);
      } catch (err: any) {
        setImportError(err.message || 'تعذّرت قراءة ملف CSV');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.onerror = () => {
      setImportError('فشل فتح الملف');
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleApplyImportAction = (mode: 'merge' | 'replace') => {
    if (!importResult) return;
    if (mode === 'replace') {
      if (!window.confirm('تحذير: سيتم مسح جميع البيانات الحالية في النموذج واستبدالها ببيانات الملف. هل تريد المتابعة؟')) {
        return;
      }
    }

    const updates: Partial<GlycemiaData> = {};
    importResult.ent.forEach((e) => {
      updates[e.id] = e.v;
    });

    onApplyImport(updates, mode, overwriteConflicts);
    setImportResult(null);
    showToast(mode === 'replace' ? 'تم استبدال البيانات بنجاح' : 'تم دمج البيانات بنجاح');
  };

  // JSON Full Backup Export
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `glycemie_backup_${data.nom || 'patient'}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    showToast('تم تنزيل النسخة الاحتياطية JSON');
  };

  const handleJsonFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        onApplyImport(parsed, 'replace', true);
        showToast('تم استعادة النسخة الاحتياطية بالكامل');
      } catch {
        setImportError('ملف JSON غير صالح');
      }
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                إدارة البيانات والتصدير
              </h2>
              <p className="text-xs text-slate-500">
                تصدير ومزامنة واستيراد القياسات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {notification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{notification}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* If CSV Preview is active */}
          {importResult ? (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-xs text-sky-900">
                <span className="font-bold">معاينة استيراد CSV:</span> وجدنا{' '}
                <span className="font-bold">{importResult.ent.length}</span> عنصر صالح
                للاستيراد.
              </div>

              {importResult.warn.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                  <span className="font-bold">ملاحظات ({importResult.warn.length}):</span>
                  {importResult.warn.slice(0, 3).map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                  {importResult.warn.length > 3 && (
                    <div className="text-slate-500">... والمزيد</div>
                  )}
                </div>
              )}

              {/* Table preview */}
              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700">
                    <tr>
                      <th className="p-2 border-b">اليوم</th>
                      <th className="p-2 border-b">الوجبة</th>
                      <th className="p-2 border-b">الخانة</th>
                      <th className="p-2 border-b">في الملف</th>
                      <th className="p-2 border-b">الحالية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.ent.slice(0, 15).map((e, idx) => {
                      const cur = data[e.id] || '';
                      const isSame = cur === e.v;
                      const isNew = cur === '';
                      return (
                        <tr
                          key={idx}
                          className={`border-b ${
                            isNew
                              ? 'bg-emerald-50/50'
                              : isSame
                              ? 'bg-white'
                              : 'bg-amber-50/70'
                          }`}
                        >
                          <td className="p-1.5 font-medium">{e.day}</td>
                          <td className="p-1.5 text-slate-500">{e.meal}</td>
                          <td className="p-1.5 text-slate-700">{e.mes}</td>
                          <td className="p-1.5 font-bold text-sky-700">{e.v}</td>
                          <td className="p-1.5 text-slate-500">{cur || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteConflicts}
                  onChange={(e) => setOverwriteConflicts(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>عند الدمج: استبدال القيم المتعارضة بقيم الملف</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleApplyImportAction('merge')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  دمج البيانات مع الحالية
                </button>
                <button
                  onClick={() => handleApplyImportAction('replace')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  استبدال كامل النموذج
                </button>
                <button
                  onClick={() => setImportResult(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  إلغاء المعاينة
                </button>
              </div>
            </div>
          ) : (
            /* Normal Export & Import Options */
            <div className="space-y-6">
              {/* Section 1: Exports */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  تصدير التقارير الطبية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => downloadDocx(data, days)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-right transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">مستند Word (.docx)</div>
                      <div className="text-xs text-slate-500">
                        جدول كامل متوافق مع Microsoft Word
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => exportCsv(data, days)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-right transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">ملف Excel / CSV</div>
                      <div className="text-xs text-slate-500">
                        بيانات جدولية بصيغة UTF-8 مدعومة
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Section 2: Imports */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  استيراد ومزامنة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="file"
                      ref={csvInputRef}
                      accept=".csv,text/csv,text/plain"
                      onChange={handleCsvFilePicked}
                      className="hidden"
                    />
                    <button
                      onClick={() => csvInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 text-right transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">استيراد CSV</div>
                        <div className="text-xs text-slate-500">
                          قراءة ملف CSV مع خيار الدمج أو الاستبدال
                        </div>
                      </div>
                    </button>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={jsonInputRef}
                      accept=".json,application/json"
                      onChange={handleJsonFilePicked}
                      className="hidden"
                    />
                    <button
                      onClick={() => jsonInputRef.current?.click()}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 text-right transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">استعادة نسخة JSON</div>
                        <div className="text-xs text-slate-500">
                          استيراد ملف النسخ الاحتياطي الكامل
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Backup & Tools */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  أدوات النسخ الاحتياطي والتجربة
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    حفظ نسخة احتياطية (JSON)
                  </button>

                  <button
                    onClick={() => {
                      onLoadDemo();
                      showToast('تم تحميل بيانات تجريبية');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تحميل نموذج تجريبي جاهز</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('هل تريد مسح جميع البيانات نهائيًا؟')) {
                        onClearAll();
                        showToast('تم مسح البيانات');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100 mr-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح كل البيانات</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
