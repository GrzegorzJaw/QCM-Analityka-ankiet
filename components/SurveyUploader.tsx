
import React, { useState, useRef, useEffect } from 'react';
import { processSurveyFiles } from '../services/geminiService';
import { SurveyRecord } from '../types';

interface SurveyUploaderProps {
  onDataLoaded: (data: SurveyRecord[], fileName: string) => void;
}

export const SurveyUploader: React.FC<SurveyUploaderProps> = ({ onDataLoaded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setWorkingSeconds(prev => prev + 1);
        if (workingSeconds > 15 && workingSeconds <= 30) setStatusLabel("AI intensywnie analizuje pismo ręczne...");
        if (workingSeconds > 30 && workingSeconds <= 60) setStatusLabel("Duży dokument. Rozpoznawanie tabel i ocen...");
        if (workingSeconds > 60) setStatusLabel("Prawie gotowe, model kończy generować raport JSON...");
      }, 1000);
    } else {
      setWorkingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing, workingSeconds]);

  // Obsługa wklejania (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }

      if (files.length > 0) {
        startProcessing(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing]);

  const fileToData = (file: File): Promise<{ data: string, mimeType: string, name: string }> => {
    return new Promise((resolve, reject) => {
      if (file.size > 25 * 1024 * 1024) {
        reject(new Error(`Plik ${file.name} jest za duży (max 25MB).`));
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({
          data: base64,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
          name: file.name
        });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const startProcessing = async (files: File[]) => {
    const fileName = files[0].name || `Wklejone_${new Date().toLocaleTimeString()}`;
    setIsProcessing(true);
    setError(null);
    setProgress(5);
    setStatusLabel("Przygotowanie plików...");

    try {
      const processedFiles = await Promise.all(files.map(fileToData));
      const allExtractedSurveys: SurveyRecord[] = [];
      const totalFiles = processedFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const currentFile = processedFiles[i];
        setStatusLabel(`Analiza AI pliku ${i + 1} z ${totalFiles}...`);
        setProgress(10 + (i / totalFiles) * 80);

        try {
          const results = await processSurveyFiles([currentFile]);
          if (results && results.length > 0) {
            allExtractedSurveys.push(...results);
          }
        } catch (singleFileErr: any) {
          console.error(`Błąd pliku ${currentFile.name}:`, singleFileErr);
          if (totalFiles === 1) throw singleFileErr;
        }
      }

      if (allExtractedSurveys.length === 0) {
        throw new Error("AI nie odnalazło żadnych czytelnych danych ankietowych. Sprawdź jakość skanu.");
      }

      setStatusLabel("Analiza zakończona!");
      setProgress(100);
      
      setTimeout(() => {
        onDataLoaded(allExtractedSurveys, fileName);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsProcessing(false);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Błąd krytyczny analizy.");
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    startProcessing(Array.from(files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      startProcessing(Array.from(files));
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-12 border border-slate-200">
      <div className="max-w-xl mx-auto text-center">
        <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-3 shadow-inner">
          <i className="fa-solid fa-wand-magic-sparkles text-4xl"></i>
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight uppercase">Analiza AI 3.0</h2>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">
          Wgraj skany ankiet w formacie <b>PDF, JPG lub PNG</b>. <br/>Możesz też wkleić obraz bezpośrednio ze schowka <b>(Ctrl+V)</b>.
        </p>

        {!isProcessing ? (
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative group cursor-pointer block transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}
          >
            <div className={`flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] p-16 transition-all duration-300 ${isDragging ? 'border-orange-500 bg-orange-50' : 'border-slate-200 group-hover:border-orange-400 group-hover:bg-orange-50/30'}`}>
              <i className={`fa-solid fa-cloud-arrow-up text-6xl mb-6 transition-transform ${isDragging ? 'text-orange-600 scale-110' : 'text-slate-300 group-hover:text-orange-500 group-hover:-translate-y-2'}`}></i>
              <span className="text-slate-700 font-black text-xl">Wybierz lub upuść pliki</span>
              <span className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest">Wspiera PDF oraz zdjęcia</span>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              className="hidden" 
              accept=".pdf,image/*" 
              onChange={handleFileUpload}
            />
          </label>
        ) : (
          <div className="space-y-8 py-6">
            <div className="relative pt-1">
              <div className="flex mb-4 items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 bg-orange-600 text-white rounded-full animate-pulse shadow-lg shadow-orange-600/20">
                  Pracuję...
                </span>
                <span className="text-lg font-black text-orange-600">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="overflow-hidden h-5 mb-4 flex rounded-2xl bg-slate-100 shadow-inner">
                <div 
                  style={{ width: `${progress}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-orange-400 via-orange-600 to-orange-500 transition-all duration-700 ease-out"
                ></div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm">
               <div className="flex items-center justify-center gap-4 text-slate-800">
                <i className="fa-solid fa-sync fa-spin text-orange-600 text-2xl"></i>
                <p className="font-black text-lg tracking-tight">{statusLabel}</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-5 uppercase font-black tracking-widest">
                Czas operacji: {workingSeconds} s
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 p-8 bg-red-50 text-red-700 rounded-3xl border border-red-200 text-left animate-in slide-in-from-top-4 shadow-sm">
            <div className="flex gap-5">
              <i className="fa-solid fa-triangle-exclamation text-3xl mt-1"></i>
              <div>
                <p className="font-black text-xl leading-tight">Błąd analizy</p>
                <p className="text-sm mt-3 font-medium leading-relaxed opacity-90">{error}</p>
                <button 
                  onClick={() => { setError(null); if (fileInputRef.current) fileInputRef.current.click(); }} 
                  className="mt-6 px-6 py-3 bg-red-600 text-white font-black text-xs rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 uppercase"
                >
                  Spróbuj ponownie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
