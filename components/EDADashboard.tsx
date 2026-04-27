
import React from 'react';
import { SurveyRecord, TRAINER_MAP } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface EDADashboardProps {
  surveys: SurveyRecord[];
  isAdmin: boolean;
}

export const EDADashboard: React.FC<EDADashboardProps> = ({ surveys, isAdmin }) => {
  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter(v => v !== null && !isNaN(v as number));
    return valid.length ? parseFloat((valid.reduce((a, b) => (a || 0) + (b || 0), 0) / valid.length).toFixed(2)) : 0;
  };

  const maskName = (fullName: string) => {
    if (isAdmin) return fullName;
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return fullName;
  };

  // 1. Ocena szkolenia i 2. Materiały
  const mainData = [
    { name: 'Organizacja', score: avg(surveys.map(s => s.ratings.organization)) },
    { name: 'Metody', score: avg(surveys.map(s => s.ratings.methods)) },
    { name: 'Praktyka', score: avg(surveys.map(s => s.ratings.practicality)) },
    { name: 'Przejrzystość Mat.', score: avg(surveys.map(s => s.ratings.materialsClarity)) },
    { name: 'Merytoryka Mat.', score: avg(surveys.map(s => s.ratings.materialsMerit)) },
  ];

  // Dynamiczne zbieranie WSZYSTKICH unikalnych trenerów obecnych w danych
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
  
  const trainerData = activeTrainers.map(tId => {
    const trainerRatingsCount = surveys.filter(s => s.trainerRatings?.[tId] && s.trainerRatings[tId].knowledge !== null).length;
    const baseName = TRAINER_MAP[tId] || tId.replace(/_/g, ' ');
    const finalName = maskName(baseName);
    
    return {
      name: finalName,
      displayName: `${finalName} (${trainerRatingsCount})`,
      wiedza: avg(surveys.map(s => s.trainerRatings?.[tId]?.knowledge)),
      dydaktyka: avg(surveys.map(s => s.trainerRatings?.[tId]?.didactics)),
      przygotowanie: avg(surveys.map(s => s.trainerRatings?.[tId]?.preparation)),
      komunikacja: avg(surveys.map(s => s.trainerRatings?.[tId]?.communication)),
      kultura: avg(surveys.map(s => s.trainerRatings?.[tId]?.culture)),
    };
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-chart-simple text-orange-500"></i> Kryteria Główne & Materiały
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                <YAxis domain={[0, 6]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} 
                />
                <Bar dataKey="score" fill="#ea580c" radius={[10, 10, 0, 0]} barSize={45} name="Średnia" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-users text-blue-500"></i> Porównanie Trenerów
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trainerData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="displayName" 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tick={{ fontSize: 8, fontWeight: 800, fill: '#64748b' }} 
                />
                <YAxis domain={[0, 6]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <Bar dataKey="wiedza" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Wiedza" />
                <Bar dataKey="dydaktyka" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Dydaktyka" />
                <Bar dataKey="przygotowanie" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Przygotowanie" />
                <Bar dataKey="komunikacja" fill="#10b981" radius={[2, 2, 0, 0]} name="Komunikacja" />
                <Bar dataKey="kultura" fill="#f43f5e" radius={[2, 2, 0, 0]} name="Kultura" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
        <h3 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-widest flex items-center gap-2">
           <i className="fa-solid fa-compass-drafting text-orange-500"></i> Profil Jakościowy QUEST
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-10">Zestawienie średnich dla wszystkich kategorii szkolenia</p>
        <div className="h-[450px] w-full max-w-2xl">
           <ResponsiveContainer width="100%" height="100%">
             <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
               { subject: 'Organizacja', value: avg(surveys.map(s => s.ratings.organization)) },
               { subject: 'Metodyka', value: avg(surveys.map(s => s.ratings.methods)) },
               { subject: 'Praktyka', value: avg(surveys.map(s => s.ratings.practicality)) },
               { subject: 'Materiały (Mer)', value: avg(surveys.map(s => s.ratings.materialsMerit)) },
               { subject: 'Wiedza Kadry', value: avg(surveys.map(s => Math.max(...activeTrainers.map(tId => s.trainerRatings?.[tId]?.knowledge || 0)))) },
               { subject: 'Komunikacja', value: avg(surveys.map(s => Math.max(...activeTrainers.map(tId => s.trainerRatings?.[tId]?.communication || 0)))) },
               { subject: 'Kultura', value: avg(surveys.map(s => Math.max(...activeTrainers.map(tId => s.trainerRatings?.[tId]?.culture || 0)))) },
             ]}>
               <PolarGrid stroke="#e2e8f0" />
               <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
               <PolarRadiusAxis angle={30} domain={[0, 6]} tick={{ fontSize: 8 }} axisLine={false} />
               <Radar name="Skala Ocen" dataKey="value" stroke="#ea580c" fill="#ea580c" fillOpacity={0.5} />
               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
             </RadarChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
