import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Python dateparser API endpoint (fallback for complex date parsing)
const DATEPARSER_API_URL = 'https://dateparser-api.vercel.app/parse';

// Enhanced date parser that can handle multiple dates in one message
const parseGermanDate = (dateString: string, referenceDate: string): string | null => {
  const now = new Date(referenceDate);
  const input = dateString.toLowerCase().trim();
  
  // Handle relative dates
  if (input.includes('heute')) {
    return now.toISOString().split('T')[0];
  }
  
  if (input.includes('gestern')) {
    const yesterday = new Date(now.getTime() - 86400000);
    return yesterday.toISOString().split('T')[0];
  }
  
  if (input.includes('vorgestern')) {
    const dayBeforeYesterday = new Date(now.getTime() - 172800000);
    return dayBeforeYesterday.toISOString().split('T')[0];
  }
  
  // Handle "vor X Tagen"
  const daysAgoMatch = input.match(/vor\s+(\d+|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\s+tag(?:en?)?/i);
  if (daysAgoMatch) {
    let daysAgo = 1;
    const numberWord = daysAgoMatch[1].toLowerCase();
    
    if (numberWord.match(/\d+/)) {
      daysAgo = parseInt(numberWord);
    } else {
      const writtenNumbers: Record<string, number> = {
        'einem': 1, 'einer': 1, 'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5,
        'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10
      };
      daysAgo = writtenNumbers[numberWord] || 1;
    }
    
    const targetDate = new Date(now.getTime() - (daysAgo * 86400000));
    return targetDate.toISOString().split('T')[0];
  }
  
  // Handle weekdays
  const weekdays = {
    'montag': 1, 'dienstag': 2, 'mittwoch': 3, 'donnerstag': 4,
    'freitag': 5, 'samstag': 6, 'sonntag': 0
  };
  
  for (const [day, dayNum] of Object.entries(weekdays)) {
    if (input.includes(day)) {
      const currentDay = now.getDay();
      let daysBack = 0;
      
      if (currentDay === dayNum) {
        daysBack = 7; // Last week same day
      } else if (currentDay > dayNum) {
        daysBack = currentDay - dayNum; // Earlier this week
      } else {
        daysBack = currentDay + (7 - dayNum); // Last week
      }
      
      const targetDate = new Date(now.getTime() - (daysBack * 86400000));
      return targetDate.toISOString().split('T')[0];
    }
  }
  
  return null;
};

// Function to extract and parse multiple dates from a message
const extractDatesFromMessage = (message: string, referenceDate: string): { [key: string]: string } => {
  const now = new Date(referenceDate);
  const dateMap: { [key: string]: string } = {};
  
  // Calculate all possible dates
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const dayBeforeYesterday = new Date(now.getTime() - 172800000).toISOString().split('T')[0];
  
  // Calculate weekdays
  const getLastWeekday = (targetDay: number) => {
    const date = new Date(now);
    const currentDay = date.getDay();
    let daysBack = 0;
    
    if (currentDay === targetDay) {
      daysBack = 7; // Last week same day
    } else if (currentDay > targetDay) {
      daysBack = currentDay - targetDay; // Earlier this week
    } else {
      daysBack = currentDay + (7 - targetDay); // Last week
    }
    
    date.setDate(date.getDate() - daysBack);
    return date.toISOString().split('T')[0];
  };
  
  // Map date expressions to actual dates
  dateMap['heute'] = today;
  dateMap['gestern'] = yesterday;
  dateMap['vorgestern'] = dayBeforeYesterday;
  dateMap['montag'] = getLastWeekday(1);
  dateMap['dienstag'] = getLastWeekday(2);
  dateMap['mittwoch'] = getLastWeekday(3);
  dateMap['donnerstag'] = getLastWeekday(4);
  dateMap['freitag'] = getLastWeekday(5);
  dateMap['samstag'] = getLastWeekday(6);
  dateMap['sonntag'] = getLastWeekday(0);
  
  // Handle "vor X Tagen" patterns
  for (let i = 1; i <= 10; i++) {
    const date = new Date(now.getTime() - (i * 86400000)).toISOString().split('T')[0];
    dateMap[`vor ${i} tag`] = date;
    dateMap[`vor ${i} tagen`] = date;
  }
  
  // Handle written numbers
  const writtenNumbers: Record<string, number> = {
    'einem': 1, 'einer': 1, 'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5,
    'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10
  };
  
  for (const [word, num] of Object.entries(writtenNumbers)) {
    const date = new Date(now.getTime() - (num * 86400000)).toISOString().split('T')[0];
    dateMap[`vor ${word} tag`] = date;
    dateMap[`vor ${word} tagen`] = date;
  }
  
  return dateMap;
};

// Function to parse dates using Python dateparser API
const parseDateWithPython = async (dateString: string, referenceDate?: string): Promise<string | null> => {
  try {
    const response = await fetch(DATEPARSER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date_string: dateString,
        reference_date: referenceDate || new Date().toISOString().split('T')[0],
        languages: ['de', 'en'],
        settings: {
          PREFER_DAY_OF_MONTH: 'first',
          PREFER_DATES_FROM: 'past',
          RELATIVE_BASE: referenceDate || new Date().toISOString().split('T')[0]
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.parsed_date) {
        return result.parsed_date.split('T')[0]; // Return only date part
      }
    }
    
    console.log('Python dateparser API failed or returned no result');
    return null;
  } catch (error: any) {
    console.log('Error calling Python dateparser API:', error);
    return null;
  }
};

// Function to detect and handle truncated JSON responses
const handleTruncatedJSON = (text: string): { isComplete: boolean; parsedData: any | null; errorMessage?: string } => {
  try {
    // First, try to extract JSON from markers
    const jsonMatch = text.match(/---JSON_START---(.*?)---JSON_END---/s);
    if (jsonMatch) {
      const jsonString = jsonMatch[1].trim();
      const parsedData = JSON.parse(jsonString);
      return { isComplete: true, parsedData };
    }
    
    // If no markers, try to parse the entire response as JSON
    const parsedData = JSON.parse(text);
    return { isComplete: true, parsedData };
  } catch (error) {
    // Check if the response looks like it was truncated
    const hasJSONStart = text.includes('---JSON_START---');
    const hasJSONEnd = text.includes('---JSON_END---');
    const hasOpenBrace = text.includes('{');
    const hasCloseBrace = text.includes('}');
    
    if (hasJSONStart && !hasJSONEnd) {
      return {
        isComplete: false,
        parsedData: null,
        errorMessage: 'JSON response was truncated - missing end marker'
      };
    }
    
    if (hasOpenBrace && !hasCloseBrace) {
      return {
        isComplete: false,
        parsedData: null,
        errorMessage: 'JSON response was truncated - incomplete JSON structure'
      };
    }
    
    // Try to extract partial JSON and reconstruct it
    if (hasJSONStart) {
      try {
        const partialMatch = text.match(/---JSON_START---([\s\S]*)/s);
        if (partialMatch) {
          const partialJSON = partialMatch[1].trim();
          
          // Try to fix common truncation issues
          let fixedJSON = partialJSON;
          
          // If it ends with incomplete text, try to close the JSON structure
          if (!fixedJSON.endsWith('}')) {
            // Count open braces vs close braces
            const openBraces = (fixedJSON.match(/{/g) || []).length;
            const closeBraces = (fixedJSON.match(/}/g) || []).length;
            const missingBraces = openBraces - closeBraces;
            
            if (missingBraces > 0) {
              // Add missing closing braces
              fixedJSON += '}'.repeat(missingBraces);
            }
            
            // If it ends with incomplete array, close it
            if (fixedJSON.includes('[') && !fixedJSON.includes(']')) {
              const openBrackets = (fixedJSON.match(/\[/g) || []).length;
              const closeBrackets = (fixedJSON.match(/\]/g) || []).length;
              const missingBrackets = openBrackets - closeBrackets;
              
              if (missingBrackets > 0) {
                fixedJSON += ']'.repeat(missingBrackets);
              }
            }
          }
          
          const parsedData = JSON.parse(fixedJSON);
          return {
            isComplete: false,
            parsedData,
            errorMessage: 'JSON was truncated but partially recovered'
          };
        }
      } catch (fixError: any) {
        console.log('Failed to fix truncated JSON:', fixError);
      }
    }
    
    return {
      isComplete: false,
      parsedData: null,
      errorMessage: 'Could not parse JSON response'
    };
  }
};

// Initialize Google Generative AI with error handling
let genAI: GoogleGenerativeAI | null = null;

const initializeGenAI = () => {
  if (!genAI) {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY || 'AIzaSyCsjfisZpa6Yz3kESROvzyR_y0tyFe3l4g';
      genAI = new GoogleGenerativeAI(apiKey);
      console.log('Google Generative AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Generative AI:', error);
      throw new Error('AI service initialization failed');
    }
  }
  return genAI;
};

export const geminiChatProcedure = publicProcedure
  .input(
    z.object({
      message: z.string().min(1, 'Message cannot be empty'),
      conversationHistory: z.array(
        z.object({
          role: z.enum(['user', 'model']),
          parts: z.array(
            z.object({
              text: z.string(),
            })
          ),
        })
      ).optional().default([]),
    })
  )
  .mutation(async ({ input }: { input: { message: string; conversationHistory?: { role: 'user' | 'model'; parts: { text: string }[] }[] } }) => {
    try {
      console.log('Gemini chat request:', input);
      
      // Validate input
      if (!input.message || input.message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }
      
      // Try to get the model with error handling
      let model;
      try {
        const aiInstance = initializeGenAI();
        model = aiInstance.getGenerativeModel({ 
          model: 'gemini-1.5-flash',  // Use stable model instead of experimental
          generationConfig: {
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        });
      } catch (modelError) {
        console.error('Failed to get generative model:', modelError);
        throw new Error('AI model initialization failed');
      }
      
      // Determine context and set appropriate temperature
      const messageText = input.message.toLowerCase();
      const conversationText = input.conversationHistory?.map(msg => 
        msg.parts.map(part => part.text).join(' ')
      ).join(' ').toLowerCase() || '';
      
      const fullContext = messageText + ' ' + conversationText;
      
      // Food/nutrition context keywords - use lower temperature for accuracy
      const foodKeywords = [
        'kalorien', 'kcal', 'nahrung', 'essen', 'lebensmittel', 'mahlzeit', 'frühstück', 'mittagessen', 'abendessen',
        'snack', 'protein', 'kohlenhydrate', 'fett', 'nährstoffe', 'ernährung', 'diät', 'gewicht', 'abnehmen',
        'zunehmen', 'portion', 'gramm', 'liter', 'ml', 'apfel', 'banane', 'brot', 'reis', 'nudeln', 'fleisch',
        'gemüse', 'obst', 'milch', 'käse', 'ei', 'fisch', 'huhn', 'hähnchen', 'kartoffel', 'salat', 'suppe',
        'wasser', 'trinken', 'getrunken', 'gegessen', 'meal', 'food', 'calories', 'nutrition', 'diet'
      ];
      
      // Fitness context keywords - use higher temperature for creativity
      const fitnessKeywords = [
        'fitness', 'training', 'workout', 'übung', 'sport', 'laufen', 'joggen', 'krafttraining', 'gym',
        'fitnessstudio', 'muskelaufbau', 'ausdauer', 'cardio', 'yoga', 'pilates', 'schwimmen', 'radfahren',
        'fitnessplan', 'trainingsplan', 'übungsplan', 'aktivität', 'bewegung', 'stretching', 'dehnen',
        'push-ups', 'sit-ups', 'squats', 'planks', 'burpees', 'liegestütze', 'kniebeugen', 'klimmzüge',
        'hantel', 'gewichte', 'wiederholungen', 'sätze', 'pause', 'rest', 'recovery', 'regeneration'
      ];
      
      const isFoodContext = foodKeywords.some(keyword => fullContext.includes(keyword));
      const isFitnessContext = fitnessKeywords.some(keyword => fullContext.includes(keyword));
      
      let temperature = 0.4; // Default moderate temperature
      let systemPrompt = '';
      
      if (isFoodContext && !isFitnessContext) {
        // Food/nutrition context - use low temperature for accuracy
        temperature = 0.3;
        systemPrompt = `Du bist ein freundlicher Ernährungs- und Wassertracking-Assistent. Deine Aufgabe ist es, basierend AUSSCHLIESSLICH auf den vom Nutzer bereitgestellten Informationen selbstständige Schätzungen für Lebensmittel, deren Nährwerte und Wasseraufnahme zu erstellen.

KRITISCH WICHTIG - ANTWORTLÄNGE UND VOLLSTÄNDIGE ERFASSUNG:
- Du MUSST ALLE Lebensmittel aus der Nachricht erfassen, egal wie viele es sind
- KEINE Begrenzung auf 5-7 Lebensmittel - erfasse ALLES was der Nutzer erwähnt
- Teile niemals Lebensmittel auf mehrere Nachrichten auf
- Erfasse bis zu 50+ Lebensmittel in einer einzigen Antwort wenn nötig
- Halte nur den TEXT kurz und freundlich mit Emojis, aber erfasse ALLE Aktionen vollständig

WICHTIGE REGELN:
- Frage NIEMALS nach zusätzlichen Informationen wie Portionsgrößen, Zubereitungsart oder genauen Mengen
- Erstelle IMMER realistische Schätzungen basierend auf typischen/durchschnittlichen Werten
- Nutze Standardportionsgrößen (z.B. 1 mittelgroßer Apfel, 1 Scheibe Brot, 1 Portion Pasta)
- Gib konkrete Nährwerte an: Kalorien, Protein, Kohlenhydrate, Fett
- Sei präzise aber arbeite mit den verfügbaren Informationen
- Wenn der Nutzer "Apfel" sagt, schätze für einen mittelgroßen Apfel
- Wenn der Nutzer "2 Äpfel" sagt, verdopple die Werte entsprechend
- Verwende dein Wissen über typische Lebensmittelwerte für deine Schätzungen
- Erkenne Datumsangaben wie "gestern", "heute", "am Montag", "vor 2 Tagen" etc. präzise

WASSER-TRACKING REGELN:
- Erkenne Wasser-bezogene Nachrichten: "Wasser getrunken", "1 Liter Wasser", "2 Gläser Wasser", etc.
- Schätze Wassermengen realistisch:
  - 1 Glas = 0.25 Liter
  - 1 Flasche = 0.5 Liter  
  - 1 Liter = 1.0 Liter
  - Bei unklaren Mengen: schätze basierend auf Kontext
- Erstelle add_water Actions für Wasser-Nachrichten

KRITISCH WICHTIG - MEHRERE TAGE ERKENNEN:
Wenn der Nutzer Lebensmittel für VERSCHIEDENE Tage erwähnt, musst du diese GENAU analysieren und SEPARATE Actions für jeden Tag erstellen:

Beispiele für Mehrere-Tage-Nachrichten:
- "Gestern hatte ich einen Apfel und heute Pizza" → 2 separate Actions
- "Am Montag Brot, am Dienstag Nudeln" → 2 separate Actions  
- "Vor 3 Tagen Salat, gestern Fleisch, heute Reis" → 3 separate Actions
- "Ich hatte diese Woche Montag Müsli, Mittwoch Suppe" → 2 separate Actions

ANTWORT-FORMAT (SEHR WICHTIG):
Du MUSST deine Antwort in folgendem JSON-Format strukturieren, gefolgt von einer natürlichen Antwort:

FÜR LEBENSMITTEL:
---JSON_START---
{
  "text": "Perfekt! 🎉 Ich habe alles erfasst. Weiter so! 😊",
  "actions": [{
    "type": "add_meal",
    "foods": [
      {"name": "Lebensmittelname", "calories": 250, "protein": 8, "carbs": 45, "fat": 3},
      {"name": "Weiteres Lebensmittel", "calories": 80, "protein": 7, "carbs": 1, "fat": 5}
    ],
    "mealType": "breakfast|lunch|dinner|snack",
    "targetDate": "YYYY-MM-DD"
  }]
}
---JSON_END---

FÜR WASSER:
---JSON_START---
{
  "text": "Super! 💧 Ich habe deine Wasseraufnahme erfasst. Weiter so! 😊",
  "actions": [{
    "type": "add_water",
    "amount": 1.5,
    "targetDate": "YYYY-MM-DD"
  }]
}
---JSON_END---

FÜR KOMBINIERTE NACHRICHTEN (Essen + Wasser):
---JSON_START---
{
  "text": "Perfekt! 🎉 Ich habe sowohl dein Essen als auch deine Wasseraufnahme erfasst. Toll gemacht! 😊✨",
  "actions": [
    {
      "type": "add_meal",
      "foods": [{"name": "Apfel", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2}],
      "mealType": "snack",
      "targetDate": "YYYY-MM-DD"
    },
    {
      "type": "add_water",
      "amount": 0.5,
      "targetDate": "YYYY-MM-DD"
    }
  ]
}
---JSON_END---

Natürliche Antwort für den Nutzer:
[Hier eine freundliche, motivierende Antwort über die erfassten Lebensmittel]

WICHTIG FÜR MEHRERE TAGE - BEISPIEL:
Wenn der Nutzer sagt: "Gestern hatte ich einen Apfel und heute Pizza"
Dann MUSST du 2 separate Actions erstellen:

---JSON_START---
{
  "text": "Super! Ich habe beide Tage erfasst - gestern den Apfel und heute die Pizza!",
  "actions": [
    {
      "type": "add_meal",
      "foods": [{"name": "Apfel", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2}],
      "mealType": "snack",
      "targetDate": "2025-08-31"
    },
    {
      "type": "add_meal", 
      "foods": [{"name": "Pizza", "calories": 800, "protein": 30, "carbs": 90, "fat": 35}],
      "mealType": "dinner",
      "targetDate": "2025-09-01"
    }
  ]
}
---JSON_END---

WEITERE BEISPIELE FÜR MEHRERE TAGE:

1. "Vor 3 Tagen hatte ich Salat, gestern Fleisch und heute Reis"
→ 3 separate Actions mit targetDate: vor-3-tagen-datum, gestern-datum, heute-datum

2. "Am Montag Müsli, am Mittwoch Suppe"
→ 2 separate Actions mit targetDate: montag-datum, mittwoch-datum

3. "Heute Morgen Kaffee, heute Mittag Sandwich, heute Abend Pasta"
→ 3 separate Actions mit GLEICHEM targetDate aber verschiedenen mealType

4. "Gestern 2 Liter Wasser getrunken und heute 1 Apfel gegessen"
→ 2 separate Actions: add_water für gestern, add_meal für heute

5. "Heute 1 Liter Wasser und ein Sandwich"
→ 2 Actions mit GLEICHEM targetDate: add_water und add_meal

ANALYSE-STRATEGIE FÜR MEHRERE TAGE:
1. Suche nach Zeitangaben: "gestern", "heute", "vorgestern", "vor X Tagen", "am Montag", etc.
2. Teile die Nachricht in Segmente basierend auf diesen Zeitangaben
3. Erstelle für jedes Segment eine separate Action
4. Achte darauf, dass jede Action das korrekte targetDate hat
5. Bei mehreren Mahlzeiten am gleichen Tag: gleiche targetDate, verschiedene mealType

KRITISCHE DATUMSERKENNUNG (ABSOLUT WICHTIG):
- Du MUSST die unten angegebenen EXAKTEN Datumsangaben verwenden
- "heute" = EXAKT das unten angegebene heutige Datum
- "gestern" = EXAKT das unten angegebene gestrige Datum
- "vorgestern" = EXAKT das unten angegebene vorgestrige Datum
- "am Montag" = EXAKT das unten angegebene Datum für letzten Montag
- "vor X Tagen" = EXAKT berechnet vom heutigen Datum
- Verwende NIEMALS andere Datumsberechnungen
- Gib das Datum IMMER im Format YYYY-MM-DD zurück
- NIEMALS ungültige Daten wie "0000-00-00" verwenden
- Bei Unsicherheit: verwende das heutige Datum

WICHTIG: Analysiere die Nachricht sorgfältig auf MEHRERE Datumsangaben:
- "Gestern X und heute Y" → 2 Actions mit verschiedenen targetDate
- "Am Montag A, am Dienstag B" → 2 Actions mit verschiedenen targetDate
- "Vor 3 Tagen X, gestern Y, heute Z" → 3 Actions mit verschiedenen targetDate
- Jede Datumsangabe bekommt ihre eigene Action mit dem korrekten targetDate

SCHRITT-FÜR-SCHRITT MEHRERE-TAGE-ANALYSE:
1. Lies die gesamte Nachricht
2. Identifiziere ALLE Zeitangaben (heute, gestern, am Montag, vor 2 Tagen, etc.)
3. Teile die Nachricht in Segmente: [Zeitangabe + zugehörige Lebensmittel]
4. Für jedes Segment: erstelle eine separate Action
5. Verwende für jede Action das korrekte targetDate aus der Referenz-Tabelle unten
6. Doppelprüfung: Hast du wirklich ALLE Tage erfasst?

MAHLZEITTYP-ERKENNUNG:
- "Frühstück", "morgens" = breakfast
- "Mittagessen", "mittag" = lunch  
- "Abendessen", "abend" = dinner
- "Snack", "zwischendurch" = snack
- Wenn nicht erwähnt, bestimme basierend auf typischen Essenszeiten

Beispiel für eine vollständige Antwort (ESSEN):
---JSON_START---
{"text": "Perfekt! 🎉 Ich habe dein Frühstück von gestern erfasst. Das waren insgesamt 400 kcal - eine ausgewogene Mahlzeit! 😊", "actions": [{"type": "add_meal", "foods": [{"name": "Brötchen", "calories": 250, "protein": 8, "carbs": 45, "fat": 3}, {"name": "Ei", "calories": 80, "protein": 7, "carbs": 1, "fat": 5}, {"name": "Käse", "calories": 70, "protein": 5, "carbs": 1, "fat": 5}], "mealType": "breakfast", "targetDate": "2025-01-08"}]}
---JSON_END---

Perfekt! 🎉 Ich habe dein Frühstück von gestern erfasst. Das waren insgesamt 400 kcal - eine ausgewogene Mahlzeit mit guten Proteinen und Kohlenhydraten! 🍳✨

Beispiel für WASSER-TRACKING:
---JSON_START---
{"text": "Super! 💧 Ich habe deine Wasseraufnahme von heute erfasst. Weiter so! 😊", "actions": [{"type": "add_water", "amount": 1.5, "targetDate": "2025-01-09"}]}
---JSON_END---

Super! 💧 Ich habe deine Wasseraufnahme von heute erfasst. 1,5 Liter Wasser - das ist großartig für deine Hydration! Weiter so! 😊✨

Beispiel für MEHRERE TAGE:
---JSON_START---
{"text": "Wow! 🤩 Ich habe die Lebensmittel für beide Tage erfasst. Alles klar dokumentiert! 📝✨", "actions": [{"type": "add_meal", "foods": [{"name": "Apfel", "calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2}], "mealType": "snack", "targetDate": "2025-01-08"}, {"type": "add_meal", "foods": [{"name": "Pizza", "calories": 800, "protein": 30, "carbs": 90, "fat": 35}], "mealType": "dinner", "targetDate": "2025-01-09"}]}
---JSON_END---

Wow! 🤩 Ich habe die Lebensmittel für beide Tage erfasst. Gestern den Apfel als Snack und heute die Pizza zum Abendessen! 🍎🍕 Alles klar dokumentiert! 📝✨`;
      } else if (isFitnessContext && !isFoodContext) {
        // Fitness context - use higher temperature for creativity
        temperature = 0.8;
        systemPrompt = `Du bist ein kreativer und motivierender Fitnesscoach. Erstelle personalisierte, abwechslungsreiche Trainingspläne und gib inspirierende Fitness-Tipps. Sei kreativ bei Übungsvariationen und Trainingsroutinen. Motiviere den Nutzer und passe deine Vorschläge an seine Bedürfnisse und Möglichkeiten an.`;
      } else if (isFoodContext && isFitnessContext) {
        // Mixed context - use moderate temperature
        temperature = 0.5;
        systemPrompt = `Du bist ein ganzheitlicher Gesundheitsassistent, der sowohl bei Ernährung als auch Fitness hilft. Bei Ernährungsfragen sei präzise und faktisch, bei Fitnessfragen sei kreativ und motivierend.`;
      } else {
        // General context - moderate temperature
        temperature = 0.6;
        systemPrompt = `Du bist ein hilfsreicher AI-Assistent für Gesundheit und Fitness. Beantworte Fragen freundlich und hilfreich.`;
      }
      
      console.log(`Using temperature: ${temperature}, Context: Food=${isFoodContext}, Fitness=${isFitnessContext}`);
      
      // Prepare conversation history - Gemini requires first message to be from 'user'
      const conversationHistory = input.conversationHistory || [];
      
      // If we have history, use it as is (it should already be properly formatted)
      // If no history, we'll let the first user message start the conversation
      let chatHistory = conversationHistory;
      
      // If we have history and want to inject system context, we need to do it differently
      // For now, we'll include the system prompt in the first response if there's no history
      if (chatHistory.length === 0) {
        // No history - the system prompt will be handled by prepending it to the response
        chatHistory = [];
      }
      
      // Create chat session with history and dynamic temperature
      let chat;
      try {
        chat = model.startChat({
          history: chatHistory,
          generationConfig: {
            maxOutputTokens: 8000,
            temperature: temperature,
          },
        });
      } catch (chatError) {
        console.error('Failed to start chat session:', chatError);
        throw new Error('Chat session initialization failed');
      }
      
      // Prepare the message with system context if it's the first message
      let messageToSend = input.message;
      
      // Add current date context for better date recognition
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      
      // Calculate example dates for better context
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
      const dayBeforeYesterday = new Date(now.getTime() - 172800000).toISOString().split('T')[0];
      
      // Calculate weekdays for better context
      const getLastWeekday = (targetDay: number) => {
        const date = new Date(now);
        const currentDay = date.getDay();
        let daysBack = 0;
        
        if (currentDay === targetDay) {
          daysBack = 7; // Last week same day
        } else if (currentDay > targetDay) {
          daysBack = currentDay - targetDay; // Earlier this week
        } else {
          daysBack = currentDay + (7 - targetDay); // Last week
        }
        
        date.setDate(date.getDate() - daysBack);
        return date.toISOString().split('T')[0];
      };
      
      const lastMonday = getLastWeekday(1);
      const lastTuesday = getLastWeekday(2);
      const lastWednesday = getLastWeekday(3);
      const lastThursday = getLastWeekday(4);
      const lastFriday = getLastWeekday(5);
      const lastSaturday = getLastWeekday(6);
      const lastSunday = getLastWeekday(0);
      
      // Extract all possible dates from the message
      const dateMap = extractDatesFromMessage(input.message, currentDate);
      console.log('Extracted date map:', dateMap);
      
      // Try to parse date using multiple methods
      let pythonParsedDate: string | null = null;
      
      // First try local German date parser
      const localParsedDate = parseGermanDate(input.message, currentDate);
      if (localParsedDate) {
        pythonParsedDate = localParsedDate;
        console.log('Local German dateparser result:', pythonParsedDate);
      } else {
        // Fallback to Python API if available
        try {
          pythonParsedDate = await parseDateWithPython(input.message, currentDate);
          if (pythonParsedDate) {
            console.log('Python dateparser API result:', pythonParsedDate);
          }
        } catch (error) {
          console.log('Python dateparser API failed:', error);
        }
      }
      
      if (chatHistory.length === 0 && systemPrompt) {
        
        // Create comprehensive date mapping for the AI
        const dateMapEntries = Object.entries(dateMap)
          .map(([key, value]) => `- "${key}" → "${value}"`)
          .join('\n');
        
        messageToSend = `${systemPrompt}\n\n=== KRITISCHE DATUMS-REFERENZ (VERWENDE DIESE EXAKTEN WERTE) ===\n\nHEUTIGES DATUM: ${currentDate}\nGESTRIGES DATUM: ${yesterday}\nVORGESTRIGES DATUM: ${dayBeforeYesterday}\n\nWOCHENTAGE (EXAKTE DATEN):\n- Letzter Montag: ${lastMonday}\n- Letzter Dienstag: ${lastTuesday}\n- Letzter Mittwoch: ${lastWednesday}\n- Letzter Donnerstag: ${lastThursday}\n- Letzter Freitag: ${lastFriday}\n- Letzter Samstag: ${lastSaturday}\n- Letzter Sonntag: ${lastSunday}\n\n=== VOLLSTÄNDIGE DATUMS-ZUORDNUNGSREGELN ===\n${dateMapEntries}\n\n=== KRITISCHE MEHRERE-TAGE-ANALYSE ===\nWenn die Nachricht MEHRERE Datumsangaben enthält, analysiere sie SORGFÄLTIG:\n1. Identifiziere JEDE Datumsangabe in der Nachricht\n2. Ordne jedem Datum die entsprechenden Lebensmittel zu\n3. Erstelle für JEDEN Tag eine SEPARATE Action\n4. Verwende für jede Action das EXAKTE Datum aus der obigen Tabelle\n\nBeispiel: "Gestern Apfel und heute Pizza"\n→ Action 1: targetDate="${yesterday}", foods=[Apfel]\n→ Action 2: targetDate="${currentDate}", foods=[Pizza]\n\nWICHTIG: Verwende EXAKT diese Datumsangaben im JSON targetDate!\n${pythonParsedDate ? `\n\nERWEITERTE DATUMSERKENNUNG:\n- Für diese Nachricht wurde das Datum "${pythonParsedDate}" erkannt. Verwende dieses Datum als targetDate, falls es zur Nachricht passt.` : ''}\n\nUser: ${input.message}`;
      }
      
      // Send message and get response with timeout and error handling
      let result, response, text;
      try {
        console.log('Sending message to Gemini API...');
        
        // Add timeout to the API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), 30000); // 30 second timeout
        });
        
        const apiPromise = chat.sendMessage(messageToSend);
        result = await Promise.race([apiPromise, timeoutPromise]) as any;
        
        console.log('Received response from Gemini API');
        response = await result.response;
        text = response.text();
        
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from AI service');
        }
        
      } catch (apiError) {
        console.error('Gemini API call failed:', apiError);
        
        if (apiError instanceof Error) {
          if (apiError.message.includes('timeout')) {
            throw new Error('AI service timeout - please try again');
          } else if (apiError.message.includes('quota') || apiError.message.includes('limit')) {
            throw new Error('AI service quota exceeded - please try again later');
          } else if (apiError.message.includes('network') || apiError.message.includes('fetch')) {
            throw new Error('Network error - please check your connection');
          }
        }
        
        throw new Error('AI service temporarily unavailable - please try again');
      }
      
      console.log('Gemini response:', text);
      
      // Parse JSON data from food-related responses and execute actions
      let finalResponse = text;
      let parsedData = null;

      
      if (isFoodContext && !isFitnessContext) {
        // Use the truncated JSON handler
        const jsonResult = handleTruncatedJSON(text);
        
        if (jsonResult.parsedData) {
          parsedData = jsonResult.parsedData;
          console.log('Successfully parsed JSON data from Gemini:', parsedData);
          
          if (!jsonResult.isComplete) {
            console.warn('JSON was truncated but partially recovered:', jsonResult.errorMessage);
          }
          
          // Validate and correct dates using our comprehensive date mapping
          if (parsedData.actions && Array.isArray(parsedData.actions)) {
            for (const action of parsedData.actions) {
              if ((action.type === 'add_meal' || action.type === 'add_water') && action.targetDate) {
                console.log('Original targetDate from Gemini:', action.targetDate);
                
                // Validate the date format and ensure it's reasonable
                const actionDate = new Date(action.targetDate);
                const today = new Date(currentDate);
                
                // Check if the date is invalid or unreasonable (more than 30 days ago or in the future)
                if (isNaN(actionDate.getTime()) || 
                    actionDate > today || 
                    (today.getTime() - actionDate.getTime()) > (30 * 24 * 60 * 60 * 1000)) {
                  
                  console.log(`Invalid or unreasonable date detected: ${action.targetDate}`);
                  
                  // Try to find a better date from our date map or use Python result
                  let correctedDate = pythonParsedDate || currentDate;
                  
                  // Try to match with our date map based on the original message
                  const messageLower = input.message.toLowerCase();
                  for (const [dateKey, dateValue] of Object.entries(dateMap)) {
                    if (messageLower.includes(dateKey)) {
                      correctedDate = dateValue;
                      console.log(`Found matching date expression "${dateKey}" → ${dateValue}`);
                      break;
                    }
                  }
                  
                  action.targetDate = correctedDate;
                  console.log(`Corrected targetDate to: ${action.targetDate}`);
                }
                
                console.log('Final targetDate:', action.targetDate);
              }
            }
            
            // Don't execute actions here - let the frontend handle them
            console.log('Parsed actions will be sent to frontend for user confirmation:', parsedData.actions);
          }
          
          // Extract the natural response part (everything after JSON_END)
          const naturalResponseMatch = text.match(/---JSON_END---\s*([\s\S]*)/s);
          if (naturalResponseMatch && naturalResponseMatch[1].trim()) {
            finalResponse = naturalResponseMatch[1].trim();
            console.log('Extracted natural response:', finalResponse);
          } else {
            // Fallback to the text from JSON if no separate natural response
            finalResponse = parsedData.text || 'Lebensmittel erfasst!';
            console.log('Using JSON text as response:', finalResponse);
          }
          
          // Remove any remaining JSON artifacts from the final response
          finalResponse = finalResponse.replace(/---JSON_START---[\s\S]*?---JSON_END---/g, '').trim();
          finalResponse = finalResponse.replace(/^```json[\s\S]*?```$/gm, '').trim();
          finalResponse = finalResponse.replace(/^\{[\s\S]*?\}$/gm, '').trim();
          
          // If response is empty after cleaning, use the text from parsed JSON
          if (!finalResponse || finalResponse.length < 10) {
            finalResponse = parsedData.text || 'Lebensmittel erfasst!';
          }
        } else {
          // If truncated JSON handler failed, show a helpful message
          console.log('Truncated JSON handler failed:', jsonResult.errorMessage);
          finalResponse = 'Die Antwort war zu lang und wurde abgeschnitten. Bitte versuchen Sie es mit einer kürzeren Nachricht oder teilen Sie die Informationen auf mehrere Nachrichten auf.';
        }
      }
      
      return {
        success: true,
        response: finalResponse,
        conversationHistory: await chat.getHistory(),
        parsedData: parsedData // Include parsed JSON data for client processing
      };
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Entschuldigung, ich kann momentan nicht antworten. Bitte versuchen Sie später erneut.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es mit einer kürzeren Nachricht.';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage = 'API-Limit erreicht. Bitte versuchen Sie es später erneut.';
        }
      }
      
      // Return a fallback response instead of throwing
      return {
        success: false,
        response: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });