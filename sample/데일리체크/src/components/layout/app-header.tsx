
"use client";

import { Leaf, UserCircle, LogOut, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
// import { LanguageSwitcher } from "@/components/language-switcher"; // Removed
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const { t } = useTranslation();
  const { user, userProfile, logout, loading } = useAuth();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 shadow-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">{t('nurtureWell')}</span>
        </Link>
      </div>
      
      <nav className="ml-auto flex items-center gap-2">
        {/* <LanguageSwitcher /> Removed */}
        {loading ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {/* Placeholder for user image if available in profile */}
                  {/* <AvatarImage src={userProfile?.photoURL || undefined} alt={userProfile?.name || "User"} /> */}
                  <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userProfile?.name || t("nav.myAccount")}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/mypage">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>{t('nav.myPage')}</span>
                </Link>
              </DropdownMenuItem>
              {/* Add other items like Profile page link if needed */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                <LogIn className="mr-1 h-4 w-4" /> {t("loginPage.title")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">
                 <UserPlus className="mr-1 h-4 w-4" /> {t("signupPage.title")}
              </Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}

    