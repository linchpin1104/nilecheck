"use client";

import type { AppStoreData, MealEntry, SleepEntry, WellbeingCheckinRecord, WellnessReportRecord, WellbeingCheckinInputData } from '@/types';
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode, useMemo } from 'react';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { formatISO, parseISO, format, startOfDay, isWithinInterval, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// Constants
const FIRESTORE_COLLECTION_NAME = 'appData';

const initialEmptyData: AppStoreData = {
  meals: [],
  sleep: [],
  checkins: [],
  wellnessReports: [],
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

  const userSpecificDocRef = useMemo(() => {
    if (user?.uid) {
      return doc(db, FIRESTORE_COLLECTION_NAME, user.uid);
    }
    return null;
  }, [user]);

  useEffect(() => {
    const loadDataFromFirestore = async (docRef: NonNullable<typeof userSpecificDocRef>) => {
      setIsLoading(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const firestoreData = docSnap.data() as AppStoreData;
          
          // Convert Firestore timestamps to ISO strings if needed
          setData(firestoreData);
        } else {
          // Create a new document with empty arrays
          await setDoc(docRef, initialEmptyData);
          setData(initialEmptyData);
        }
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
        setData(initialEmptyData);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    // Only attempt to load data if we have a valid user and doc reference
    if (userSpecificDocRef && !authLoading) {
      loadDataFromFirestore(userSpecificDocRef);
    } else if (!user && !authLoading) {
      // No user logged in but auth is initialized
      setData(initialEmptyData);
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [userSpecificDocRef, authLoading, user]);

  const saveToFirestore = useCallback(async (newData: AppStoreData) => {
    if (!userSpecificDocRef) {
      console.warn("Cannot save data: No user logged in");
      return;
    }
    
    try {
      await setDoc(userSpecificDocRef, newData);
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      throw error;
    }
  }, [userSpecificDocRef]);

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