"use client";

import type { AppStoreData, MealEntry, SleepEntry, WellbeingCheckinRecord, WellnessReportRecord, WellbeingCheckinInputData } from '@/types';
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode, useMemo } from 'react';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { formatISO, parseISO, format, startOfDay, isWithinInterval, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// Constants
const FIRESTORE_COLLECTION_NAME = 'appData';
// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const initialEmptyData: AppStoreData = {
  meals: [],
  sleep: [],
  checkins: [],
  wellnessReports: [],
};

// Data cache structure
interface DataCache {
  userData: Record<string, {
    data: AppStoreData;
    timestamp: number;
  }>;
}

// Global cache (outside of components)
const globalDataCache: DataCache = {
  userData: {}
};

// Context Definition
interface AppStoreContextType {
  data: AppStoreData;
  isInitialized: boolean;
  isLoading: boolean;
  addMeal: (meal: Omit<MealEntry, 'id'>) => Promise<void>;
  updateMeal: (meal: MealEntry) => Promise<void>;
  getMealsOnDate: (date: string) => MealEntry[];
  getMealsForWeek: (weekStartDate: Date) => MealEntry[];
  addSleep: (sleep: Omit<SleepEntry, 'id'>) => Promise<void>;
  updateSleep: (sleep: SleepEntry) => Promise<void>;
  getSleepEntryForNightOf: (date: string) => SleepEntry | undefined;
  getSleepForWeek: (weekStartDate: Date) => SleepEntry[];
  addCheckin: (checkinInput: WellbeingCheckinInputData, date: Date) => Promise<void>;
  getCheckinForDate: (date: string) => WellbeingCheckinRecord | undefined;
  getCheckinsForWeek: (weekStartDate: Date) => WellbeingCheckinRecord[];
  addWellnessReport: (reportInput: WellnessReportInput, reportOutput: WellnessReportRecord['output']) => Promise<void>;
  getAllWellnessReports: () => WellnessReportRecord[];
  getLatestWellnessReport: () => WellnessReportRecord | null;
  syncData: () => Promise<void>;  // Added explicit function for data sync
  getTodaySummary: () => { todaySleepHours: number; todayMealsLogged: number; todayActivitiesLogged: number; };
  generateSampleData: () => Promise<void>;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
}

// Define the input type for wellness reports
interface WellnessReportInput {
  weekStartDate: string;
  dailyCheckins: { 
    date: string; 
    stressLevel?: number; 
    emotions?: string[]; 
    activities?: string[];
  }[];
  weeklyLogSummary: { 
    averageSleepHours?: number; 
    averageSleepQuality?: number; 
    mealsLoggedCount?: number;
  };
  userLanguage: string;
  [key: string]: unknown;
}

const AppContext = createContext<AppStoreContextType | undefined>(undefined);

// Internal hook for logic
function useAppStoreInternal(): AppStoreContextType {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AppStoreData>(initialEmptyData);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const userSpecificDocRef = useMemo(() => {
    if (user?.uid) {
      return doc(db, FIRESTORE_COLLECTION_NAME, user.uid);
    }
    return null;
  }, [user]);

  // Function to check if cache is valid
  const hasCachedData = useCallback((userId: string) => {
    const cache = globalDataCache.userData[userId];
    if (!cache) return false;
    
    const now = Date.now();
    return (now - cache.timestamp) < CACHE_DURATION;
  }, []);

  // Function to load data with caching
  const loadDataFromFirestore = useCallback(async (docRef: NonNullable<typeof userSpecificDocRef>, userId: string, forceRefresh = false) => {
    setIsLoading(true);
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh && hasCachedData(userId)) {
        console.log("Using cached app data for user:", userId);
        const cachedData = globalDataCache.userData[userId].data;
        setData(cachedData);
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      console.log("Fetching fresh app data from Firestore for user:", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as AppStoreData;
        
        // Update cache
        globalDataCache.userData[userId] = {
          data: firestoreData,
          timestamp: Date.now()
        };
        
        setData(firestoreData);
      } else {
        // Create a new document with empty arrays
        await setDoc(docRef, initialEmptyData);
        
        // Update cache with empty data
        globalDataCache.userData[userId] = {
          data: initialEmptyData,
          timestamp: Date.now()
        };
        
        setData(initialEmptyData);
      }
    } catch (error) {
      console.error("Error loading data from Firestore:", error);
      setData(initialEmptyData);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [hasCachedData]);

  useEffect(() => {
    // Only attempt to load data if we have a valid user and doc reference
    if (userSpecificDocRef && !authLoading && user?.uid) {
      loadDataFromFirestore(userSpecificDocRef, user.uid);
    } else if (!user && !authLoading) {
      // No user logged in but auth is initialized
      setData(initialEmptyData);
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [userSpecificDocRef, authLoading, user, loadDataFromFirestore]);

  const saveToFirestore = useCallback(async (newData: AppStoreData) => {
    if (!userSpecificDocRef || !user?.uid) {
      console.warn("Cannot save data: No user logged in");
      return;
    }
    
    try {
      await setDoc(userSpecificDocRef, newData);
      
      // Update cache after saving
      globalDataCache.userData[user.uid] = {
        data: newData,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      throw error;
    }
  }, [userSpecificDocRef, user]);

  // Function to manually sync data with Firestore
  const syncData = useCallback(async () => {
    if (!userSpecificDocRef || !user?.uid) {
      console.warn("Cannot sync data: No user logged in");
      return;
    }
    
    // Force refresh from Firestore
    await loadDataFromFirestore(userSpecificDocRef, user.uid, true);
  }, [userSpecificDocRef, user, loadDataFromFirestore]);

  // Meal-related functions
  const addMeal = useCallback(async (meal: Omit<MealEntry, 'id'>) => {
    const newMeal: MealEntry = {
      ...meal,
      id: crypto.randomUUID(),
    };
    
    const newData = {
      ...data,
      meals: [...data.meals, newMeal]
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const updateMeal = useCallback(async (updatedMeal: MealEntry) => {
    const newMeals = data.meals.map(meal => 
      meal.id === updatedMeal.id ? updatedMeal : meal
    );
    
    const newData = {
      ...data,
      meals: newMeals
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const getMealsOnDate = useCallback((dateStr: string) => {
    const targetDate = startOfDay(parseISO(dateStr));
    const targetDateEnd = endOfDay(parseISO(dateStr));
    
    return data.meals.filter(meal => {
      const mealDate = parseISO(meal.dateTime);
      return isWithinInterval(mealDate, { start: targetDate, end: targetDateEnd });
    });
  }, [data.meals]);

  const getMealsForWeek = useCallback((weekStartDate: Date) => {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday as week start
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    
    return data.meals.filter(meal => {
      const mealDate = parseISO(meal.dateTime);
      return isWithinInterval(mealDate, { start: weekStart, end: weekEnd });
    });
  }, [data.meals]);

  // Sleep-related functions
  const addSleep = useCallback(async (sleep: Omit<SleepEntry, 'id'>) => {
    const newSleep: SleepEntry = {
      ...sleep,
      id: crypto.randomUUID(),
    };
    
    const newData = {
      ...data,
      sleep: [...data.sleep, newSleep]
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const updateSleep = useCallback(async (updatedSleep: SleepEntry) => {
    const newSleep = data.sleep.map(sleep => 
      sleep.id === updatedSleep.id ? updatedSleep : sleep
    );
    
    const newData = {
      ...data,
      sleep: newSleep
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const getSleepEntryForNightOf = useCallback((dateStr: string) => {
    // For a given date, find sleep entry where the start time falls on that date
    const targetDate = startOfDay(parseISO(dateStr));
    const targetDateEnd = endOfDay(parseISO(dateStr));
    
    return data.sleep.find(sleep => {
      const sleepStart = parseISO(sleep.startTime);
      return isWithinInterval(sleepStart, { start: targetDate, end: targetDateEnd });
    });
  }, [data.sleep]);

  const getSleepForWeek = useCallback((weekStartDate: Date) => {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    
    return data.sleep.filter(sleep => {
      const sleepStart = parseISO(sleep.startTime);
      return isWithinInterval(sleepStart, { start: weekStart, end: weekEnd });
    });
  }, [data.sleep]);

  // Checkin-related functions
  const addCheckin = useCallback(async (checkinInput: WellbeingCheckinInputData, date: Date) => {
    const newCheckin: WellbeingCheckinRecord = {
      id: crypto.randomUUID(),
      dateTime: formatISO(startOfDay(date)),
      date: format(date, 'yyyy-MM-dd'),
      input: checkinInput,
      output: null,
    };
    
    const newData = {
      ...data,
      checkins: [...data.checkins, newCheckin]
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const getCheckinForDate = useCallback((dateStr: string) => {
    const targetDate = format(parseISO(dateStr), 'yyyy-MM-dd');
    
    return data.checkins.find(checkin => {
      const checkinDate = format(parseISO(checkin.dateTime), 'yyyy-MM-dd');
      return checkinDate === targetDate;
    });
  }, [data.checkins]);

  const getCheckinsForWeek = useCallback((weekStartDate: Date) => {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    
    return data.checkins.filter(checkin => {
      const checkinDate = parseISO(checkin.dateTime);
      return isWithinInterval(checkinDate, { start: weekStart, end: weekEnd });
    });
  }, [data.checkins]);

  // Wellness report functions
  const addWellnessReport = useCallback(async (reportInput: WellnessReportInput, reportOutput: WellnessReportRecord['output']) => {
    const newReport: WellnessReportRecord = {
      id: crypto.randomUUID(),
      weekStartDate: reportInput.weekStartDate,
      generatedDate: formatISO(new Date()),
      input: reportInput,
      output: reportOutput,
    };
    
    const newData = {
      ...data,
      wellnessReports: [...data.wellnessReports, newReport]
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  const getAllWellnessReports = useCallback(() => {
    return [...data.wellnessReports].sort((a, b) => 
      parseISO(b.generatedDate).getTime() - parseISO(a.generatedDate).getTime()
    );
  }, [data.wellnessReports]);

  const getLatestWellnessReport = useCallback(() => {
    if (data.wellnessReports.length === 0) return null;
    
    return data.wellnessReports.reduce((latest, current) => {
      return parseISO(current.generatedDate) > parseISO(latest.generatedDate) ? current : latest;
    }, data.wellnessReports[0]);
  }, [data.wellnessReports]);

  // Calculate today's summary
  const getTodaySummary = useCallback(() => {
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');
    
    // Sleep hours
    const todaySleep = getSleepEntryForNightOf(formattedToday);
    let sleepHours = 0;
    
    if (todaySleep) {
      const start = new Date(todaySleep.startTime);
      const end = new Date(todaySleep.endTime);
      sleepHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
    
    // Today's meals
    const todayMeals = getMealsOnDate(formattedToday);
    
    // Today's checkin
    const todayCheckin = getCheckinForDate(formattedToday);
    const activitiesCount = todayCheckin ? todayCheckin.input.todayActivities.length : 0;
    
    return {
      todaySleepHours: sleepHours,
      todayMealsLogged: todayMeals.length,
      todayActivitiesLogged: activitiesCount
    };
  }, [getSleepEntryForNightOf, getMealsOnDate, getCheckinForDate]);
  
  // Generate sample data for testing
  const generateSampleData = useCallback(async () => {
    // 현재 날짜 기준의 샘플 데이터 생성
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    
    // 샘플 식사 데이터
    const sampleMeals: MealEntry[] = [
      {
        id: crypto.randomUUID(),
        type: 'breakfast',
        status: 'eaten',
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30).toISOString(),
        description: '토스트와 계란 프라이',
        quality: 4,
        foodTypes: ['bread', 'egg'],
        waterIntake: 0.5
      },
      {
        id: crypto.randomUUID(),
        type: 'lunch',
        status: 'eaten',
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString(),
        description: '비빔밥',
        quality: 5,
        foodTypes: ['rice', 'vegetables', 'meat'],
        waterIntake: 0.7
      }
    ];
    
         // 샘플 수면 데이터
     const sampleSleep: SleepEntry[] = [
       {
         id: crypto.randomUUID(),
         startTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 0).toISOString(),
         endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0).toISOString(),
         quality: 4,
         wokeUpDuringNight: true,
         wakeUpCount: 1
       }
    ];
    
    // 샘플 체크인 데이터
    const sampleCheckins: WellbeingCheckinRecord[] = [
      {
        id: crypto.randomUUID(),
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
        date: format(today, 'yyyy-MM-dd'),
        input: {
          stressLevel: 4,
          mainEmotions: ['joy', 'anxiety'],
          todayActivities: ['exercise', 'relaxation'],
          conversationPartner: '배우자',
          spouseConversationTopics: ['everyday', 'future']
        },
        output: null
      }
    ];
    
    const newData: AppStoreData = {
      ...data,
      meals: [...data.meals, ...sampleMeals],
      sleep: [...data.sleep, ...sampleSleep],
      checkins: [...data.checkins, ...sampleCheckins],
      wellnessReports: [...data.wellnessReports]
    };
    
    setData(newData);
    await saveToFirestore(newData);
  }, [data, saveToFirestore]);

  return {
    data,
    isInitialized,
    isLoading,
    addMeal,
    updateMeal,
    getMealsOnDate,
    getMealsForWeek,
    addSleep,
    updateSleep,
    getSleepEntryForNightOf,
    getSleepForWeek,
    addCheckin,
    getCheckinForDate,
    getCheckinsForWeek,
    addWellnessReport,
    getAllWellnessReports,
    getLatestWellnessReport,
    syncData,
    getTodaySummary,
    generateSampleData,
    suggestions,
    setSuggestions
  };
}

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const store = useAppStoreInternal();
  
  return (
    <AppContext.Provider value={store}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the store
export const useAppStore = (): AppStoreContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}; 