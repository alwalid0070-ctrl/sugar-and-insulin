import React, { useState } from 'react';
import { X, User, Save, Stethoscope, AlertCircle } from 'lucide-react';
import { GlycemiaData } from '../types/glycemia';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GlycemiaData;
  onSave: (updates: Partial<GlycemiaData>) => void;
}

export const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
}) => {
  const [nom, setNom] = useState(data.nom || '');
  const [prenom, setPrenom] = useState(data.prenom || '');
  const [age, setAge] = useState(data.age || '');
  const [diabetesType, setDiabetesType] = useState(data.diabetesType || 'type2');
  const [doctor, setDoctor] = useState(data.doctor || '');
  const [notes, setNotes] = useState(data.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nom: nom.trim(),
      prenom: prenom.trim(),
      age: age.trim(),
      diabetesType,
      doctor: doctor.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                الملف الطبي للمريض
              </h2>
              <p className="text-xs text-slate-500">
                معلومات التعريف والبروتوكول العلاجي
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اللقب (Nom)
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="مثال: بن علي"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم (Prénom)
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="مثال: محمد"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                العمر (Age)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="مثال: 54"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوع السكري
              </label>
              <select
                value={diabetesType}
                onChange={(e) => setDiabetesType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
              >
                <option value="type1">النوع 1 (Type 1)</option>
                <option value="type2">النوع 2 (Type 2)</option>
                <option value="gestational">سكري الحمل (Gestationnel)</option>
                <option value="other">آخر</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              <span>الطبيب المعالج (Médecin)</span>
            </label>
            <input
              type="text"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="مثال: د. سمير حمداوي - عيادة الغدد الصماء"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات وتوجيهات الطبيب
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تعليمات الجرعات التصحيحية أو الملاحظات الغذائية..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
            ></textarea>
          </div>

          <div className="bg-sky-50/60 border border-sky-100 p-3 rounded-xl flex items-start gap-2 text-xs text-sky-900">
            <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              تظهر هذه البيانات في ترويسة الاستمارة الرسمية عند التصدير إلى مستند Word وطباعة ورقة A4.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
