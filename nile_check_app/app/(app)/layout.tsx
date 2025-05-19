"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { X, LogOut, User } from "lucide-react";
import { useSession } from "@/contexts/SessionProvider";
import { Button } from "@/components/ui/button";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useSession();
  
  const navigation = [
    { name: '주간리포트', href: '/solutions' },
    { name: '활동 기록', href: '/log-activity' },
    { name: '내 정보', href: '/mypage' },
  ];
  
  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = () => {
    logout();
  };
  
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
          
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-expanded={mobileMenuOpen}
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          </div>
        </nav>
        
        {/* Mobile menu */}
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
      
      <main className="flex-1 bg-slate-50">
        {children}
      </main>
      
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 더나일체크. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 