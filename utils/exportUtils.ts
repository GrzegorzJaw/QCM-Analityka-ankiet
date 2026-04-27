
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import pptxgen from 'pptxgenjs';
import { SurveyRecord, TRAINER_MAP } from '../types';

const avg = (arr: (number | null)[]) => {
  const valid = arr.filter(v => v !== null && !isNaN(v as number)) as number[];
  return valid.length ? parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)) : 0;
};

export const exportToExcel = (surveys: SurveyRecord[]) => {
  const wb = XLSX.utils.book_new();
  
  const flatData = surveys.map(s => {
    const base: any = {
      'ID': s.id,
      'Plik': s.fileName,
      'Szkolenie': s.trainingTitle,
      'Data': s.date,
      'Miejsce': s.place,
      'Org': s.ratings.organization,
      'Metody': s.ratings.methods,
      'Praktyka': s.ratings.practicality,
      'Plusy': s.comments.positive,
      'Sugestie': s.comments.suggestions
    };

    // Dodaj oceny każdego trenera jako osobne kolumny
    Object.keys(TRAINER_MAP).forEach(tId => {
      const scores = s.trainerRatings?.[tId];
      if (scores && (scores.knowledge !== null)) {
        const name = TRAINER_MAP[tId];
        base[`${name}: Wiedza`] = scores.knowledge;
        // Fixed: Changed 'engagement' to 'communication' to match TrainerScores interface
        base[`${name}: Komun.`] = scores.communication;
      }
    });

    return base;
  });

  const ws = XLSX.utils.json_to_sheet(flatData);
  XLSX.utils.book_append_sheet(wb, ws, "Filtrowane Dane");
  XLSX.writeFile(wb, `Quest_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
};

export const exportToPDF = (surveys: SurveyRecord[]) => {
  const doc = new jsPDF() as any;
  doc.setFontSize(18);
  doc.text('Quest Survey Analytics - Raport', 14, 20);
  doc.setFontSize(10);
  doc.text(`Liczba ankiet w raporcie: ${surveys.length}`, 14, 30);
  
  doc.autoTable({
    startY: 40,
    head: [['Szkolenie', 'Data', 'Org', 'Met', 'Śr. Kadry']],
    body: surveys.map(s => {
      const trainerVals: number[] = [];
      Object.values(s.trainerRatings || {}).forEach(tr => {
        if (tr?.knowledge !== null) trainerVals.push(tr.knowledge);
      });
      return [
        s.trainingTitle, 
        s.date, 
        s.ratings.organization, 
        s.ratings.methods,
        trainerVals.length ? (trainerVals.reduce((a, b) => a+b, 0) / trainerVals.length).toFixed(2) : '-'
      ];
    }),
  });
  doc.save('Quest_Raport.pdf');
};
