import React from 'react';
import { User, Calendar, Stethoscope, ChevronDown, Check } from 'lucide-react';
import { GlycemiaData } from '../types/glycemia';

interface PatientBarProps {
  data: GlycemiaData;
  onChangeData: (updates: Partial<GlycemiaData>) => void;
  onOpenPatientModal: () => void;
}

export const PatientBar: React.FC<PatientBarProps> = ({
  data,
  onChangeData,
  onOpenPatientModal,
}) => {
  const currentUnit = data.unit || 'g/L';

  const toggleUnit = (newUnit: 'g/L' | 'mg/dL') => {
    if (newUnit === currentUnit) return;
    onChangeData({ unit: newUnit });
  };

  const patientName = `${data.prenom || ''} ${data.nom || ''}`.trim();

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Patient Profile Snapshot */}
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenPatientModal}
            className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 cursor-pointer hover:bg-slate-200 transition-colors"
            title="تعديل بيانات المريض"
          >
            <User className="w-5 h-5" />
          </div>

          <div className="cursor-pointer" onClick={onOpenPatientModal}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base hover:text-sky-600 transition-colors">
                {patientName || 'المريض (غير محدد)'}
              </span>
              {data.age && (
                <span className="text-xs text-slate-500 font-medium">
                  · {data.age} سنة
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>
                {data.diabetesType === 'type1'
                  ? 'النوع الأول (T1D)'
                  : data.diabetesType === 'type2'
                  ? 'النوع الثاني (T2D)'
                  : data.diabetesType === 'gestational'
                  ? 'سكري الحمل'
                  : 'متابعة السكري'}
              </span>
              {data.doctor && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-slate-400" />
                    <span>{data.doctor}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Controls: Unit selector & Patient edit button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <span className="text-xs font-medium text-slate-500 px-2 hidden sm:inline">
              الوحدة:
            </span>
            <button
              onClick={() => toggleUnit('g/L')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                currentUnit === 'g/L'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="جرام لكل لتر (الوحدة المعتمدة في الجزائر والمغرب العربي)"
            >
              g/L
            </button>
            <button
              onClick={() => toggleUnit('mg/dL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                currentUnit === 'mg/dL'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ملغ لكل ديسيلتر"
            >
              mg/dL
            </button>
          </div>

          <button
            onClick={onOpenPatientModal}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[36px]"
          >
            تعديل الملف الطبي
          </button>
        </div>
      </div>
    </div>
  );
};
