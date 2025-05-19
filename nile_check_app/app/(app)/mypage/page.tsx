"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, User, LogOut, Mail, Phone, CalendarDays, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { useAppStore } from "@/lib/store";
import { sessionStore } from "@/contexts/SessionProvider";

interface UserData {
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  childrenInfo: {
    count: number;
    ageGroups: string[];
  };
}

export default function MyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, refreshSession, getUserId } = useAuth();
  const { meals, sleep, checkins, isInitialized, syncData } = useAppStore();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 사용자 정보가 로드되면 상태 업데이트
  const [userData, setUserData] = useState<UserData>({
    name: "사용자",
    email: "",
    phoneNumber: "",
    createdAt: new Date().toISOString(),
    childrenInfo: {
      count: 0,
      ageGroups: []
    }
  });
  
  // Calculate stats with memoization
  const statsData = useMemo(() => ({
    totalMeals: meals.length,
    totalSleep: sleep.length,
    totalCheckins: checkins.length,
    wellnessReports: Math.floor(checkins.length / 4) // Just an example calculation
  }), [meals.length, sleep.length, checkins.length]);
  
  // 사용자 정보 수동 새로고침 (세션 정보 및 데이터 모두 갱신)
  const handleRefreshUserData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      console.log("사용자 정보 및 데이터 새로고침 시작");
      
      // 세션 정보 강제 갱신
      await refreshSession();
      
      // 앱 데이터도 함께 새로고침
      const userId = getUserId() || sessionStore.userId || 'user_default';
      await syncData(userId);
      
      setIsRefreshing(false);
    } catch (err) {
      console.error("사용자 정보 새로고침 오류:", err);
      setError("사용자 정보를 새로고침하는 중 오류가 발생했습니다.");
      setIsRefreshing(false);
    }
  };
  
  // 인증된 사용자 정보로 상태 업데이트 - childrenInfo 포함하여 모든 필드 갱신
  useEffect(() => {
    console.log("사용자 정보 useEffect 실행:", user ? `${user.name} (${user.phoneNumber})` : "정보 없음");
    
    if (user) {
      setUserData(prevData => ({
        ...prevData,
        name: user.name || prevData.name,
        email: user.email || prevData.email,
        phoneNumber: user.phoneNumber || prevData.phoneNumber,
        createdAt: user.createdAt || prevData.createdAt,
        childrenInfo: user.childrenInfo || prevData.childrenInfo
      }));
    }
  }, [user]);
  
  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setError(null);
      
      // 세션 스토어도 초기화
      sessionStore.updateUserId(null);
      sessionStore.isAuthenticated = false;
      
      await logout();
      // 로그아웃 후 로그인 페이지로 리디렉션
      router.push('/login');
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
      setError("로그아웃 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // 로딩 상태 최적화
  const isPageLoading = authLoading || !isInitialized;
  
  // 로딩 중 표시
  if (isPageLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-lg">정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  // 사용자 정보가 없을 경우
  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-primary">내 정보</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> 로그인 필요
            </CardTitle>
            <CardDescription>사용자 정보를 확인하려면 로그인이 필요합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.</p>
              <Button onClick={() => router.push('/login')}>
                로그인 페이지로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">내 정보</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefreshUserData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '새로고침 중...' : '정보 새로고침'}
        </Button>
      </div>
      
      {/* 프로필 카드 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> 프로필 정보
          </CardTitle>
          <CardDescription>개인 정보와 계정 설정을 관리하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {userData.name?.[0] || "?"}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{userData.name}</h2>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> 가입일: {new Date(userData.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                <Settings className="h-4 w-4 mr-2" /> 설정
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-1">이메일</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  {userData.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">전화번호</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  {userData.phoneNumber}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">자녀 정보</p>
              <div className="flex gap-2">
                <div className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                  자녀 {userData.childrenInfo.count}명
                </div>
                {userData.childrenInfo.ageGroups.map((age, index) => (
                  <div key={index} className="bg-blue-50 text-blue-600 rounded-full px-3 py-1 text-sm">
                    {age}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 사용 통계 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>통계</CardTitle>
          <CardDescription>데일리체크 사용 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">총 식사 기록</p>
              <p className="text-2xl font-bold">{statsData.totalMeals}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">총 수면 기록</p>
              <p className="text-2xl font-bold">{statsData.totalSleep}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">총 체크인</p>
              <p className="text-2xl font-bold">{statsData.totalCheckins}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">웰니스 리포트</p>
              <p className="text-2xl font-bold">{statsData.wellnessReports}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 계정 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>계정 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-medium">알림 설정</h3>
                <p className="text-sm text-muted-foreground">이메일 및 푸시 알림 설정을 관리합니다</p>
              </div>
              <Button variant="outline" size="sm">설정하기</Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t">
              <div>
                <h3 className="font-medium">비밀번호 변경</h3>
                <p className="text-sm text-muted-foreground">계정 보안을 위해 주기적으로 비밀번호를 변경하세요</p>
              </div>
              <Button variant="outline" size="sm">변경하기</Button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t">
              <div>
                <h3 className="font-medium text-destructive">로그아웃</h3>
                <p className="text-sm text-muted-foreground">현재 기기에서 로그아웃합니다</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> 처리 중...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" /> 로그아웃
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 