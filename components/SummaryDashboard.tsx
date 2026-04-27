
import React from 'react';
import { SurveyRecord, TRAINER_MAP } from '../types';

interface SummaryDashboardProps {
  surveys: SurveyRecord[];
  isAdmin: boolean;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ surveys, isAdmin }) => {
  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter(v => v !== null && !isNaN(v as number));
    return valid.length ? (valid.reduce((a, b) => (a || 0) + (b || 0), 0) / valid.length).toFixed(2) : "0.00";
  };

  const maskName = (fullName: string) => {
    if (isAdmin) return fullName;
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return fullName;
  };

  const allTrainerIds = new Set<string>();
  surveys.forEach(s => {
    if (s.trainerRatings) {
      Object.keys(s.trainerRatings).forEach(id => {
        if (s.trainerRatings[id]?.knowledge !== null) {
          allTrainerIds.add(id);
        }
      });
    }
  });

  const activeTrainers = Array.from(allTrainerIds);

  const trainerMetrics = ['knowledge', 'didactics', 'preparation', 'communication', 'culture'] as const;
  const metricLabels: Record<string, string> = {
    knowledge: 'Wiedza i kompetencje',
    didactics: 'Dydaktyka i przekaz',
    preparation: 'Przygotowanie zajęć',
    communication: 'Zainteresowanie i kontakt',
    culture: 'Kultura osobista'
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Organizacja', val: avg(surveys.map(s => s.ratings.organization)), icon: 'fa-sitemap' },
          { label: 'Metodyka', val: avg(surveys.map(s => s.ratings.methods)), icon: 'fa-brain' },
          { label: 'Praktyka', val: avg(surveys.map(s => s.ratings.practicality)), icon: 'fa-tools' },
          { label: 'Mat: Przejrzystość', val: avg(surveys.map(s => s.ratings.materialsClarity)), icon: 'fa-eye' },
          { label: 'Mat: Merytoryka', val: avg(surveys.map(s => s.ratings.materialsMerit)), icon: 'fa-book' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center hover:border-orange-200 transition-all group">
            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <i className={`fa-solid ${item.icon} text-lg`}></i>
            </div>
            <span className="text-3xl font-black text-slate-800">{item.val}</span>
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-2 text-center">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tight">
            <i className="fa-solid fa-users-gear text-orange-500"></i> Ocena Trenerów (Kluczowe Kompetencje)
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold uppercase">Aktywnych: {activeTrainers.length}</span>
        </div>
        <div className="p-8">
          {activeTrainers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
              {activeTrainers.map(tId => {
                const trainerSurveysCount = surveys.filter(s => s.trainerRatings?.[tId] && s.trainerRatings[tId].knowledge !== null).length;
                const baseName = TRAINER_MAP[tId] || tId.replace(/_/g, ' ');
                return (
                  <div key={tId} className="space-y-5 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-xs uppercase shadow-lg shadow-slate-200">
                        {tId.substring(0, 1)}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-black text-slate-800 text-base tracking-tight leading-tight">{maskName(baseName)}</h4>
                        <span className="text-[10px] text-orange-500 font-bold uppercase">Ankiety: {trainerSurveysCount}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {trainerMetrics.map(m => (
                        <div key={m} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            <span>{metricLabels[m]}</span>
                            <span className="text-slate-800">{avg(surveys.map(s => s.trainerRatings?.[tId]?.[m]))}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${(parseFloat(avg(surveys.map(s => s.trainerRatings?.[tId]?.[m]))) / 6) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 italic">Brak szczegółowych danych o kadrze.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-[10px] font-black text-blue-600 mb-5 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-comments text-base"></i> Uwagi do Szkolenia
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {surveys.filter(s => s.comments?.general).map((s, i) => (
              <div key={i} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-slate-700 text-xs italic shadow-sm">
                "{s.comments.general}"
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-[10px] font-black text-green-600 mb-5 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-base"></i> Pozytywy
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {surveys.filter(s => s.comments?.positive).map((s, i) => (
              <div key={i} className="p-4 bg-green-50/50 rounded-xl border border-green-100 text-slate-700 text-xs italic shadow-sm">
                "{s.comments.positive}"
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-[10px] font-black text-red-600 mb-5 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-base"></i> Do Poprawy
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {surveys.filter(s => s.comments?.negative).map((s, i) => (
              <div key={i} className="p-4 bg-red-50/50 rounded-xl border border-red-100 text-slate-700 text-xs italic shadow-sm">
                "{s.comments.negative}"
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h3 className="text-[10px] font-black text-orange-600 mb-5 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-base"></i> Sugestie / Praca
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {surveys.filter(s => s.comments?.suggestions).map((s, i) => (
              <div key={i} className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 text-slate-700 text-xs shadow-sm">
                {s.comments.suggestions}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
