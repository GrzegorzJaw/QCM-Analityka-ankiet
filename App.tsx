
import React, { useState, useEffect, useMemo } from 'react';
import { AppTab, SurveyRecord } from './types';
import { SurveyUploader } from './components/SurveyUploader';
import { SummaryDashboard } from './components/SummaryDashboard';
import { DetailedTableView } from './components/DetailedTableView';
import { EDADashboard } from './components/EDADashboard';
import { exportToExcel, exportToPDF } from './utils/exportUtils';
import { firebaseService } from './services/firebaseService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SUMMARY);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginError, setLoginError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Filtry
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string>('all');

  const [loginData, setLoginData] = useState({ login: '', password: '' });

  // Monitorowanie stanu autoryzacji i ładowanie danych
  useEffect(() => {
    // 1. Sprawdzenie sesji (hardcoded admin dla Emilia)
    const auth = sessionStorage.getItem('quest_admin_auth');
    if (auth === 'true') setIsAdmin(true);

    // 2. Pobieranie danych z Firestore
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await firebaseService.getAllSurveys();
        setSurveys(data);
      } catch (err) {
        console.error("Błąd pobierania danych", err);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    fetchData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.login === 'Emilia' && loginData.password === 'Quest123!') {
      setIsAdmin(true);
      sessionStorage.setItem('quest_admin_auth', 'true');
      setShowLoginModal(false);
      setLoginError('');
      setLoginData({ login: '', password: '' });
    } else {
      setLoginError('Nieprawidłowy login lub hasło');
    }
  };

  const handleLogout = async () => {
    setIsAdmin(false);
    sessionStorage.removeItem('quest_admin_auth');
    await firebaseService.logout();
    if (activeTab === AppTab.UPLOAD) setActiveTab(AppTab.SUMMARY);
  };

  const handleDataLoaded = async (newSurveys: SurveyRecord[], fileName: string) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      await firebaseService.addSurveys(newSurveys, fileName);
      const updatedData = await firebaseService.getAllSurveys();
      setSurveys(updatedData);
      setSelectedFile(fileName);
      setActiveTab(AppTab.SUMMARY);
    } catch (err) {
      alert("Błąd podczas zapisywania danych w bazie Firestore.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSelectedFileSet = async () => {
    if (!isAdmin || selectedFile === 'all') return;
    
    const countToDelete = surveys.filter(s => s.fileName === selectedFile).length;
    
    if (confirm(`Zbiór "${selectedFile}" zawiera ${countToDelete} ankiet. Czy na pewno chcesz go TRWALE usunąć z bazy?`)) {
      setIsLoading(true);
      try {
        await firebaseService.deleteSurveysByFileName(selectedFile);
        const updatedData = await firebaseService.getAllSurveys();
        setSurveys(updatedData);
        setSelectedFile('all');
      } catch (err) {
        alert("Błąd podczas usuwania danych z bazy.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearAllData = async () => {
    if (!isAdmin) return;
    if (confirm("UWAGA: Ta operacja nieodwracalnie usunie WSZYSTKIE ankiety z chmury. Kontynuować?")) {
      setIsLoading(true);
      try {
        await firebaseService.clearAllData();
        setSurveys([]);
        setSelectedFile('all');
        setActiveTab(AppTab.UPLOAD);
      } catch (err) {
        alert("Błąd podczas czyszczenia bazy danych.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getQuarter = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('.');
    if (parts.length < 2) return null;
    const month = parseInt(parts[1], 10);
    if (isNaN(month)) return null;
    if (month >= 1 && month <= 3) return 'I';
    if (month >= 4 && month <= 6) return 'II';
    if (month >= 7 && month <= 9) return 'III';
    if (month >= 10 && month <= 12) return 'IV';
    return null;
  };

  const getYear = (s: SurveyRecord) => {
    if (s.fileName && s.fileName.includes('2026')) return '2026';
    if (!s.date || typeof s.date !== 'string') return null;
    const parts = s.date.split('.');
    return parts[parts.length - 1];
  };

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const year = getYear(s);
      const quarter = getQuarter(s.date);
      const matchYear = selectedYear === 'all' || year === selectedYear;
      const matchQuarter = selectedQuarter === 'all' || quarter === selectedQuarter;
      const matchFile = selectedFile === 'all' || s.fileName === selectedFile;
      return matchYear && matchQuarter && matchFile;
    });
  }, [surveys, selectedYear, selectedQuarter, selectedFile]);

  const uniqueFiles = useMemo(() => {
    return Array.from(new Set(surveys.map(s => s.fileName))).filter(Boolean) as string[];
  }, [surveys]);

  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
          <p className="font-black text-slate-800 uppercase tracking-widest text-sm">Ładowanie bazy Firestore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 text-white p-2 rounded-xl shadow-md cursor-pointer" onClick={() => setActiveTab(AppTab.SUMMARY)}>
                <i className="fa-solid fa-chart-line text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">QUEST <span className="text-orange-600">ANALYTICS</span></h1>
                <div className="flex items-center gap-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Analizy Ankiet</p>
                  {isAdmin && <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-orange-200">Admin Mode</span>}
                </div>
              </div>
            </div>

            <nav className="hidden md:flex gap-1">
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab(AppTab.UPLOAD)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === AppTab.UPLOAD ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <i className="fa-solid fa-plus-circle mr-2"></i> Nowe Dane
                </button>
              )}
              <button 
                onClick={() => setActiveTab(AppTab.SUMMARY)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === AppTab.SUMMARY ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className="fa-solid fa-gauge-high mr-2"></i> Dashboard
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.TABLE)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === AppTab.TABLE ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className="fa-solid fa-list-check mr-2"></i> Dane
              </button>
              <button 
                onClick={() => setActiveTab(AppTab.EDA)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === AppTab.EDA ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <i className="fa-solid fa-chart-pie mr-2"></i> Statystyki
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {isLoading && <i className="fa-solid fa-sync fa-spin text-slate-300"></i>}
              {surveys.length > 0 && (
                <div className="flex items-center gap-1 mr-4">
                  <button onClick={() => exportToExcel(filteredSurveys)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Eksport Excel"><i className="fa-solid fa-file-excel"></i></button>
                  <button onClick={() => exportToPDF(filteredSurveys)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Eksport PDF"><i className="fa-solid fa-file-pdf"></i></button>
                </div>
              )}
              
              {!isAdmin ? (
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-slate-800 text-white text-[11px] font-black rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-lock"></i> ZALOGUJ
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={clearAllData} className="p-2 text-slate-300 hover:text-red-600 transition-colors" title="Wyczyść całą bazę"><i className="fa-solid fa-trash-can text-lg"></i></button>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white text-[11px] font-black rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    <i className="fa-solid fa-power-off"></i> WYLOGUJ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-10 border border-slate-200">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3">
                <i className="fa-solid fa-user-shield text-3xl"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel Administracyjny</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Dostęp chroniony hasłem</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Login</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                  value={loginData.login}
                  onChange={e => setLoginData({...loginData, login: e.target.value})}
                  placeholder="Użytkownik"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Hasło</label>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                  value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-red-600 text-[10px] font-bold text-center bg-red-50 py-3 rounded-2xl">{loginError}</p>}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold text-xs rounded-2xl hover:bg-slate-200 transition-all font-black uppercase tracking-widest"
                >
                  Anuluj
                </button>
                <button 
                  type="submit"
                  className="flex-2 px-8 py-4 bg-orange-600 text-white font-black text-xs rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/30"
                >
                  ZALOGUJ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {surveys.length > 0 && (
        <div className="bg-slate-900 text-white border-b border-slate-800 py-4 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-tighter">Rok:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
              >
                <option value="all">Wszystkie</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-tighter">Kwartał:</label>
              <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                {['all', 'I', 'II', 'III', 'IV'].map(q => (
                  <button 
                    key={q} 
                    onClick={() => setSelectedQuarter(q)}
                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${selectedQuarter === q ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                  >
                    {q === 'all' ? 'WSZYSTKIE' : q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-tighter">Zbiór danych:</label>
              <div className="flex gap-2 flex-1 items-center">
                <select 
                  value={selectedFile} 
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold flex-1 outline-none text-orange-400 cursor-pointer"
                >
                  <option value="all">Wszystkie wgrane pliki</option>
                  {uniqueFiles.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {isAdmin && selectedFile !== 'all' && (
                  <button 
                    disabled={isLoading}
                    onClick={deleteSelectedFileSet}
                    className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/30 whitespace-nowrap disabled:opacity-50"
                  >
                    <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-trash-can'}`}></i> USUŃ TEN ZBIÓR
                  </button>
                )}
              </div>
            </div>

            <div className="text-[11px] font-black">
              ANKIETY: <span className="text-orange-500">{filteredSurveys.length}</span> / {surveys.length}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === AppTab.UPLOAD && isAdmin ? (
          <div className="animate-in fade-in duration-500 slide-in-from-top-4">
            <SurveyUploader onDataLoaded={handleDataLoaded} />
          </div>
        ) : filteredSurveys.length > 0 ? (
          <div className="animate-in fade-in duration-500">
            {activeTab === AppTab.SUMMARY && <SummaryDashboard surveys={filteredSurveys} isAdmin={isAdmin} />}
            {activeTab === AppTab.TABLE && <DetailedTableView surveys={filteredSurveys} />}
            {activeTab === AppTab.EDA && <EDADashboard surveys={filteredSurveys} isAdmin={isAdmin} />}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
             <i className="fa-solid fa-database text-6xl text-slate-100 mb-6"></i>
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Baza danych w chmurze</h2>
             <p className="text-slate-500 mt-3 max-w-md mx-auto font-medium">
               {isAdmin ? "Wgraj ankiety w zakładce 'Nowe Dane', aby pojawiły się w Firestore." : "Baza danych Quest jest obecnie pusta."}
             </p>
             {isAdmin && (
               <button onClick={() => setActiveTab(AppTab.UPLOAD)} className="mt-8 px-8 py-3 bg-orange-600 text-white font-black text-xs rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 uppercase">
                 Przejdź do wgrywania
               </button>
             )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 text-center mt-auto">
        <div className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
          QUEST SURVEY INSIGHTS © {new Date().getFullYear()}
        </div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[9px] font-bold text-slate-500">
          <i className={`fa-solid ${isAdmin ? 'fa-unlock text-orange-500' : 'fa-lock'}`}></i>
          Tryb: {isAdmin ? 'ADMINISTRATOR' : 'GOŚĆ'}
        </div>
      </footer>
    </div>
  );
};

export default App;
