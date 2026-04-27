
import { GoogleGenAI, Type } from "@google/genai";
import { SurveyRecord, TRAINER_MAP } from "../types";

const SYSTEM_INSTRUCTION = `
Jesteś zaawansowanym systemem OCR dla firmy "QUEST". Analizujesz ankiety szkoleniowe (PDF/foto/online).

ZASADY MAPOWANIA PYTAŃ:
1. OCENA SZKOLENIA (Sekcja 1):
   - "organizacja" -> klucz: organization
   - "zastosowane metody i techniki" -> klucz: methods
   - "praktyczne wykorzystanie prezentowanej wiedzy" -> klucz: practicality
   - Uwagi pod tymi pytaniami -> klucz: comments.general

2. OCENA MATERIAŁÓW (Sekcja 2):
   - "przejrzystość" -> klucz: materialsClarity
   - "zawartość merytoryczna" -> klucz: materialsMerit

3. OCENA TRENERA (Sekcja 3):
   Wyszukaj imię i nazwisko trenera: ${Object.values(TRAINER_MAP).join(", ")}.
   Mapuj 6 podpunktów na 5 kluczy JSON:
   - "wiedza merytoryczna i kompetencje" -> knowledge
   - "umiejętności dydaktyczne..." -> didactics
   - "przygotowanie do prowadzenia zajęć" -> preparation
   - "podtrzymanie zainteresowania" LUB "umiejętność komunikowania się" -> communication (wyciągnij średnią lub wyższą, jeśli są oba)
   - "kultura osobista" -> culture

4. KOMENTARZE KOŃCOWE:
   - "szczególnie pozytywnie oceniasz" -> comments.positive
   - "szczególnie negatywnie oceniasz" -> comments.negative
   - "co możemy zrobić, żeby ułatwić pracę" -> comments.suggestions

MAPOWANIE TRENERÓW (Klucze):
${Object.entries(TRAINER_MAP).map(([id, name]) => `${name} -> ${id}`).join("\n")}

STRUKTURA JSON:
{
  "surveys": [
    {
      "trainingTitle": "string",
      "date": "string",
      "place": "string",
      "ratings": { "organization": n|null, "methods": n|null, "practicality": n|null, "materialsClarity": n|null, "materialsMerit": n|null },
      "trainerRatings": {
        "id_trenera": { "knowledge": n|null, "didactics": n|null, "preparation": n|null, "communication": n|null, "culture": n|null }
      },
      "comments": { "positive": "", "negative": "", "suggestions": "", "general": "" }
    }
  ]
}
`;

export async function processSurveyFiles(files: { data: string, mimeType: string }[]): Promise<SurveyRecord[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const mediaParts = files.map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.data
    }
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          ...mediaParts,
          { text: "Wyodrębnij dane z ankiet Quest zgodnie z instrukcją systemową. Upewnij się, że oceny metod, praktyki i merytoryki materiałów są poprawnie przypisane do kluczy ratings." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16000 }
      }
    });

    const rawText = response.text || "";
    let jsonStr = rawText.trim();
    if (jsonStr.includes('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) jsonStr = match[1];
    }
    
    const result = JSON.parse(jsonStr);
    const surveys = result.surveys || [];
    
    return surveys.map((s: any, idx: number) => ({
      ...s,
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
    }));
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
}
