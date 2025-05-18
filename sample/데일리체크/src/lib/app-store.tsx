
"use client";

import type { AppStoreData, MealEntry, SleepEntry, WellbeingCheckinRecord, WellnessReportRecord, WellbeingCheckinInputData } from '@/types';
import React, { useState, useEffect, useCallback, createContext, useContext, type ReactNode, useMemo } from 'react';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { subDays, formatISO, setHours, setMinutes, parseISO, format, startOfDay, addDays, isWithinInterval, startOfWeek, endOfWeek, endOfDay } from 'date-fns';
import type { WeeklyWellnessReportInput } from '@/ai/flows/wellness-report';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

// Constants
const FIRESTORE_COLLECTION_NAME = 'appData';

const initialEmptyData: AppStoreData = {
  meals: [],
  sleep: [],
  checkins: [],
  wellnessReports: [],
};

// Helper functions for sample data generation
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomElements = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBoolean = (probabilityTrue: number = 0.5): boolean => Math.random() < probabilityTrue;

const generateSampleData = (numDays: number): AppStoreData => {
  const data: AppStoreData = { meals: [], sleep: [], checkins: [], wellnessReports: [] };
  const today = new Date();

  const mealTypes: MealEntry['type'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealAndSleepQualities = [1, 2, 3, 4, 5];

  const emotionKeys = ["joy", "sadness", "anger", "anxiety", "calmness", "gratitude", "stress", "hope", "tiredness", "excitement", "other"];
  
  const activityKeys = ["exercise", "relaxation", "hobbies", "socializing", "householdChores", "childcare", "workStudy", "selfCare", "outdoors", "errands", "other"];

  const partnerKeyOptionsRaw: WellbeingCheckinInputData['conversationPartner'][] = ['friend', 'spouse', 'parents', 'colleague', 'other', 'none'];
  const partnerKeyOptions = partnerKeyOptionsRaw.filter(key => key !== undefined) as Exclude<WellbeingCheckinInputData['conversationPartner'], undefined>[];
  const spouseTopicKeyOptions = ["dailyChat", "kidsTalk", "difficulties", "futurePlans", "finances", "hobbiesLeisure", "other"];


  for (let i = 0; i < numDays; i++) {
    const currentDate = subDays(today, i);
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');

    // Generate Meals
    for (const mealType of mealTypes) {
      if (mealType === 'snack' && !randomBoolean(0.3)) continue;

      const mealStatus = randomBoolean(0.9) ? 'eaten' : 'skipped';
      let mealHour: number;
      
      switch (mealType) {
        case 'breakfast': 
          mealHour = getRandomInt(7, 10); 
          break;
        case 'lunch': 
          mealHour = getRandomInt(12, 15); 
          break;
        case 'dinner': 
          mealHour = getRandomInt(18, 22); 
          break;
        case 'snack': 
          const isMorningSnack = randomBoolean();
          mealHour = isMorningSnack ? getRandomInt(9,11) : getRandomInt(14,17);
          break;
        default: 
          mealHour = 12;
      }
      const mealDateTime = setMinutes(setHours(currentDate, mealHour), getRandomInt(0,59));

      const mealEntry: MealEntry = {
        id: crypto.randomUUID(),
        type: mealType,
        dateTime: formatISO(mealDateTime),
        status: mealStatus,
      };
      if (mealStatus === 'eaten') {
        mealEntry.description = `Sample ${mealType} on ${currentDateStr}`;
        mealEntry.quality = getRandomElement(mealAndSleepQualities) as number;
      }
      data.meals.push(mealEntry);
    }

    // Generate Sleep
    const sleepEndTime = setMinutes(setHours(currentDate, getRandomInt(6,9)), getRandomInt(0,59));
    const sleepStartTime = subDays(setMinutes(setHours(currentDate, getRandomInt(21,23)), getRandomInt(0,59)),1);

    const wokeUp = randomBoolean(0.4);
    const sleepEntry: SleepEntry = {
      id: crypto.randomUUID(),
      startTime: formatISO(sleepStartTime),
      endTime: formatISO(sleepEndTime),
      quality: getRandomElement(mealAndSleepQualities) as number,
      wokeUpDuringNight: wokeUp,
      wakeUpCount: wokeUp ? getRandomInt(1,3) : 0,
    };
    data.sleep.push(sleepEntry);

    // Generate Check-ins
    if (randomBoolean(0.8)) { 
      const selectedActivityKeysRaw = getRandomElements(activityKeys.filter(k => k !== 'other'), getRandomInt(1, 3));
      
      const checkinInput: WellbeingCheckinInputData = {
        stressLevel: getRandomInt(1, 10),
        mainEmotions: getRandomElements(emotionKeys.filter(e => e !== 'other'), getRandomInt(1, 2)), 
        todayActivities: selectedActivityKeysRaw,
      };
      
      if (randomBoolean(0.15) && checkinInput.mainEmotions.length < 3) {
        checkinInput.mainEmotions.push("other");
        checkinInput.otherEmotionDetail = "Sample other emotion detail";
      }

      if (randomBoolean(0.15) && !selectedActivityKeysRaw.includes("other")) {
          checkinInput.todayActivities.push("other");
          checkinInput.otherActivityDetail = "Sample other activity detail (e.g., visited the library)";
      }
      
      if (partnerKeyOptions.length > 0) {
          const partnerKey = getRandomElement(partnerKeyOptions);
           if (partnerKey !== 'none') { 
            checkinInput.conversationPartner = partnerKey; 
            if (partnerKey === 'other') {
                checkinInput.otherConversationPartnerDetail = "Sample other partner detail";
            } else if (partnerKey === 'spouse') {
                const selectedSpouseTopicKeys = getRandomElements(spouseTopicKeyOptions.filter(t => t !== 'other'), getRandomInt(1,2));
                checkinInput.spouseConversationTopics = selectedSpouseTopicKeys;
                if (randomBoolean(0.25) && selectedSpouseTopicKeys.length < 2 && !selectedSpouseTopicKeys.includes('other')) {
                    checkinInput.spouseConversationTopics.push("other");
                    checkinInput.otherSpouseTopicDetail = "Sample other spouse topic detail";
                }
            }
        } else {
            checkinInput.conversationPartner = 'none'; 
        }
      }

      const checkinRecord: WellbeingCheckinRecord = {
        id: crypto.randomUUID(),
        dateTime: formatISO(startOfDay(currentDate)), 
        input: checkinInput,
        output: null,
      };
      data.checkins.push(checkinRecord);
    }
  }
  return data;
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
  addWellnessReport: (reportInput: WeeklyWellnessReportInput, reportOutput: WellnessReportRecord['output']) => Promise<void>;
  getAllWellnessReports: () => WellnessReportRecord[];
  getLatestWellnessReport: () => WellnessReportRecord | null;
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
          
          const convertTimestampsGeneric = (records: any[] = [], dateKey: string) =>
            records.map(record => ({
              ...record,
              [dateKey]: record[dateKey] instanceof Timestamp ? record[dateKey].toDate().toISOString() : (typeof record[dateKey] === 'string' ? parseISO(record[dateKey]).toISOString() : new Date().toISOString()),
            }));
          
          const convertSleepTimestamps = (sleepRecords: SleepEntry[] = []) =>
            sleepRecords.map(record => ({
              ...record,
              startTime: record.startTime ? (record.startTime instanceof Timestamp ? record.startTime.toDate().toISOString() : parseISO(record.startTime).toISOString()) : new Date().toISOString(),
              endTime: record.endTime ? (record.endTime instanceof Timestamp ? record.endTime.toDate().toISOString() : parseISO(record.endTime).toISOString()) : new Date().toISOString(),
            }));
            
          const convertWellnessReportTimestamps = (reports: WellnessReportRecord[] = []) =>
            reports.map(report => ({
              ...report,
              weekStartDate: report.weekStartDate ? (report.weekStartDate instanceof Timestamp ? report.weekStartDate.toDate().toISOString() : parseISO(report.weekStartDate).toISOString()) : new Date().toISOString(),
              generatedDate: report.generatedDate ? (report.generatedDate instanceof Timestamp ? report.generatedDate.toDate().toISOString() : parseISO(report.generatedDate).toISOString()) : new Date().toISOString(),
            }));

          setData({
            meals: convertTimestampsGeneric(firestoreData.meals || [], 'dateTime'),
            sleep: convertSleepTimestamps(firestoreData.sleep || []),
            checkins: convertTimestampsGeneric(firestoreData.checkins || [], 'dateTime'),
            wellnessReports: convertWellnessReportTimestamps(firestoreData.wellnessReports || []),
          });

        } else {
          if (user?.uid) { // Ensure user exists before creating a new doc
            console.log(`No existing data found for user ${user.uid}. Generating sample data.`);
            const sampleData = generateSampleData(30); 
            await setDoc(docRef, sampleData);
            setData(sampleData);
            console.log("Sample data generated and saved to Firestore for new user.");
          } else {
             setData(initialEmptyData); 
          }
        }
      } catch (error) {
        console.error(`Failed to load or initialize data for user ${user?.uid}:`, error);
        setData(initialEmptyData); 
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };

    if (authLoading) {
      setIsLoading(true);
      setIsInitialized(false);
      return;
    }

    if (userSpecificDocRef) {
        loadDataFromFirestore(userSpecificDocRef);
    } else {
      setData(initialEmptyData);
      setIsInitialized(true);
      setIsLoading(false);
    }
  }, [userSpecificDocRef, authLoading, user?.uid]);

  const addMeal = useCallback(async (meal: Omit<MealEntry, 'id'>) => {
    if (!userSpecificDocRef) { console.error("Cannot add meal: user not authenticated."); return; }
    const newMealWithId = { ...meal, id: crypto.randomUUID() };
    try {
      await updateDoc(userSpecificDocRef, { meals: arrayUnion(newMealWithId) });
      setData(prev => ({ ...prev, meals: [...(prev.meals || []), newMealWithId] }));
    } catch (error) { console.error("Failed to add meal to Firestore:", error); }
  }, [userSpecificDocRef]);

  const updateMeal = useCallback(async (updatedMeal: MealEntry) => {
    if (!userSpecificDocRef) { console.error("Cannot update meal: user not authenticated."); return; }
    try {
      const currentDoc = await getDoc(userSpecificDocRef);
      if (currentDoc.exists()) {
        const currentMeals = (currentDoc.data() as AppStoreData)?.meals || [];
        const updatedMeals = currentMeals.map(meal =>
          meal.id === updatedMeal.id ? updatedMeal : meal
        );
        await updateDoc(userSpecificDocRef, { meals: updatedMeals });
        setData(prev => ({ ...prev, meals: updatedMeals }));
      }
    } catch (error) { console.error("Failed to update meal in Firestore:", error); }
  }, [userSpecificDocRef]);
  
  const getMealsOnDate = useCallback((date: string): MealEntry[] => {
    return (data.meals || []).filter(meal => {
        try { return format(parseISO(meal.dateTime), 'yyyy-MM-dd') === date; }
        catch(e) { return false; }
    });
  }, [data.meals]);

  const getMealsForWeek = useCallback((weekStartDate: Date): MealEntry[] => {
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    return (data.meals || []).filter(meal => {
      try {
        const mealDate = parseISO(meal.dateTime);
        return isWithinInterval(mealDate, { start: startOfDay(weekStartDate), end: endOfDay(weekEnd) });
      } catch(e) { return false; }
    });
  }, [data.meals]);

  const addSleep = useCallback(async (sleep: Omit<SleepEntry, 'id'>) => {
    if (!userSpecificDocRef) { console.error("Cannot add sleep: user not authenticated."); return; }
    const newSleepWithId = { ...sleep, id: crypto.randomUUID() };
    try {
      await updateDoc(userSpecificDocRef, { sleep: arrayUnion(newSleepWithId) });
      setData(prev => ({ ...prev, sleep: [...(prev.sleep || []), newSleepWithId] }));
    } catch (error) { console.error("Failed to add sleep to Firestore:", error); }
  }, [userSpecificDocRef]);

  const updateSleep = useCallback(async (updatedSleep: SleepEntry) => {
    if (!userSpecificDocRef) { console.error("Cannot update sleep: user not authenticated."); return; }
    try {
      const currentDoc = await getDoc(userSpecificDocRef);
      if (currentDoc.exists()) {
        const currentSleepEntries = (currentDoc.data() as AppStoreData)?.sleep || [];
        const updatedSleepEntries = currentSleepEntries.map(sleepEntry =>
          sleepEntry.id === updatedSleep.id ? updatedSleep : sleepEntry
        );
        await updateDoc(userSpecificDocRef, { sleep: updatedSleepEntries });
        setData(prev => ({ ...prev, sleep: updatedSleepEntries }));
      }
    } catch (error) { console.error("Failed to update sleep in Firestore:", error); }
  }, [userSpecificDocRef]);

  const getSleepEntryForNightOf = useCallback((date: string): SleepEntry | undefined => {
    return (data.sleep || []).find(entry => {
      try { return format(parseISO(entry.endTime), 'yyyy-MM-dd') === date; }
      catch (e) { return false; }
    });
  }, [data.sleep]);

  const getSleepForWeek = useCallback((weekStartDate: Date): SleepEntry[] => {
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    return (data.sleep || []).filter(entry => {
      try {
        const entryEndDate = parseISO(entry.endTime);
        return isWithinInterval(entryEndDate, { start: startOfDay(weekStartDate), end: endOfDay(weekEnd) });
      } catch (e) { return false; }
    });
  }, [data.sleep]);

  const addCheckin = useCallback(async (checkinInput: WellbeingCheckinInputData, date: Date) => {
    if (!userSpecificDocRef) { console.error("Cannot add checkin: user not authenticated."); return; }
    const newCheckinRecord: WellbeingCheckinRecord = {
      id: crypto.randomUUID(),
      dateTime: formatISO(startOfDay(date)), 
      input: checkinInput, 
      output: null
    };
    try {
      const currentDoc = await getDoc(userSpecificDocRef);
      let existingCheckins = currentDoc.exists() ? (currentDoc.data() as AppStoreData).checkins || [] : [];
      existingCheckins = existingCheckins.filter(c => {
          try { return format(parseISO(c.dateTime), 'yyyy-MM-dd') !== format(startOfDay(date), 'yyyy-MM-dd'); }
          catch(e) { return false; }
      });
      
      await setDoc(userSpecificDocRef, { checkins: [...existingCheckins, newCheckinRecord] }, { merge: true });
      setData(prev => ({ ...prev, checkins: [...existingCheckins, newCheckinRecord] }));
    } catch (error) { console.error("Failed to add checkin to Firestore:", error); }
  }, [userSpecificDocRef]);

  const getCheckinForDate = useCallback((date: string): WellbeingCheckinRecord | undefined => {
    return (data.checkins || []).find(record => {
        try { return format(parseISO(record.dateTime), 'yyyy-MM-dd') === date; }
        catch (e) { return false; }
    });
  }, [data.checkins]);

  const getCheckinsForWeek = useCallback((weekStartDate: Date): WellbeingCheckinRecord[] => {
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    return (data.checkins || []).filter(record => {
      try {
        const recordDate = parseISO(record.dateTime);
        return isWithinInterval(recordDate, { start: startOfDay(weekStartDate), end: endOfDay(weekEnd) });
      } catch(e) { return false; }
    });
  }, [data.checkins]);

  const addWellnessReport = useCallback(async (reportInput: WeeklyWellnessReportInput, reportOutput: WellnessReportRecord['output']) => {
    if (!userSpecificDocRef) { console.error("Cannot add wellness report: user not authenticated."); return; }
    const newReportRecord: WellnessReportRecord = {
      id: crypto.randomUUID(),
      weekStartDate: formatISO(startOfDay(parseISO(reportInput.weekStartDate))),
      generatedDate: new Date().toISOString(),
      input: {
        ...reportInput,
        userLanguage: 'ko' // Hardcoded as app is Korean only now
      },
      output: reportOutput
    };
    try {
      await updateDoc(userSpecificDocRef, { wellnessReports: arrayUnion(newReportRecord) });
      setData(prev => ({ ...prev, wellnessReports: [...(prev.wellnessReports || []), newReportRecord] }));
    } catch (error) { console.error("Failed to add wellness report to Firestore:", error); }
  }, [userSpecificDocRef]);
  
  const getAllWellnessReports = useCallback((): WellnessReportRecord[] => {
    return (data.wellnessReports || []).sort((a,b) => {
        try { return parseISO(b.generatedDate).getTime() - parseISO(a.generatedDate).getTime(); }
        catch(e) {return 0;}
    });
  }, [data.wellnessReports]);

  const getLatestWellnessReport = useCallback((): WellnessReportRecord | null => {
    if (!data || !data.wellnessReports || data.wellnessReports.length === 0) return null;
    const sortedReports = [...data.wellnessReports].sort((a, b) => {
      let dateA, dateB;
      try { dateA = parseISO(a.generatedDate); } catch(e) { dateA = new Date(0); }
      try { dateB = parseISO(b.generatedDate); } catch(e) { dateB = new Date(0); }
      return dateB.getTime() - dateA.getTime();
    });
    return sortedReports[0];
  }, [data.wellnessReports]);

  const contextValue: AppStoreContextType = {
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

  return contextValue;
}

// Provider Component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const store = useAppStoreInternal();
  
  if (!store.isInitialized && store.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  
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
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

    
