import React, { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from "react-native";
import { Send, Check, X, Clock, CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react-native";
import { useFitnessData, type Meal } from "@/hooks/fitness-store";
import { trpc } from "@/lib/trpc";
import {
  parseDateFromInput,
  parseWaterFromInput,
  determineMealType,
  parseFoodFromInput,
  createActionsFromParsedData,
  type PendingAction
} from "@/utils/chatbot-helpers";

const LoadingSpinner = () => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader2 color="#3B82F6" size={16} />
    </Animated.View>
  );
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  actions?: PendingAction[];
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}



export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hallo! 👋 Ich bin dein persönlicher AI-Assistent. Ich kann dir bei verschiedenen Themen helfen und Fragen beantworten.\n\n🔍 Falls du Verbindungsprobleme hast:\n• Tippe 'test' um die Server-Verbindung zu testen\n• Tippe 'test-gemini' um die AI-Services zu testen\n\nWie kann ich dir heute helfen? 😊",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [shouldShowProfileUpdate, setShouldShowProfileUpdate] = useState<boolean>(false);
  const [showFitnessMessage, setShowFitnessMessage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Listen for navigation events to trigger profile update message
  useEffect(() => {
    const checkForProfileUpdate = () => {
      try {
        if (typeof window !== 'undefined' && window.location) {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('profileUpdate') === 'true') {
            setShouldShowProfileUpdate(true);
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (error) {
        console.log('Error checking profile update:', error);
      }
    };
    
    checkForProfileUpdate();
  }, []);
  
  // Listen for fitness plan trigger
  useEffect(() => {
    const checkForFitnessPlan = () => {
      try {
        if (typeof window !== 'undefined' && window.location) {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('fitnessplan') === 'true') {
            setShowFitnessMessage(true);
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (error) {
        console.log('Error checking fitness plan:', error);
      }
    };
    
    checkForFitnessPlan();
  }, []);
  
  // Add profile update message when triggered
  useEffect(() => {
    if (shouldShowProfileUpdate) {
      const profileUpdateMessage: Message = {
        id: `profile_update_${Date.now()}`,
        text: "Hallo! 👋 Ich kann dir dabei helfen, deine persönlichen Daten zu aktualisieren. Bitte teile mir folgende Informationen mit:\n\n• Dein aktuelles Gewicht ⚖️\n• Dein Zielgewicht 🎯\n• Dein Aktivitätslevel (sitzend, leicht aktiv, mäßig aktiv, sehr aktiv, extrem aktiv) 🏃‍♂️\n\nIch werde dann deinen Grundumsatz und Gesamtumsatz neu berechnen! 📊",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, profileUpdateMessage]);
      setShouldShowProfileUpdate(false);
    }
  }, [shouldShowProfileUpdate]);
  
  // Add fitness plan message when triggered
  useEffect(() => {
    if (showFitnessMessage) {
      const fitnessMessage: Message = {
        id: `fitness_plan_${Date.now()}`,
        text: "Hallo! 👋 Ich kann dir dabei helfen, einen personalisierten Fitnessplan zu erstellen. Bitte teile mir folgende Informationen mit:\n\n• Deine aktuellen Aktivitäten (z.B. Laufen, Krafttraining, etc.) 🏃‍♂️\n• Deine gewünschten Aktivitäten 💪\n• Was möchtest du erreichen? (Abnehmen, Muskelaufbau, Ausdauer, etc.) 🎯\n• Welche Möglichkeiten hast du? (Fitnessstudio, zu Hause, draußen) 🏠\n• Wie viel Zeit hast du pro Woche? ⏰\n\nBasierend auf deinen Angaben erstelle ich dir einen maßgeschneiderten Fitnessplan! 📋✨",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fitnessMessage]);
      setShowFitnessMessage(false);
    }
  }, [showFitnessMessage]);
  
  const { getTodayMeals, addMeal, updateWaterForDate, selectedDate, setSelectedDate, getCurrentDayStats, weeklyGoal, addMealForDate, deleteMeal, updateMeal, clearDayMeals, updateUserProfile, userProfile } = useFitnessData();
  const todayMeals = getTodayMeals();

  const sendMessage = () => {
    if (inputText.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      const messageText = inputText.trim();
      setInputText("");
      setIsLoading(true);

      // Generate bot response
      setTimeout(async () => {
        try {
          const botResponse = await generateBotResponse(messageText);
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: botResponse.text,
            isUser: false,
            timestamp: new Date(),
            actions: botResponse.actions || []
          };
          setMessages(prev => [...prev, botMessage]);
        } catch (error) {
          console.error('Error generating bot response:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Entschuldigung, ich hatte ein technisches Problem. 😅 Kannst du deine Nachricht nochmal senden?",
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      }, 1000);
    }
  };

  const geminiChatMutation = trpc.gemini.chat.useMutation();

  const generateBotResponse = async (userInput: string): Promise<{ text: string; actions?: PendingAction[] }> => {
    try {
      console.log('Generating bot response for:', userInput);
      
      // Handle test command
      if (userInput.toLowerCase().trim() === 'test') {
        await testConnection();
        return {
          text: "Verbindungstest wird durchgeführt..."
        };
      }
      
      // Handle gemini test command
      if (userInput.toLowerCase().trim() === 'test-gemini') {
        await testGeminiConnection();
        return {
          text: "Gemini API Test wird durchgeführt..."
        };
      }
      
      const result = await geminiChatMutation.mutateAsync({
        message: userInput,
        conversationHistory: conversationHistory,
      });
      
      if (result.success) {
        // Update conversation history - convert from Gemini format to our format
        const geminiHistory = result.conversationHistory || [];
        const convertedHistory: GeminiMessage[] = geminiHistory.map((item: any) => ({
          role: item.role === 'user' ? 'user' : 'model',
          parts: item.parts || [{ text: item.text || '' }]
        }));
        setConversationHistory(convertedHistory);
        
        let actions: PendingAction[] = [];
        
        // Check if we have parsed JSON data from Gemini
        if (result.parsedData && result.parsedData.actions) {
          console.log('Using parsed JSON data from Gemini:', result.parsedData);
          actions = createActionsFromParsedData(result.parsedData, userInput, selectedDate);
        } else {
          // Fallback to old parsing method
          console.log('No parsed data, using fallback parsing');
          actions = parseFoodItemsFromResponse(result.response, userInput);
        }
        
        return {
          text: result.response,
          actions: actions
        };
      } else {
        console.error('Gemini API error:', result.error);
        return {
          text: result.response || "Entschuldigung, ich hatte ein technisches Problem. 😅 Kannst du deine Nachricht nochmal senden?"
        };
      }
      
    } catch (error) {
      console.error('Error generating bot response:', error);
      
      // Provide more specific error messages
      let errorMessage = "Entschuldigung, ich hatte ein technisches Problem. 😅 Kannst du deine Nachricht nochmal senden?";
      
      if (error instanceof Error) {
        if (error.message.includes('Load failed') || error.message.includes('fetch')) {
          errorMessage = "Verbindungsfehler! 📡 Bitte überprüfe deine Internetverbindung und versuche es erneut. 🔄";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Die Anfrage hat zu lange gedauert. ⏰ Versuche es mit einer kürzeren Nachricht. 📝";
        } else if (error.message.includes('Network')) {
          errorMessage = "Netzwerkfehler! 🌐 Bitte überprüfe deine Verbindung und versuche es erneut. 🔄";
        }
      }
      
      return {
        text: errorMessage
      };
    }
  };







  const executeAction = async (messageId: string, actionId: string) => {
    // Set action to executing state with animation
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.actions) {
        return {
          ...msg,
          actions: msg.actions.map(action => 
            action.id === actionId 
              ? { ...action, status: 'executing' as const }
              : action
          )
        };
      }
      return msg;
    }));

    try {
      const message = messages.find(m => m.id === messageId);
      const action = message?.actions?.find(a => a.id === actionId);
      
      if (!action) throw new Error('Aktion nicht gefunden');

      // Wait 1200ms for better visual feedback
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (action.type === 'add_meal') {
        // Handle multiple meals in one action
        if (action.data.meals && Array.isArray(action.data.meals)) {
          const originalDate = selectedDate;
          const targetDate = action.data.targetDate;
          
          // Switch to target date if different
          if (targetDate && targetDate !== selectedDate) {
            setSelectedDate(targetDate);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Add each meal individually
          for (const mealData of action.data.meals) {
            console.log('Adding meal to date:', targetDate, mealData);
            console.log('Action data structure:', action.data);
            const meal = {
              id: mealData.id,
              name: mealData.name,
              calories: mealData.calories,
              protein: mealData.protein,
              carbs: mealData.carbs,
              fat: mealData.fat,
              portion: mealData.portion,
              time: mealData.time,
              mealType: mealData.mealType
            };
            
            console.log('Calling addMealForDate with meal:', meal, 'and targetDate:', targetDate);
            // Use the addMealForDate function to add to specific date
            await addMealForDate(meal, targetDate);
            console.log('Successfully added meal for date:', targetDate);
            // Small delay between meals for better UX
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Switch back to original date
          if (targetDate && targetDate !== originalDate) {
            setSelectedDate(originalDate);
          }
        } else {
          // Legacy single meal handling
          const mealData = {
            id: action.data.id,
            name: action.data.name,
            calories: action.data.calories,
            protein: action.data.protein,
            carbs: action.data.carbs,
            fat: action.data.fat,
            portion: action.data.portion,
            time: action.data.time,
            mealType: action.data.mealType
          };
          
          if (action.data.targetDate && action.data.targetDate !== selectedDate) {
            const originalDate = selectedDate;
            setSelectedDate(action.data.targetDate);
            await new Promise(resolve => setTimeout(resolve, 100));
            await addMeal(mealData);
            setSelectedDate(originalDate);
          } else {
            await addMeal(mealData);
          }
        }
      } else if (action.type === 'add_water') {
        const waterDate = action.data.targetDate || action.data.date || selectedDate;
        const waterAmount = action.data.amount || 0.25; // Default to 1 glass if no amount specified
        console.log('Adding water:', { date: waterDate, amount: waterAmount });
        await updateWaterForDate(waterDate, waterAmount);
      } else if (action.type === 'delete_meal') {
        // Find and delete the meal by name
        const targetDate = action.data.date;
        const mealName = action.data.mealName;
        
        if (deleteMeal) {
          await deleteMeal(mealName, targetDate);
        } else {
          throw new Error('Delete meal function not available');
        }
      } else if (action.type === 'clear_day') {
        // Clear all meals for the day
        const targetDate = action.data.date;
        
        if (clearDayMeals) {
          await clearDayMeals(targetDate);
        } else {
          throw new Error('Clear day function not available');
        }
      } else if (action.type === 'clear_range') {
        // Clear all meals for a date range
        const startDate = action.data.startDate;
        const endDate = action.data.endDate;
        
        if (clearDayMeals) {
          // Clear each day in the range
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            console.log('Clearing date in range:', dateStr);
            await clearDayMeals(dateStr);
            current.setDate(current.getDate() + 1);
            // Small delay between deletions
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          throw new Error('Clear day function not available');
        }
      } else if (action.type === 'edit_meal') {
        // Edit the meal
        const targetDate = action.data.date;
        const mealName = action.data.mealName;
        const newData = action.data.newData;
        
        if (updateMeal) {
          await updateMeal(mealName, newData, targetDate);
        } else {
          throw new Error('Update meal function not available');
        }
      } else if (action.type === 'update_profile') {
        // Update user profile
        const updates = action.data.updates;
        
        if (updateUserProfile) {
          await updateUserProfile(updates);
        } else {
          throw new Error('Update profile function not available');
        }
      } else if (action.type === 'track_weight') {
        // Track weight
        const weight = action.data.weight;
        const date = action.data.date;
        
        if (updateUserProfile) {
          await updateUserProfile({ weight });
        } else {
          throw new Error('Update profile function not available');
        }
      }

      // Mark as completed
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.actions) {
          return {
            ...msg,
            actions: msg.actions.map(a => 
              a.id === actionId 
                ? { ...a, status: 'completed' as const }
                : a
            )
          };
        }
        return msg;
      }));

      // Remove completed action after 3 seconds
      setTimeout(() => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId && msg.actions) {
            return {
              ...msg,
              actions: msg.actions.filter(a => a.id !== actionId)
            };
          }
          return msg;
        }));
      }, 3000);

    } catch (error) {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.actions) {
          return {
            ...msg,
            actions: msg.actions.map(action => 
              action.id === actionId 
                ? { 
                    ...action, 
                    status: 'failed' as const,
                    error: error instanceof Error ? error.message : 'Unbekannter Fehler'
                  }
                : action
            )
          };
        }
        return msg;
      }));
    }
  };

  const rejectAction = (messageId: string, actionId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.actions) {
        return {
          ...msg,
          actions: msg.actions.map(action => 
            action.id === actionId 
              ? { ...action, status: 'rejected' as const }
              : action
          )
        };
      }
      return msg;
    }));

    // Remove rejected action after 2 seconds
    setTimeout(() => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.actions) {
          return {
            ...msg,
            actions: msg.actions.filter(a => a.id !== actionId)
          };
        }
        return msg;
      }));
    }, 2000);
  };

  const executeAllActions = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    const pendingActions = message?.actions?.filter(a => a.status === 'pending') || [];
    
    for (const action of pendingActions) {
      await executeAction(messageId, action.id);
      // Wait between actions for better visual feedback and data consistency
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  };

  const rejectAllActions = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    const pendingActions = message?.actions?.filter(a => a.status === 'pending') || [];
    
    pendingActions.forEach(action => {
      rejectAction(messageId, action.id);
    });
  };

  const testConnection = async () => {
    try {
      console.log('Testing connection...');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const testUrl = `${baseUrl}/api/test`;
      
      console.log('Testing URL:', testUrl);
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connection test successful:', data);
        
        const testMessage: Message = {
          id: `test_${Date.now()}`,
          text: `✅ Verbindung erfolgreich getestet!\n\nServer Status: ${data.status}\nZeitstempel: ${data.timestamp}\nUser-Agent: ${data.userAgent}`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, testMessage]);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      
      const errorMessage: Message = {
        id: `test_error_${Date.now()}`,
        text: `❌ Verbindungstest fehlgeschlagen!\n\nFehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nBitte überprüfe deine Internetverbindung und versuche es erneut.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const testGeminiConnection = async () => {
    try {
      console.log('Testing Gemini API connection...');
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const testUrl = `${baseUrl}/api/test-gemini`;
      
      console.log('Testing Gemini URL:', testUrl);
      const response = await fetch(testUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Gemini API test successful:', data);
        
        const testMessage: Message = {
          id: `gemini_test_${Date.now()}`,
          text: `✅ Gemini API erfolgreich getestet!\n\nStatus: ${data.status}\nAntwort: ${data.response}\nZeitstempel: ${data.timestamp}`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, testMessage]);
      } else {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Gemini API test failed:', error);
      
      const errorMessage: Message = {
        id: `gemini_test_error_${Date.now()}`,
        text: `❌ Gemini API Test fehlgeschlagen!\n\nFehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}\n\nDies könnte bedeuten, dass die AI-Services nicht verfügbar sind.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: "1",
        text: "Hallo! 👋 Ich bin dein persönlicher AI-Assistent. Ich kann dir bei verschiedenen Themen helfen und Fragen beantworten.\n\n🔍 Falls du Verbindungsprobleme hast:\n• Tippe 'test' um die Server-Verbindung zu testen\n• Tippe 'test-gemini' um die AI-Services zu testen\n\nWie kann ich dir heute helfen? 😊",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setConversationHistory([]);
    setInputText("");
    setShouldShowProfileUpdate(false);
    setShowFitnessMessage(false);
  };



  const renderActionStatus = (status: PendingAction['status']) => {
    switch (status) {
      case 'pending':
        return <Clock color="#F59E0B" size={16} />;
      case 'executing':
        return <LoadingSpinner />;
      case 'completed':
        return <CheckCircle color="#10B981" size={16} />;
      case 'failed':
        return <XCircle color="#EF4444" size={16} />;
      case 'rejected':
        return <XCircle color="#6B7280" size={16} />;
      default:
        return null;
    }
  };

  const renderActions = (message: Message) => {
    if (!message.actions || message.actions.length === 0) return null;

    const pendingActions = message.actions.filter(a => a.status === 'pending');
    const hasPendingActions = pendingActions.length > 0;

    return (
      <View style={styles.actionsContainer}>
        {message.actions.map((action, actionIndex) => (
          <View key={`action-${message.id}-${action.id}-${actionIndex}`} style={styles.actionItem}>
            <View style={styles.actionHeader}>
              {renderActionStatus(action.status)}
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            
            {action.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => executeAction(message.id, action.id)}
                >
                  <Check color="#FFFFFF" size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => rejectAction(message.id, action.id)}
                >
                  <X color="#FFFFFF" size={16} />
                </TouchableOpacity>
              </View>
            )}
            
            {action.status === 'executing' && (
              <View style={styles.actionButtons}>
                <View style={styles.loadingButton}>
                  <LoadingSpinner />
                </View>
              </View>
            )}
            
            {action.status === 'executing' && (
              <View style={styles.executingContainer}>
                <Text style={styles.executingText}>Wird ausgeführt...</Text>
              </View>
            )}
            
            {action.status === 'failed' && action.error && (
              <Text style={styles.errorText}>{action.error}</Text>
            )}
          </View>
        ))}
        
        {hasPendingActions && pendingActions.length > 1 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkConfirmButton}
              onPress={() => executeAllActions(message.id)}
            >
              <Text style={styles.bulkButtonText}>Alle bestätigen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkRejectButton}
              onPress={() => rejectAllActions(message.id)}
            >
              <Text style={styles.bulkButtonText}>Alle ablehnen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };





  const parseFoodItemsFromResponse = (response: string, userInput: string): PendingAction[] => {
    const actions: PendingAction[] = [];
    
    try {
      console.log('Parsing food items from response:', response);
      
      // Check if the response contains nutritional information
      const hasNutritionalInfo = response.includes('kcal') || response.includes('Kalorien') || 
                                response.includes('Protein') || response.includes('Kohlenhydrate') || 
                                response.includes('Fett') || response.includes('Nährwerte');
      
      if (!hasNutritionalInfo) {
        return actions;
      }
      
      // Parse individual food items from the response
      const foodItems: Meal[] = [];
      
      // Split response into lines and look for food items with nutritional info
      const lines = response.split('\n');
      let currentFoodItem: Partial<Meal> | null = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and headers/totals - ENHANCED filtering
        if (!trimmedLine || 
            trimmedLine.includes('Gesamt') || 
            trimmedLine.includes('**Gesamt**') ||
            trimmedLine.includes('Nährwerte') ||
            trimmedLine.includes('Schätzung') ||
            trimmedLine.toLowerCase().includes('hier ist') ||
            trimmedLine.startsWith('**Kalorien:**') ||
            trimmedLine.startsWith('**Protein:**') ||
            trimmedLine.startsWith('**Kohlenhydrate:**') ||
            trimmedLine.startsWith('**Fett:**') ||
            // Additional filters for total/summary lines
            trimmedLine.toLowerCase().includes('kalorien:') ||
            trimmedLine.toLowerCase().includes('protein:') ||
            trimmedLine.toLowerCase().includes('kohlenhydrate:') ||
            trimmedLine.toLowerCase().includes('fett:') ||
            trimmedLine.toLowerCase().includes('total') ||
            trimmedLine.toLowerCase().includes('summe') ||
            trimmedLine.toLowerCase().includes('insgesamt') ||
            // Skip lines that are just numbers with kcal (likely totals)
            /^\*?\s*\*?\s*\d+\s*kcal\s*\*?\s*$/.test(trimmedLine) ||
            // Skip lines that start with just nutritional values without food name
            /^\*?\s*\*?\s*\d+g\s*(Protein|Kohlenhydrate|Fett)/.test(trimmedLine)) {
          continue;
        }
        
        // Enhanced parsing patterns to handle various Gemini response formats
        
        // Pattern 1: **Food:** ca. XXX kcal, Xg Protein, Xg Kohlenhydrate, Xg Fett
        const foodMatch = trimmedLine.match(/\*\*([^:*]+):\*\*\s*ca\.?\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (foodMatch) {
          const [, foodName, calories, protein, carbs, fat] = foodMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // Pattern 2: * **Food:** ca. XXX kcal, Xg Protein, Xg Kohlenhydrate, Xg Fett
        const altFoodMatch = trimmedLine.match(/\*\s*\*\*([^:*]+):\*\*\s*ca\.?\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (altFoodMatch) {
          const [, foodName, calories, protein, carbs, fat] = altFoodMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // Pattern 3: Food: ca. XXX kcal, Xg Protein, Xg Kohlenhydrate, Xg Fett (without asterisks)
        const simpleFoodMatch = trimmedLine.match(/([^:]+):\s*ca\.?\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (simpleFoodMatch) {
          const [, foodName, calories, protein, carbs, fat] = simpleFoodMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // Pattern 4: Bullet point format: * **Food (portion):** ca. XXX kcal, Xg Protein, Xg Kohlenhydrate, Xg Fett
        const bulletFoodMatch = trimmedLine.match(/\*\s*\*\*([^(]+)(?:\([^)]*\))?:\*\*\s*ca\.?\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (bulletFoodMatch) {
          const [, foodName, calories, protein, carbs, fat] = bulletFoodMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // NEW Pattern 5: Handle the exact format from your example
        // "*   **Brötchen:** ca. 250 kcal, 8g Protein, 45g Kohlenhydrate, 3g Fett"
        const geminiFormatMatch = trimmedLine.match(/\*\s+\*\*([^:*]+):\*\*\s*ca\.?\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (geminiFormatMatch) {
          const [, foodName, calories, protein, carbs, fat] = geminiFormatMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // NEW Pattern 6: Handle format without "ca." 
        // "*   **Brötchen:** 250 kcal, 8g Protein, 45g Kohlenhydrate, 3g Fett"
        const directFormatMatch = trimmedLine.match(/\*\s+\*\*([^:*]+):\*\*\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (directFormatMatch) {
          const [, foodName, calories, protein, carbs, fat] = directFormatMatch;
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
        
        // NEW Pattern 7: Handle simple format without asterisks
        // "Brötchen: 250 kcal, 8g Protein, 45g Kohlenhydrate, 3g Fett"
        const simpleDirectMatch = trimmedLine.match(/^([^:]+):\s*(\d+)\s*kcal(?:,\s*(\d+)g\s*Protein)?(?:,\s*(\d+)g\s*Kohlenhydrate)?(?:,\s*(\d+)g\s*Fett)?/i);
        
        if (simpleDirectMatch && 
            !trimmedLine.includes('Gesamt') && 
            !trimmedLine.toLowerCase().includes('kalorien:') &&
            !trimmedLine.toLowerCase().includes('total') &&
            !trimmedLine.toLowerCase().includes('summe') &&
            !trimmedLine.toLowerCase().includes('insgesamt')) {
          const [, foodName, calories, protein, carbs, fat] = simpleDirectMatch;
          
          // Additional validation: food name should not be just numbers or nutritional terms
          const cleanFoodName = foodName.trim().toLowerCase();
          if (cleanFoodName.match(/^\d+$/) || 
              cleanFoodName === 'kalorien' || 
              cleanFoodName === 'protein' || 
              cleanFoodName === 'kohlenhydrate' || 
              cleanFoodName === 'fett') {
            continue;
          }
          
          currentFoodItem = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.floor(Math.random() * 10000)}`,
            name: foodName.trim(),
            calories: parseInt(calories) || 0,
            protein: parseInt(protein) || 0,
            carbs: parseInt(carbs) || 0,
            fat: parseInt(fat) || 0,
            portion: '1 Portion',
            time: new Date().toLocaleTimeString("de-DE", { 
              hour: "2-digit", 
              minute: "2-digit" 
            }),
            mealType: determineMealType(userInput) as 'breakfast' | 'lunch' | 'dinner' | 'snack'
          };
          
          foodItems.push(currentFoodItem as Meal);
          continue;
        }
      }
      
      console.log('Parsed food items:', foodItems);
      
      // Create actions for the parsed food items
      if (foodItems.length > 0) {
        // Parse date from user input
        const parsedDate = parseDateFromInput(userInput);
        const targetDate = parsedDate || selectedDate;
        
        console.log('Fallback parsing - target date from input:', parsedDate, 'Final target date:', targetDate);
        
        // Create a single action for all food items
        const dateText = parsedDate ? 
          (parsedDate === new Date().toISOString().split('T')[0] ? 'heute' : 
           parsedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'gestern' : 
           `am ${new Date(parsedDate).toLocaleDateString('de-DE')}`) : 'heute';
        
        // Create detailed description with food names, nutritional info and date
        const foodNames = foodItems.map(item => item.name).join(', ');
        const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);
        const totalProtein = foodItems.reduce((sum, item) => sum + item.protein, 0);
        const totalCarbs = foodItems.reduce((sum, item) => sum + item.carbs, 0);
        const totalFat = foodItems.reduce((sum, item) => sum + item.fat, 0);
        
        const fallbackActionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_fallback_${targetDate}`;
        const action: PendingAction = {
          id: fallbackActionId,
          type: 'add_meal',
          description: `${foodNames} ${dateText} hinzufügen\n${totalCalories} kcal • ${totalProtein}g Protein • ${totalCarbs}g Kohlenhydrate • ${totalFat}g Fett`,
          status: 'pending',
          data: {
            meals: foodItems,
            targetDate: targetDate
          }
        };
        
        actions.push(action);
      }
      
    } catch (error) {
      console.error('Error parsing food items:', error);
    }
    
    return actions;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Chatbot</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetChat}
        >
          <RotateCcw color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map((message) => (
          <View
            key={`message-${message.id}`}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.botMessage,
            ]}
          >

            <Text style={[
              styles.messageText,
              message.isUser ? styles.userText : styles.botText
            ]}>
              {message.text}
            </Text>
            <Text style={[
              styles.messageTime,
              message.isUser ? styles.userTime : styles.botTime
            ]}>
              {message.timestamp.toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>

          </View>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingMessage}>
              <LoadingSpinner />
              <Text style={styles.loadingText}>Nachricht wird verarbeitet...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Render pending actions above input */}
      {messages.some(msg => msg.actions?.some(action => action.status === 'pending')) && (
        <View style={styles.stickyActionsContainer}>
          {/* Bulk action buttons at the top */}
          {messages.some(msg => (msg.actions?.filter(action => action.status === 'pending') || []).length > 1) && (
            <View style={styles.stickyBulkActionsTop}>
              {messages.map((message) => {
                const pendingActions = message.actions?.filter(action => action.status === 'pending') || [];
                if (pendingActions.length <= 1) return null;
                
                return (
                  <View key={`sticky-bulk-${message.id}`} style={styles.stickyBulkActions}>
                    <TouchableOpacity
                      style={styles.stickyBulkConfirmButton}
                      onPress={() => executeAllActions(message.id)}
                    >
                      <Text style={styles.stickyBulkButtonText}>Alle bestätigen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stickyBulkRejectButton}
                      onPress={() => rejectAllActions(message.id)}
                    >
                      <Text style={styles.stickyBulkButtonText}>Alle ablehnen</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          
          <ScrollView 
            style={styles.stickyActionsScrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {messages.map((message) => {
              const pendingActions = message.actions?.filter(action => action.status === 'pending') || [];
              if (pendingActions.length === 0) return null;
              
              return (
                <View key={`actions-${message.id}`} style={styles.stickyActions}>
                  {pendingActions.map((action, actionIndex) => (
                    <Animated.View 
                      key={`sticky-action-${message.id}-${action.id}-${actionIndex}`} 
                      style={[
                        styles.stickyActionItem,
                        action.status === 'executing' && {
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          borderLeftColor: '#3B82F6',
                          borderLeftWidth: 4,
                          transform: [{ scale: 1.02 }],
                          shadowColor: '#3B82F6',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 4
                        }
                      ]}
                    >
                      <View style={styles.stickyActionHeader}>
                        {renderActionStatus(action.status)}
                        <Text style={[
                          styles.stickyActionDescription,
                          action.status === 'executing' && { color: '#3B82F6', fontWeight: '600' }
                        ]}>
                          {action.status === 'executing' ? 'Wird ausgeführt...' : action.description}
                        </Text>
                      </View>
                      {action.status === 'pending' && (
                        <View style={styles.stickyActionButtons}>
                          <TouchableOpacity
                            style={styles.stickyConfirmButton}
                            onPress={() => executeAction(message.id, action.id)}
                          >
                            <Check color="#FFFFFF" size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.stickyRejectButton}
                            onPress={() => rejectAction(message.id, action.id)}
                          >
                            <X color="#FFFFFF" size={16} />
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {action.status === 'executing' && (
                        <View style={styles.stickyActionButtons}>
                          <View style={styles.stickyLoadingButton}>
                            <LoadingSpinner />
                          </View>
                        </View>
                      )}
                      
                      {action.status === 'executing' && (
                        <View style={styles.stickyExecutingContainer}>
                          <Text style={styles.stickyExecutingText}>Lädt...</Text>
                        </View>
                      )}
                    </Animated.View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Schreibe eine Nachricht..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: inputText.trim() ? 1 : 0.5 }
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Send color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#667eea",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(102, 126, 234, 0.2)",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 20,
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#667eea",
    borderRadius: 25,
    borderBottomRightRadius: 8,
    padding: 16,
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderBottomLeftRadius: 8,
    padding: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.1)",
  },

  messageText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  userText: {
    color: "#FFFFFF",
  },
  botText: {
    color: "#111827",
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  userTime: {
    color: "#FFFFFF",
    textAlign: "right",
  },
  botTime: {
    color: "#6B7280",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.2)",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    backgroundColor: "#667eea",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  actionItem: {
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#667eea",
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  confirmButton: {
    backgroundColor: "#667eea",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  bulkActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  bulkConfirmButton: {
    backgroundColor: "#667eea",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  bulkRejectButton: {
    backgroundColor: "#EF4444",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  bulkButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  executingContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  executingText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
  },
  // Sticky actions styles
  stickyActionsContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 250,
  },
  stickyBulkActionsTop: {
    marginBottom: 8,
  },
  stickyActionsScrollView: {
    maxHeight: 180,
  },
  stickyActions: {
    gap: 8,
  },
  stickyActionItem: {
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#667eea",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  stickyActionDescription: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  stickyActionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  stickyConfirmButton: {
    backgroundColor: "#667eea",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  stickyRejectButton: {
    backgroundColor: "#EF4444",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  stickyBulkActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  stickyBulkConfirmButton: {
    backgroundColor: "#667eea",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    alignItems: "center",
  },
  stickyBulkRejectButton: {
    backgroundColor: "#EF4444",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    alignItems: "center",
  },
  stickyBulkButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  stickyExecutingContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
  },
  stickyExecutingText: {
    color: "#3B82F6",
    fontSize: 11,
    fontWeight: "600",
    fontStyle: "italic",
  },
  loadingButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  stickyLoadingButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  loadingMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderBottomLeftRadius: 8,
    padding: 16,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.1)",
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
});