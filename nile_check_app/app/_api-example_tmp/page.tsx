"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MealAPI, SleepAPI, CheckinAPI } from '@/lib/api/client';
import { MealEntry, SleepEntry, WellbeingCheckinRecord } from '@/types';

// 서버 컴포넌트가 이 페이지를 정적 생성하지 않도록 지정
export const dynamic = 'force-dynamic';

export default function ApiExamplePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [checkins, setCheckins] = useState<WellbeingCheckinRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 데이터 불러오기 함수
  const fetchData = useCallback(async () => {
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 식사 데이터 불러오기
      const mealsData = await MealAPI.getMeals(user.uid);
      setMeals(mealsData.meals);

      // 수면 데이터 불러오기
      const sleepData = await SleepAPI.getSleep(user.uid);
      setSleep(sleepData.sleep);

      // 체크인 데이터 불러오기
      const checkinsData = await CheckinAPI.getCheckins(user.uid);
      setCheckins(checkinsData.checkins);
    } catch (err) {
      console.error("데이터 불러오기 오류:", err);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 사용자가 로그인하면 데이터 불러오기
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // 테스트 데이터 추가 함수
  const addTestMeal = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const testMeal = {
        type: 'lunch' as const,
        dateTime: new Date().toISOString(),
        status: 'eaten' as const,
        description: '테스트 식사',
        quality: 4,
        withChildren: true
      };
      
      const result = await MealAPI.addMeal(user.uid, testMeal);
      console.log("식사 추가 결과:", result);
      
      // 목록 새로고침
      fetchData();
    } catch (err) {
      console.error("식사 추가 오류:", err);
      setError("식사 데이터를 추가하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  const addTestSleep = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const testSleep = {
        startTime: yesterday.toISOString(),
        endTime: now.toISOString(),
        quality: 3,
        wokeUpDuringNight: true,
        wakeUpCount: 2,
        wakeUpReason: 'stress' as const
      };
      
      const result = await SleepAPI.addSleep(user.uid, testSleep);
      console.log("수면 추가 결과:", result);
      
      // 목록 새로고침
      fetchData();
    } catch (err) {
      console.error("수면 추가 오류:", err);
      setError("수면 데이터를 추가하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API 예제 페이지</h1>
      
      {!user ? (
        <div className="bg-yellow-100 p-4 rounded-md mb-4">
          <p>이 페이지를 사용하려면 로그인이 필요합니다.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
              disabled={loading}
            >
              데이터 새로고침
            </button>
            <button 
              onClick={addTestMeal}
              className="px-4 py-2 bg-green-500 text-white rounded-md"
              disabled={loading}
            >
              테스트 식사 추가
            </button>
            <button 
              onClick={addTestSleep}
              className="px-4 py-2 bg-purple-500 text-white rounded-md"
              disabled={loading}
            >
              테스트 수면 추가
            </button>
          </div>
          
          {loading && <p className="mb-4">데이터를 불러오는 중...</p>}
          
          {error && (
            <div className="bg-red-100 p-4 rounded-md mb-4">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 식사 데이터 */}
            <div className="border p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-3">식사 기록</h2>
              {meals.length === 0 ? (
                <p>식사 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {meals.map(meal => (
                    <li key={meal.id} className="border-b pb-2">
                      <div className="font-medium">{meal.type} ({meal.status})</div>
                      <div className="text-sm">{new Date(meal.dateTime).toLocaleString()}</div>
                      {meal.description && <div className="text-gray-600">{meal.description}</div>}
                      {meal.quality && <div>품질: {meal.quality}/5</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* 수면 데이터 */}
            <div className="border p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-3">수면 기록</h2>
              {sleep.length === 0 ? (
                <p>수면 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {sleep.map(entry => (
                    <li key={entry.id} className="border-b pb-2">
                      <div className="font-medium">수면 시간</div>
                      <div className="text-sm">
                        {new Date(entry.startTime).toLocaleString()} ~ 
                        {new Date(entry.endTime).toLocaleString()}
                      </div>
                      <div>품질: {entry.quality}/5</div>
                      {entry.wokeUpDuringNight && (
                        <div className="text-sm">
                          {entry.wakeUpCount}회 기상 (이유: {entry.wakeUpReason})
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* 체크인 데이터 */}
            <div className="border p-4 rounded-md">
              <h2 className="text-xl font-semibold mb-3">체크인 기록</h2>
              {checkins.length === 0 ? (
                <p>체크인 기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {checkins.map(checkin => (
                    <li key={checkin.id} className="border-b pb-2">
                      <div className="font-medium">체크인</div>
                      <div className="text-sm">{new Date(checkin.dateTime).toLocaleString()}</div>
                      <div>스트레스 레벨: {checkin.input.stressLevel}/10</div>
                      {checkin.input.mainEmotions && (
                        <div className="text-sm">
                          감정: {checkin.input.mainEmotions.join(', ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 