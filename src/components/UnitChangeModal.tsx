import React from 'react';
import { ArrowRightLeft, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

interface UnitChangeModalProps {
  isOpen: boolean;
  fromUnit: 'g/L' | 'mg/dL';
  toUnit: 'g/L' | 'mg/dL';
  recordedCount: number;
  onConfirm: (convert: boolean) => void;
  onCancel: () => void;
}

export const UnitChangeModal: React.FC<UnitChangeModalProps> = ({
  isOpen,
  fromUnit,
  toUnit,
  recordedCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                تغيير وحدة القياس
              </h2>
              <p className="text-xs text-slate-500">
                التحويل من {fromUnit} إلى {toUnit}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            title="إلغاء"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="text-lg font-bold text-slate-900">
              «هل تريد تحويل القراءات المسجلة؟»
            </div>
            <div className="text-sm font-semibold text-sky-700 dir-ltr inline-block bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
              (1 g/L = 100 mg/dL تقريبًا)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>عند اختيار نعم:</strong> سيتم تحويل خانات السكر فقط (b1 وb3 وl2 وd2 في جميع الأيام، {recordedCount} قراءة مسجلة) ولن تُمس خانات الإنسولين.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>عند اختيار لا:</strong> ستظل الأرقام الحالية كما هي دون تغيير، مع تنبيه بأن الأرقام الحالية قد لا تتوافق مع الوحدة الجديدة.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => onConfirm(true)}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>نعم، حوّل قراءات السكر المسجلة</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirm(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 font-semibold text-xs transition-all border border-slate-300"
            >
              لا، غيّر الوحدة دون تحويل الأرقام
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors text-center"
            >
              إلغاء التبديل والاحتفاظ بـ ({fromUnit})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
