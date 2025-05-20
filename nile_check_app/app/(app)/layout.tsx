"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { X, LogOut, User } from "lucide-react";
import { useSession } from "@/contexts/SessionProvider";
import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useSession();
  const { isLoading } = useAuth();
  
  const navigation = [
    { name: '대시보드', href: '/dashboard' },
    { name: '활동 기록', href: '/log-activity' },
    { name: '내 정보', href: '/mypage' },
  ];
  
  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = () => {
    logout();
  };
  
  // 로그인 후에는 localStorage에 인증 상태를 캐시해서 
  // 페이지 간 이동 시 깜빡임이나 무한 로딩을 방지
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      try {
        localStorage.setItem('nile-check-auth', JSON.stringify({
          isAuthenticated: true,
          currentUser: user
        }));
        console.log('[AppLayout] 인증 상태 캐시됨:', user.id);
      } catch (error) {
        console.error('[AppLayout] 인증 상태 캐싱 오류:', error);
      }
    }
  }, [isAuthenticated, user, isLoading]);
  
  // 세션 복구 시도 - 페이지 로드 시 한 번만 수행
  useEffect(() => {
    const tryRestoreSession = async () => {
      // 로그인되어 있지 않은 경우에만 시도
      if (!isAuthenticated && !isLoading) {
        try {
          // 로컬 스토리지에서 세션 정보 확인
          const authData = localStorage.getItem('nile-check-auth');
          if (authData) {
            console.log('[AppLayout] 로컬 스토리지에서 세션 복구 시도');
            const parsed = JSON.parse(authData);
            
            if (parsed.isAuthenticated && parsed.currentUser) {
              // 세션 확인 API 호출로 실제 세션 유효성 검증
              console.log('[AppLayout] 세션 복구 - 서버에 세션 확인');
              await checkSession();
            }
          }
        } catch (error) {
          console.error('[AppLayout] 세션 복구 실패:', error);
        }
      }
    };
    
    tryRestoreSession();
  }, []); // 의존성 배열 비움 - 컴포넌트 마운트 시 한 번만 실행
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <nav className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            더나일체크
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  <span>{user?.name || '사용자'}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-primary hover:underline"
              >
                로그인
              </Link>
            )}
          </div>
          
          <div className="md:hidden flex items-center">
            <button 
              onClick={toggleMenu}
              className="ml-3 text-gray-600"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <div className="flex flex-col space-y-1">
                  <div className="h-0.5 w-6 bg-gray-600"></div>
                  <div className="h-0.5 w-6 bg-gray-600"></div>
                  <div className="h-0.5 w-6 bg-gray-600"></div>
                </div>
              )}
            </button>
          </div>
        </nav>
        
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t bg-white shadow-lg">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-4 rounded-md text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-3 text-base font-medium text-muted-foreground flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    <span>{user?.name || '사용자'}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-4 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block px-3 py-4 rounded-md text-base font-medium text-primary hover:underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="py-6 border-t mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 더나일체크 (NileCheck). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 