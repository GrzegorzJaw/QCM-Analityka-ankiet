import { GoogleGenAI } from "@google/genai";
import { SurveyRecord, TRAINER_MAP } from "../types";

/**
 * Instrukcja systemowa definiująca zasady OCR i mapowania danych dla modelu Gemini.
 * Zapewnia spójność z kolekcją "ankiety" w Firestore.
 */
const SYSTEM_INSTRUCTION = `
Jesteś zaawansowanym systemem OCR dla firmy "QUEST". Analizujesz ankiety szkoleniowe (PDF/foto/online). Twoim celem jest wygenerowanie czystego JSON-a, który zostanie zapisany w bazie Firestore w kolekcji "ankiety".

ZASADY MAPOWANIA PYTAŃ:
1. OCENA SZKOLENIA (Sekcja 1):
   - "organizacja" -> klucz: ratings.organization
   - "zastosowane metody i techniki" -> klucz: ratings.methods
   - "praktyczne wykorzystanie prezentowanej wiedzy" -> klucz: ratings.practicality
   - Uwagi pod tymi pytaniami -> klucz: comments.general

2. OCENA MATERIAŁÓW (Sekcja 2):
   - "przejrzystość" -> klucz: ratings.materialsClarity
   - "zawartość merytoryczna" -> klucz: ratings.materialsMerit

3. OCENA TRENERA (Sekcja 3):
   Wyszukaj imię i nazwisko trenera z listy: ${Object.values(TRAINER_MAP).join(", ")}.
   Mapuj podpunkty na klucze w trainerRatings[id_trenera]:
   - "wiedza merytoryczna i kompetencje" -> knowledge
   - "umiejętności dydaktyczne..." -> didactics
   - "przygotowanie do prowadzenia zajęć" -> preparation
   - "podtrzymanie zainteresowania" LUB "umiejętność komunikowania się" -> communication
   - "kultura osobista" -> culture

4. KOMENTARZE KOŃCOWE:
   - "szczególnie pozytywnie oceniasz" -> comments.positive
   - "szczególnie negatywnie oceniasz" -> comments.negative
   - "co możemy zrobić, żeby ułatwić pracę" -> comments.suggestions

MAPOWANIE TRENERÓW (Użyj tych kluczy ID w trainerRatings):
${Object.entries(TRAINER_MAP).map(([id, name]) => `${name} -> ${id}`).join("\n")}

STRUKTURA JSON (Zgodna z kolekcją 'ankiety'):
{
  "surveys": [
    {
      "trainingTitle": "string",
      "date": "string",
      "place": "string",
      "ratings": { 
        "organization": n|null, 
        "methods": n|null, 
        "practicality": n|null, 
        "materialsClarity": n|null, 
        "materialsMerit": n|null 
      },
      "trainerRatings": {
        "id_trenera": { 
          "knowledge": n|null, 
          "didactics": n|null, 
          "preparation": n|null, 
          "communication": n|null, 
          "culture": n|null 
        }
      },
      "comments": { 
        "positive": "string", 
        "negative": "string", 
        "suggestions": "string", 
        "general": "string" 
      }
    }
  ]
}
`;

/**
 * Przetwarza pliki ankiet (obrazy/PDF) przy użyciu Google Gemini AI.
 * @param files Tablica obiektów zawierających dane base64 i typ MIME pliku.
 * @returns Obietnica zwracająca tablicę rekordów ankiet gotowych do zapisu.
 */
export async function processSurveyFiles(files: { data: string, mimeType: string }[]): Promise<SurveyRecord[]> {
  // Pobieranie klucza API ze zmiennych środowiskowych Vite (z pliku .env)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Błąd konfiguracji: Brak klucza VITE_GEMINI_API_KEY. Upewnij się, że plik .env istnieje w głównym folderze.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Przygotowanie części multimedialnych dla modelu (obrazy/dokumenty)
  const mediaParts = files.map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.data
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-pro', // Najszybszy model do analizy dokumentów
      contents: {
        parts: [
          ...mediaParts,
          { text: "Wyodrębnij dane z ankiet Quest zgodnie z instrukcją systemową dla bazy 'ankiety'. Zwróć tylko czysty obiekt JSON." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.1 // Niska temperatura dla większej precyzji OCR
      }
    });

    const rawText = response.text || "";
    let jsonStr = rawText.trim();
    
    // Usuwanie znaczników bloków kodu markdown (zabezpieczone kodowaniem Unicode przed ucięciem kodu)
    if (jsonStr.includes('\u0060\u0060\u0060')) {
      const regex = new RegExp('\\u0060\\u0060\\u0060(?:json)?\\s*([\\s\\S]*?)\\s*\\u0060\\u0060\\u0060');
      const match = jsonStr.match(regex);
      if (match) jsonStr = match[1];
    }
    
    const result = JSON.parse(jsonStr);
    const surveys = result.surveys || [];
    
    // Generowanie unikalnych identyfikatorów dla nowych rekordów
    return surveys.map((s: any, idx: number) => ({
      ...s,
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
    }));
  } catch (error: any) {
    console.error("Błąd serwisu Gemini:", error);
    throw new Error("Wystąpił problem podczas analizy plików przez AI. Sprawdź klucz API i format plików.");
  }
}