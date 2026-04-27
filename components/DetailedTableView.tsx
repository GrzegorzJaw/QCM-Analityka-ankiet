
import React from 'react';
import { SurveyRecord, TrainerScores } from '../types';

interface DetailedTableViewProps {
  surveys: SurveyRecord[];
}

export const DetailedTableView: React.FC<DetailedTableViewProps> = ({ surveys }) => {
  const getColor = (val: number | null): string => {
    if (val === null || val === undefined) return 'bg-slate-50 text-slate-300';
    if (val >= 5.5) return 'bg-orange-600 text-white shadow-lg shadow-orange-600/20';
    if (val >= 5) return 'bg-green-100 text-green-700';
    if (val >= 4) return 'bg-blue-50 text-blue-700';
    if (val >= 3) return 'bg-yellow-50 text-yellow-700';
    return 'bg-red-50 text-red-700';
  };

  const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '-';

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lp.</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Szkolenie & Detale</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Org</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Met</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pra</th>
              <th className="px-3 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mat</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kadra Średnia</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opinia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {surveys.map((s, idx) => {
              const trainerVals: number[] = [];
              if (s.trainerRatings) {
                (Object.values(s.trainerRatings) as TrainerScores[]).forEach(tr => {
                  if (tr) {
                    // Fixed: Changed 'engagement' to 'communication' to match TrainerScores interface
                    [tr.knowledge, tr.didactics, tr.preparation, tr.communication, tr.culture].forEach(v => {
                      if (v !== null && v !== undefined && !isNaN(v)) trainerVals.push(v);
                    });
                  }
                });
              }
              const trainerAvg = trainerVals.length ? (trainerVals.reduce((a, b) => a + b, 0) / trainerVals.length).toFixed(2) : '-';

              return (
                <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-all group">
                  <td className="px-6 py-6 text-[10px] font-black text-slate-300">#{idx + 1}</td>
                  <td className="px-6 py-6">
                    <div className="text-sm font-black text-slate-800 truncate max-w-[280px]" title={s.trainingTitle}>
                      {s.trainingTitle || 'Bez tytułu'}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">
                        {s.date || 'Brak daty'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {s.place || 'Brak lokalizacji'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-6 text-center">
                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs ${getColor(s.ratings?.organization)} transition-transform group-hover:scale-110`}>
                       {s.ratings?.organization ?? '-'}
                     </span>
                  </td>
                  <td className="px-3 py-6 text-center">
                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs ${getColor(s.ratings?.methods)} transition-transform group-hover:scale-110`}>
                       {s.ratings?.methods ?? '-'}
                     </span>
                  </td>
                  <td className="px-3 py-6 text-center">
                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs ${getColor(s.ratings?.practicality)} transition-transform group-hover:scale-110`}>
                       {s.ratings?.practicality ?? '-'}
                     </span>
                  </td>
                  <td className="px-3 py-6 text-center">
                     <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-xs ${getColor(s.ratings?.materialsMerit)} transition-transform group-hover:scale-110`}>
                       {s.ratings?.materialsMerit ?? '-'}
                     </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-1000" 
                          style={{ width: trainerAvg !== '-' ? `${(parseFloat(trainerAvg)/6)*100}%` : '0%' }}
                        ></div>
                      </div>
                      <span className="text-xs font-black text-slate-800">{trainerAvg}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic max-w-xs group-hover:text-slate-700 transition-colors leading-relaxed">
                      {s.comments?.positive || s.comments?.suggestions || s.comments?.negative || 'Brak dodatkowych uwag'}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {surveys.length === 0 && (
        <div className="py-20 text-center">
          <i className="fa-solid fa-face-meh text-5xl text-slate-100 mb-4"></i>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Tabela jest pusta</p>
        </div>
      )}
    </div>
  );
};
