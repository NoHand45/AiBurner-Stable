// 1. Date parsing and formatting utilities
export const parseDateFromInput = (input: string): string | null => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const lowerInput = input.toLowerCase().trim();
  
  console.log('Parsing date from input:', lowerInput, 'Current date:', today);
  
  // Handle relative dates with more precise matching
  if (lowerInput.includes('heute')) {
    console.log('Detected heute:', today);
    return today;
  }
  
  if (lowerInput.includes('gestern')) {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    console.log('Detected gestern:', yesterday);
    return yesterday;
  }
  
  if (lowerInput.includes('vorgestern')) {
    const dayBeforeYesterday = new Date(now.getTime() - 172800000).toISOString().split('T')[0];
    console.log('Detected vorgestern:', dayBeforeYesterday);
    return dayBeforeYesterday;
  }
  
  if (lowerInput.includes('morgen')) {
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    console.log('Detected morgen:', tomorrow);
    return tomorrow;
  }
  
  // Handle "vor X Tagen" with improved regex
  const daysAgoMatch = lowerInput.match(/vor\s+(\d+|einem|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\s+tag(?:en?)?/i);
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
    
    const targetDate = new Date(now.getTime() - (daysAgo * 86400000)).toISOString().split('T')[0];
    console.log(`Detected vor ${daysAgo} Tagen:`, targetDate);
    return targetDate;
  }
  
  // Handle "vor X Wochen" and "letzten X Wochen"
  const weeksAgoMatch = lowerInput.match(/(?:vor|letzten?)\s+(\d+|einer|zwei|drei|vier)\s+woche(?:n)?/i);
  if (weeksAgoMatch) {
    let weeksAgo = 1;
    const numberWord = weeksAgoMatch[1].toLowerCase();
    
    if (numberWord.match(/\d+/)) {
      weeksAgo = parseInt(numberWord);
    } else {
      const writtenNumbers: Record<string, number> = {
        'einer': 1, 'zwei': 2, 'drei': 3, 'vier': 4
      };
      weeksAgo = writtenNumbers[numberWord] || 1;
    }
    
    const targetDate = new Date(now.getTime() - (weeksAgo * 7 * 86400000)).toISOString().split('T')[0];
    console.log(`Detected vor/letzten ${weeksAgo} Wochen:`, targetDate);
    return targetDate;
  }
  
  // Handle "letzte Woche"
  if (lowerInput.includes('letzte woche') || lowerInput.includes('letzten woche') || lowerInput.includes('vorige woche')) {
    const lastWeek = new Date(now.getTime() - (7 * 86400000)).toISOString().split('T')[0];
    console.log('Detected letzte Woche:', lastWeek);
    return lastWeek;
  }
  
  // Handle specific weekdays with improved logic
  const weekdays = {
    'montag': 1, 'dienstag': 2, 'mittwoch': 3, 'donnerstag': 4,
    'freitag': 5, 'samstag': 6, 'sonntag': 0
  };
  
  for (const [day, dayNum] of Object.entries(weekdays)) {
    const isLastWeekPattern = new RegExp(`\\b(?:letzten?|vorigen?)\\s+${day}\\b`, 'i');
    const isThisWeekPattern = new RegExp(`\\b(?:am\\s+)?${day}\\b`, 'i');
    
    const isLastWeek = isLastWeekPattern.test(lowerInput);
    const isThisWeek = isThisWeekPattern.test(lowerInput) && !isLastWeek;
    
    if (isLastWeek || isThisWeek) {
      const currentDay = now.getDay();
      let daysBack = 0;
      
      if (isLastWeek) {
        if (currentDay === dayNum) {
          daysBack = 7;
        } else if (currentDay > dayNum) {
          daysBack = currentDay - dayNum + 7;
        } else {
          daysBack = currentDay + (7 - dayNum) + 7;
        }
      } else {
        if (currentDay === dayNum) {
          daysBack = 0;
        } else if (currentDay > dayNum) {
          daysBack = currentDay - dayNum;
        } else {
          daysBack = currentDay + (7 - dayNum);
        }
      }
      
      const targetDate = new Date(now.getTime() - (daysBack * 86400000)).toISOString().split('T')[0];
      console.log(`Detected ${day} (${daysBack} days back, isLastWeek: ${isLastWeek}):`, targetDate);
      return targetDate;
    }
  }
  
  console.log('No date pattern matched');
  return null;
};

// 2. Water intake parsing utilities
export const parseWaterFromInput = (input: string, selectedDate: string): { amount: number; date: string } | null => {
  const waterKeywords = ['wasser', 'getrunken', 'trinken', 'liter', 'glas', 'flasche', 'ml'];
  const hasWaterKeyword = waterKeywords.some(keyword => input.includes(keyword));
  
  if (!hasWaterKeyword) return null;
  
  let amount = 0;
  let targetDate = selectedDate;
  
  const dateInfo = parseDateFromInput(input);
  if (dateInfo) {
    targetDate = dateInfo;
  }
  
  // Try to extract numbers followed by 'l' or 'liter'
  const literMatch = input.match(/(\d+(?:[.,]\d+)?)\s*(?:l|liter)/i);
  if (literMatch) {
    amount = parseFloat(literMatch[1].replace(',', '.'));
  }
  
  // Try to extract numbers followed by 'ml' or 'milliliter'
  const mlMatch = input.match(/(\d+)\s*(?:ml|milliliter)/i);
  if (mlMatch) {
    amount = parseInt(mlMatch[1]) / 1000;
  }
  
  // Try to extract numbers followed by 'glas' or 'gläser'
  const glassMatch = input.match(/(\d+)\s*(?:glas|gläser)/i);
  if (glassMatch) {
    amount = parseInt(glassMatch[1]) * 0.25;
  }
  
  // Try to extract numbers followed by 'flasche'
  const bottleMatch = input.match(/(\d+)\s*(?:flasche|flaschen)/i);
  if (bottleMatch) {
    amount = parseInt(bottleMatch[1]) * 0.5;
  }
  
  // Try to extract standalone numbers when water keywords are present
  if (amount === 0) {
    const numberMatch = input.match(/(\d+(?:[.,]\d+)?)/i);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1].replace(',', '.'));
      amount = num > 10 ? num / 1000 : num;
    }
  }
  
  // If water keywords are present but no specific amount, assume 1 glass
  if (amount === 0) {
    amount = 0.25;
  }
  
  return { amount, date: targetDate };
};

// 3. Meal type determination utilities
export const determineMealType = (input?: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  if (input) {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('frühstück') || lowerInput.includes('morgens') || lowerInput.includes('früh')) {
      return 'breakfast';
    }
    if (lowerInput.includes('mittagessen') || lowerInput.includes('mittag') || lowerInput.includes('lunch')) {
      return 'lunch';
    }
    if (lowerInput.includes('abendessen') || lowerInput.includes('abend') || lowerInput.includes('dinner')) {
      return 'dinner';
    }
    if (lowerInput.includes('snack') || lowerInput.includes('zwischenmahlzeit') || lowerInput.includes('zwischendurch')) {
      return 'snack';
    }
  }
  
  // Fall back to time-based detection
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
};

// 4. Food database and parsing utilities
interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

export const parseFoodFromInput = (input: string): FoodItem[] => {
  const foods: FoodItem[] = [];
  const foodDatabase: Record<string, Omit<FoodItem, 'name'>> = {
    'apfel': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, portion: '1 mittelgroßer' },
    'banane': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, portion: '1 mittelgroße' },
    'butterbrot': { calories: 250, protein: 8, carbs: 35, fat: 8, portion: '1 Scheibe' },
    'müsli': { calories: 350, protein: 12, carbs: 60, fat: 8, portion: '1 Schüssel' },
    'joghurt': { calories: 150, protein: 10, carbs: 12, fat: 8, portion: '1 Becher' },
    'ei': { calories: 70, protein: 6, carbs: 0.5, fat: 5, portion: '1 Stück' },
    'eier': { calories: 140, protein: 12, carbs: 1, fat: 10, portion: '2 Stück' },
    'brot': { calories: 200, protein: 6, carbs: 40, fat: 2, portion: '2 Scheiben' },
    'käse': { calories: 100, protein: 8, carbs: 1, fat: 8, portion: '30g' },
    'salat': { calories: 50, protein: 2, carbs: 8, fat: 1, portion: '1 Portion' },
    'pasta': { calories: 350, protein: 12, carbs: 70, fat: 2, portion: '1 Portion' },
    'reis': { calories: 300, protein: 6, carbs: 65, fat: 1, portion: '1 Portion' },
    'hähnchen': { calories: 200, protein: 30, carbs: 0, fat: 8, portion: '150g' },
    'huhn': { calories: 200, protein: 30, carbs: 0, fat: 8, portion: '150g' },
    'pizza': { calories: 800, protein: 30, carbs: 90, fat: 35, portion: '1 Pizza' },
    'schokolade': { calories: 150, protein: 2, carbs: 16, fat: 9, portion: '30g' },
    'schnitzel': { calories: 300, protein: 25, carbs: 15, fat: 18, portion: '1 Stück' },
    'pommes': { calories: 365, protein: 4, carbs: 63, fat: 17, portion: '1 Portion' },
    'tortellini': { calories: 250, protein: 10, carbs: 45, fat: 5, portion: '1 Portion' },
    'käsesoße': { calories: 180, protein: 8, carbs: 6, fat: 15, portion: '100ml' },
    'nudeln': { calories: 350, protein: 12, carbs: 70, fat: 2, portion: '1 Portion' },
    'spaghetti': { calories: 350, protein: 12, carbs: 70, fat: 2, portion: '1 Portion' },
    'fleisch': { calories: 250, protein: 26, carbs: 0, fat: 15, portion: '100g' },
    'gemüse': { calories: 25, protein: 2, carbs: 5, fat: 0.2, portion: '100g' },
    'kartoffeln': { calories: 77, protein: 2, carbs: 17, fat: 0.1, portion: '100g' },
    'fisch': { calories: 200, protein: 22, carbs: 0, fat: 12, portion: '100g' },
    'lachs': { calories: 208, protein: 25, carbs: 0, fat: 12, portion: '100g' },
    'thunfisch': { calories: 144, protein: 30, carbs: 0, fat: 1, portion: '100g' },
    'quinoa': { calories: 368, protein: 14, carbs: 64, fat: 6, portion: '100g' },
    'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15, portion: '1 Stück' },
    'nüsse': { calories: 600, protein: 15, carbs: 16, fat: 54, portion: '100g' },
    'mandeln': { calories: 579, protein: 21, carbs: 22, fat: 50, portion: '100g' },
    'haferflocken': { calories: 389, protein: 17, carbs: 66, fat: 7, portion: '100g' },
    'milch': { calories: 42, protein: 3.4, carbs: 5, fat: 1, portion: '100ml' },
    'butter': { calories: 717, protein: 1, carbs: 1, fat: 81, portion: '100g' },
    'olivenöl': { calories: 884, protein: 0, carbs: 0, fat: 100, portion: '100ml' },
    'tomaten': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, portion: '100g' },
    'gurke': { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, portion: '100g' },
    'paprika': { calories: 31, protein: 1, carbs: 6, fat: 0.3, portion: '100g' },
    'zwiebeln': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, portion: '100g' },
    'knoblauch': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, portion: '100g' },
    'spinat': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, portion: '100g' },
    'brokkoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, portion: '100g' },
    'karotten': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, portion: '100g' },
    'süßkartoffeln': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, portion: '100g' },
    'kaffee': { calories: 2, protein: 0.1, carbs: 0, fat: 0, portion: '1 Tasse' },
    'tee': { calories: 1, protein: 0, carbs: 0, fat: 0, portion: '1 Tasse' },
    'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, portion: '1 mittelgroße' },
    'birne': { calories: 57, protein: 0.4, carbs: 15, fat: 0.1, portion: '1 mittelgroße' },
    'erdbeeren': { calories: 32, protein: 0.7, carbs: 8, fat: 0.3, portion: '100g' },
    'weintrauben': { calories: 69, protein: 0.7, carbs: 16, fat: 0.2, portion: '100g' },
    'kiwi': { calories: 61, protein: 1.1, carbs: 15, fat: 0.5, portion: '1 Stück' },
    'mango': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, portion: '100g' },
    'ananas': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1, portion: '100g' },
    'wassermelone': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2, portion: '100g' },
    'melone': { calories: 34, protein: 0.8, carbs: 8, fat: 0.2, portion: '100g' },
    'pfirsich': { calories: 39, protein: 0.9, carbs: 10, fat: 0.3, portion: '1 mittelgroßer' },
    'pflaume': { calories: 46, protein: 0.7, carbs: 11, fat: 0.3, portion: '1 Stück' },
    'kirsche': { calories: 63, protein: 1, carbs: 16, fat: 0.2, portion: '100g' },
    'kirschen': { calories: 63, protein: 1, carbs: 16, fat: 0.2, portion: '100g' },
    'beeren': { calories: 57, protein: 1.4, carbs: 12, fat: 0.3, portion: '100g' },
    'himbeeren': { calories: 52, protein: 1.2, carbs: 12, fat: 0.7, portion: '100g' },
    'blaubeeren': { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, portion: '100g' },
    'heidelbeeren': { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, portion: '100g' }
  };
  
  // Enhanced food recognition with quantity parsing
  Object.keys(foodDatabase).forEach(food => {
    const patterns = [
      new RegExp(`(\\d+)?\\s*(?:x\\s*|stück\\s*|portionen?\\s*|scheiben?\\s*|gläser?\\s*|becher\\s*|schüsseln?\\s*|teller\\s*)?\\s*${food}(?:s|en|n)?\\b`, 'i'),
      new RegExp(`\\b${food}(?:s|en|n)?\\s*(?:gegessen|getrunken|gehabt|hatte|habe|esse|trinke)`, 'i'),
      new RegExp(`(?:einen?|eine|ein|zwei|drei|vier|fünf)\\s+${food}(?:s|en|n)?\\b`, 'i'),
      new RegExp(`\\b${food}(?:s|en|n)?\\s+(?:zum|am|beim|mit)\\s+(?:frühstück|mittagessen|abendessen|snack)`, 'i')
    ];
    
    for (const regex of patterns) {
      const match = input.match(regex);
      if (match) {
        let quantity = 1;
        
        const quantityMatch = input.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${food}`, 'i'));
        if (quantityMatch) {
          quantity = parseInt(quantityMatch[1]);
        } else {
          const writtenNumbers: Record<string, number> = {
            'einen': 1, 'eine': 1, 'ein': 1, 'eins': 1,
            'zwei': 2, 'drei': 3, 'vier': 4, 'fünf': 5,
            'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10
          };
          
          for (const [word, num] of Object.entries(writtenNumbers)) {
            if (input.toLowerCase().includes(word + ' ' + food)) {
              quantity = num;
              break;
            }
          }
        }
        
        const foodData = foodDatabase[food];
        if (foodData) {
          for (let i = 0; i < quantity; i++) {
            foods.push({
              name: food.charAt(0).toUpperCase() + food.slice(1),
              ...foodData
            });
          }
        }
        break;
      }
    }
  });
  
  // Remove duplicates based on name
  const uniqueFoods = foods.filter((food, index, self) => 
    index === self.findIndex(f => f.name === food.name)
  );
  
  return uniqueFoods;
};

// 5. Action execution utilities
export interface PendingAction {
  id: string;
  type: 'add_meal' | 'add_water' | 'delete_meal' | 'edit_meal' | 'clear_day' | 'clear_range' | 'update_profile' | 'track_weight' | 'create_fitness_plan';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rejected';
  data: any;
  error?: string;
}

export const createActionsFromParsedData = (parsedData: any, userInput: string, selectedDate: string): PendingAction[] => {
  const actions: PendingAction[] = [];
  
  try {
    console.log('Creating actions from parsed data:', parsedData);
    
    if (parsedData.actions && Array.isArray(parsedData.actions)) {
      for (const actionData of parsedData.actions) {
        if (actionData.type === 'add_water') {
          // Handle water tracking actions
          let targetDate = selectedDate;
          
          console.log('Processing water action from Gemini:', actionData);
          
          if (actionData.targetDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(actionData.targetDate)) {
              const providedDate = new Date(actionData.targetDate);
              const today = new Date();
              const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
              const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
              
              if (providedDate >= oneYearAgo && providedDate <= oneYearFromNow) {
                targetDate = actionData.targetDate;
                console.log('Using valid date from Gemini for water:', targetDate);
              } else {
                console.warn('Date from Gemini is out of reasonable range for water:', actionData.targetDate);
                const parsedDate = parseDateFromInput(userInput);
                targetDate = parsedDate || selectedDate;
                console.log('Using fallback date for water:', targetDate);
              }
            } else {
              console.warn('Invalid date format from Gemini for water:', actionData.targetDate);
              const parsedDate = parseDateFromInput(userInput);
              targetDate = parsedDate || selectedDate;
              console.log('Using parsed date from input for water:', targetDate);
            }
          } else {
            const parsedDate = parseDateFromInput(userInput);
            targetDate = parsedDate || selectedDate;
            console.log('No date from Gemini for water, using parsed date from input:', targetDate);
          }
          
          // Create date text for description
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const dayBeforeYesterday = new Date(Date.now() - 172800000).toISOString().split('T')[0];
          
          let dateText = 'heute';
          if (targetDate === today) {
            dateText = 'heute';
          } else if (targetDate === yesterday) {
            dateText = 'gestern';
          } else if (targetDate === dayBeforeYesterday) {
            dateText = 'vorgestern';
          } else {
            const targetDateObj = new Date(targetDate);
            const daysDiff = Math.floor((new Date(today).getTime() - targetDateObj.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0 && daysDiff <= 7) {
              dateText = `vor ${daysDiff} Tag${daysDiff === 1 ? '' : 'en'}`;
            } else {
              dateText = `am ${targetDateObj.toLocaleDateString('de-DE')}`;
            }
          }
          
          const waterAmount = actionData.amount || 0.25; // Default to 1 glass
          const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_water_${targetDate}`;
          
          const waterAction: PendingAction = {
            id: actionId,
            type: 'add_water',
            description: `${waterAmount}L Wasser ${dateText} hinzufügen`,
            status: 'pending',
            data: {
              amount: waterAmount,
              targetDate: targetDate
            }
          };
          
          actions.push(waterAction);
        } else if (actionData.type === 'add_meal' && actionData.foods && Array.isArray(actionData.foods)) {
          let targetDate = selectedDate;
          
          console.log('Processing individual action from Gemini:', actionData);
          console.log('Processing targetDate from Gemini:', actionData.targetDate);
          
          if (actionData.targetDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(actionData.targetDate)) {
              const providedDate = new Date(actionData.targetDate);
              const today = new Date();
              const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
              const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
              
              if (providedDate >= oneYearAgo && providedDate <= oneYearFromNow) {
                targetDate = actionData.targetDate;
                console.log('Using valid date from Gemini:', targetDate);
              } else {
                console.warn('Date from Gemini is out of reasonable range:', actionData.targetDate);
                const parsedDate = parseDateFromInput(userInput);
                targetDate = parsedDate || selectedDate;
                console.log('Using fallback date:', targetDate);
              }
            } else {
              console.warn('Invalid date format from Gemini:', actionData.targetDate);
              const parsedDate = parseDateFromInput(userInput);
              targetDate = parsedDate || selectedDate;
              console.log('Using parsed date from input:', targetDate);
            }
          } else {
            const parsedDate = parseDateFromInput(userInput);
            targetDate = parsedDate || selectedDate;
            console.log('No date from Gemini, using parsed date from input:', targetDate);
          }
          
          console.log('Final target date for this action:', targetDate, 'from actionData:', actionData.targetDate);
          
          // Convert parsed foods to meal format
          const meals = actionData.foods.map((food: any, index: number) => {
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}_${targetDate}_${Math.floor(Math.random() * 10000)}`;
            return {
              id: uniqueId,
              name: food.name || 'Unbekanntes Lebensmittel',
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || food.kohlenhydrate || 0,
              fat: food.fat || food.fett || 0,
              portion: '1 Portion',
              time: new Date().toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              mealType: actionData.mealType || determineMealType(userInput)
            };
          });
          
          // Create date text for description
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const dayBeforeYesterday = new Date(Date.now() - 172800000).toISOString().split('T')[0];
          
          let dateText = 'heute';
          if (targetDate === today) {
            dateText = 'heute';
          } else if (targetDate === yesterday) {
            dateText = 'gestern';
          } else if (targetDate === dayBeforeYesterday) {
            dateText = 'vorgestern';
          } else {
            const targetDateObj = new Date(targetDate);
            const daysDiff = Math.floor((new Date(today).getTime() - targetDateObj.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0 && daysDiff <= 7) {
              dateText = `vor ${daysDiff} Tag${daysDiff === 1 ? '' : 'en'}`;
            } else {
              dateText = `am ${targetDateObj.toLocaleDateString('de-DE')}`;
            }
          }
          
          console.log(`Date formatting: targetDate=${targetDate}, today=${today}, dateText=${dateText}`);
          
          // Create detailed description
          const foodNames = meals.map((meal: any) => meal.name).join(', ');
          const totalCalories = meals.reduce((sum: number, item: any) => sum + item.calories, 0);
          const totalProtein = meals.reduce((sum: number, item: any) => sum + item.protein, 0);
          const totalCarbs = meals.reduce((sum: number, item: any) => sum + item.carbs, 0);
          const totalFat = meals.reduce((sum: number, item: any) => sum + item.fat, 0);
          
          const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${targetDate}_${actions.length}`;
          const action: PendingAction = {
            id: actionId,
            type: 'add_meal',
            description: `${foodNames} ${dateText} hinzufügen\n${totalCalories} kcal • ${totalProtein}g Protein • ${totalCarbs}g Kohlenhydrate • ${totalFat}g Fett`,
            status: 'pending',
            data: {
              meals: meals,
              targetDate: targetDate
            }
          };
          
          actions.push(action);
        }
      }
    }
  } catch (error) {
    console.error('Error creating actions from parsed data:', error);
  }
  
  return actions;
};