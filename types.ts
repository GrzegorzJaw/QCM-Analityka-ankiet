
export interface TrainerScores {
  knowledge: number | null;      // Wiedza merytoryczna i kompetencje
  didactics: number | null;      // Umiejętności dydaktyczne i sposób przekazywania
  preparation: number | null;    // Przygotowanie do prowadzenia zajęć
  communication: number | null;  // Komunikacja i podtrzymanie zainteresowania
  culture: number | null;        // Kultura osobista
}

export interface SurveyRecord {
  id: string;
  trainingTitle: string;
  date: string;
  place: string;
  ratings: {
    organization: number | null;      // 1a. Organizacja
    methods: number | null;           // 1b. Metody i techniki
    practicality: number | null;      // 1c. Praktyczne wykorzystanie
    materialsClarity: number | null;  // 2a. Przejrzystość materiałów
    materialsMerit: number | null;    // 2b. Zawartość merytoryczna materiałów
  };
  trainerRatings: Record<string, TrainerScores>;
  comments: {
    positive: string;   // Szczególnie pozytywnie oceniasz
    negative: string;   // Szczególnie negatywnie oceniasz
    suggestions: string; // Co możemy zrobić, żeby ułatwić pracę (sugestie)
    general: string;    // Uwagi do sekcji 1 i 2 (organizacja i materiały)
  };
  fileName?: string;
}

export enum AppTab {
  UPLOAD = 'upload',
  SUMMARY = 'summary',
  TABLE = 'table',
  EDA = 'eda'
}

export const TRAINER_MAP: Record<string, string> = {
  krzysztof_sarnecki: "Krzysztof Sarnecki",
  tomasz_zambrzycki: "Tomasz Zambrzycki",
  renata_kozlowska: "Renata Kozłowska",
  anna_skoczylas: "Anna Skoczylas",
  luiza_wozniak: "Luiza Woźniak",
  dominik_skowronski: "Dominik Skowroński",
  radoslaw_kuzel: "Radosław Kużel",
  pawel_bilski: "Paweł Bilski",
  michal_rudnicki: "Michał Rudnicki",
  jacek_blaszczak: "Jacek Błaszczak",
  robert_noworolski: "Robert Noworolski"
};
