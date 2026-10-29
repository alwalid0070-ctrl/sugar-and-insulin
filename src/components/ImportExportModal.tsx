import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GlycemiaData, ImportPreviewResult } from '../types/glycemia';
import {
  exportCsv,
  parseCsvImport,
  loadSampleDemoData,
  convertGlucoseValue,
} from '../utils/csvHelper';
import { downloadDocx } from '../utils/docxExport';
import { PWAInstallButton } from './PWAInstallButton';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GlycemiaData;
  days: string[];
  onApplyImport: (importedData: Partial<GlycemiaData>, mode: 'merge' | 'replace', overwrite: boolean) => void;
  onClearAll: () => void;
  onLoadDemo: () => boolean | void;
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
  const [fileUnit, setFileUnit] = useState<'g/L' | 'mg/dL' | null>(null);
  const [isConverted, setIsConverted] = useState<boolean>(false);
  const [overwriteConflicts, setOverwriteConflicts] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const appUnit = data.unit || 'g/L';

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
        setFileUnit(res.detectedUnit);
        setIsConverted(false);
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

  const handleConvertImportedValues = () => {
    if (!importResult || !fileUnit) return;
    const from = fileUnit;
    const to = appUnit;
    const updatedEntries = importResult.ent.map((entry) => {
      if (entry.isGlucose) {
        return {
          ...entry,
          v: convertGlucoseValue(entry.v, from, to),
        };
      }
      return entry;
    });

    setImportResult({
      ...importResult,
      ent: updatedEntries,
    });
    setFileUnit(to);
    setIsConverted(true);
    showToast(`تم تحويل قياسات السكر بنجاح من ${from} إلى ${to}`);
  };

  const handleSelectUnknownFileUnit = (chosenUnit: 'g/L' | 'mg/dL') => {
    setFileUnit(chosenUnit);
    if (chosenUnit === appUnit) {
      setIsConverted(true);
    } else {
      setIsConverted(false);
    }
  };

  const hasUnitColumn = importResult?.hasUnitColumn ?? false;
  const isUnitSelected = fileUnit !== null;
  const hasUnitMismatch = isUnitSelected && fileUnit !== appUnit && !isConverted;
  const canProceed = isUnitSelected && !hasUnitMismatch;

  const handleApplyImportAction = (mode: 'merge' | 'replace') => {
    if (!importResult) return;
    if (mode === 'replace') {
      if (!window.confirm('تحذير: سيتم مسح جميع البيانات الحالية في النموذج واستبدالها ببيانات الملف. هل تريد المتابعة؟')) {
        return;
      }
    }

    const updates: Partial<GlycemiaData> = {
      unit: fileUnit || appUnit,
    };
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
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '').trim();
        if (!text) {
          throw new Error('ملف النسخة الاحتياطية فارغ.');
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('الملف ليس بصيغة JSON صالحة أو يحتوي على أخطاء نحوية.');
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error(
            'صيغة الملف غير صحيحة: يجب أن يحتوي ملف النسخة الاحتياطية على كائن بيانات (Object) وليس مصفوفة أو قيمة مفردة.'
          );
        }

        // Check if object resembles glycemia data
        const keys = Object.keys(parsed);
        const hasValidKey = keys.some(
          (k) =>
            k === 'nom' ||
            k === 'prenom' ||
            k === 'age' ||
            k === 'unit' ||
            k.startsWith('d') ||
            k.startsWith('date_')
        );

        if (!hasValidKey && keys.length > 0) {
          throw new Error(
            'الملف لا يحتوي على بيانات ورقة متابعة السكري المتوافقة مع هذا التطبيق.'
          );
        }

        const confirmRestore = window.confirm(
          'تنبيه: هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية ببيانات هذا الملف.'
        );
        if (!confirmRestore) {
          if (jsonInputRef.current) jsonInputRef.current.value = '';
          return;
        }

        onApplyImport(parsed, 'replace', true);
        showToast('تم استعادة النسخة الاحتياطية بنجاح');
      } catch (err: any) {
        setImportError(
          err.message || 'تعذّرت استعادة النسخة الاحتياطية: الملف تالف أو غير صالح.'
        );
      }
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };
    reader.onerror = () => {
      setImportError('تعذّرت قراءة الملف من الجهاز.');
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
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
              <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-xs text-sky-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">معاينة استيراد CSV:</span> وجدنا{' '}
                  <span className="font-bold">{importResult.ent.length}</span> عنصر صالح
                  للاستيراد.
                </div>
                {fileUnit && (
                  <span className="font-bold text-sky-800 bg-sky-100 px-2.5 py-1 rounded-md">
                    وحدة الملف: {fileUnit}
                  </span>
                )}
              </div>

              {/* 1. Legacy File Alert: Unit is missing in CSV */}
              {!hasUnitColumn && (
                <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl text-amber-950 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">
                        تنبيه: ملف من إصدار سابق (الوحدة غير معروفة)
                      </div>
                      <div className="text-xs text-amber-900 mt-1 leading-relaxed">
                        هذا الملف لا يتضمن عمود الوحدة (Unite). يرجى تحديد الوحدة التي سُجلت بها
                        قياسات السكر في هذا الملف لمطابقتها مع وحدة التطبيق الحالية ({appUnit}):
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200">
                    <span className="text-xs font-bold text-slate-700">حدد وحدة الملف:</span>
                    <button
                      type="button"
                      onClick={() => handleSelectUnknownFileUnit('g/L')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        fileUnit === 'g/L'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      g/L (جرام/لتر)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectUnknownFileUnit('mg/dL')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        fileUnit === 'mg/dL'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      mg/dL (ملغ/ديسيلتر)
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Unit Mismatch Warning & Conversion Choices */}
              {hasUnitMismatch && fileUnit && (
                <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl text-rose-950 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">
                        تحذير: وحدة القياس في الملف ({fileUnit}) تختلف عن وحدة التطبيق الحالية ({appUnit})
                      </div>
                      <div className="text-xs text-rose-900 mt-1 leading-relaxed">
                        لا يمكن استيراد البيانات مباشرة لمنع تشويه قراءات السكر (مثلاً 1.20 g/L توازي
                        120 mg/dL). تم إيقاف الاستيراد حتى تختار أحد الإجراءين التاليين:
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200">
                    <button
                      type="button"
                      onClick={handleConvertImportedValues}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>(ب) تحويل قيم السكر إلى ({appUnit})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImportResult(null);
                        setFileUnit(null);
                        setIsConverted(false);
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs transition-colors"
                    >
                      (أ) إلغاء الاستيراد
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Reassurance message when unit matches or after conversion */}
              {canProceed && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isConverted
                      ? `تم تحويل قيم السكر بنجاح إلى وحدة التطبيق الحالية (${appUnit}). يمكنك الآن إتمام الاستيراد.`
                      : `وحدة القياس في الملف (${fileUnit}) مطابقة تمامًا لوحدة التطبيق الحالية (${appUnit}).`}
                  </span>
                </div>
              )}

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
                      <th className="p-2 border-b">
                        في الملف {fileUnit ? `(${fileUnit})` : ''}
                      </th>
                      <th className="p-2 border-b">الحالية ({appUnit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.ent.slice(0, 50).map((e, idx) => {
                      const isInsulinChoice = e.id.startsWith('ins_');
                      const cur = isInsulinChoice
                        ? (data[e.id] || (e.id === 'ins_d1' ? 'mix' : 'rapid'))
                        : data[e.id] || '';
                      const isSame = cur === e.v;
                      const isNew = cur === '';
                      const displayFileVal = isInsulinChoice
                        ? (e.v === 'rapid' ? 'NOVO rapid' : 'NOVO Mix')
                        : e.v;
                      const displayCurVal = isInsulinChoice
                        ? (cur === 'rapid' ? 'NOVO rapid' : 'NOVO Mix')
                        : cur || '—';
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
                          <td className="p-1.5 font-bold text-sky-700">{displayFileVal}</td>
                          <td className="p-1.5 text-slate-500">{displayCurVal}</td>
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

              {!canProceed && (
                <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    الاستيراد موقوف حتى اختيار إجراء مناسب لمطابقة وحدة القياس أعلاه.
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => handleApplyImportAction('merge')}
                  disabled={!canProceed}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                  title={!canProceed ? 'يرجى مطابقة الوحدة أولاً' : undefined}
                >
                  دمج البيانات مع الحالية
                </button>
                <button
                  onClick={() => handleApplyImportAction('replace')}
                  disabled={!canProceed}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                  title={!canProceed ? 'يرجى مطابقة الوحدة أولاً' : undefined}
                >
                  استبدال كامل النموذج
                </button>
                <button
                  onClick={() => {
                    setImportResult(null);
                    setFileUnit(null);
                    setIsConverted(false);
                  }}
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

                  <PWAInstallButton />

                  <button
                    onClick={() => {
                      const loaded = onLoadDemo();
                      if (loaded !== false) {
                        showToast('تم تحميل بيانات تجريبية');
                      }
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
