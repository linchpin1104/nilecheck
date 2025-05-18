
"use client"; 

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Leaf, Smile, UserCircle, LogIn, UserPlus, LogOut } from "lucide-react"; // Added LogOut
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
// import { LanguageSwitcher } from "@/components/language-switcher"; // Removed
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


export default function AboutPage() {
  const { t } = useTranslation();
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // const getInitials = (name: string | null | undefined) => { // Not used here
  //   if (!name) return "?";
  //   return name.split(' ').map(n => n[0]).join('').toUpperCase();
  // };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 px-4 lg:px-6 h-16 flex items-center bg-background shadow-sm">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <Leaf className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold text-foreground">{t('nurtureWell')}</span>
        </Link>
         <nav className="ml-auto flex gap-2 sm:gap-4 items-center">
           {/* <LanguageSwitcher /> Removed */}
           { authLoading ? (
             <div className="h-8 w-20 animate-pulse rounded-md bg-muted sm:w-24"></div>
           ) : user ? (
            <>
              <Link href="/dashboard" passHref>
                <Button variant="outline" size="sm">{t('nav.dashboard')}</Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={logout} aria-label={t('nav.logout')}>
                <LogOut className="h-5 w-5"/>
              </Button>
            </>
           ) : (
            <>
              <Link href="/login" passHref>
                <Button variant="ghost" size="sm">
                  <LogIn className="mr-1 h-4 w-4 sm:mr-2"/> {t('loginPage.title')}
                </Button>
              </Link>
              <Link href="/signup" passHref>
                <Button variant="default" size="sm">
                  <UserPlus className="mr-1 h-4 w-4 sm:mr-2"/> {t('signupPage.title')}
                </Button>
              </Link>
            </>
           )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <Image
                src="https://placehold.co/1200x800.png"
                alt={t('tagline')}
                width={1200}
                height={800}
                className="mx-auto aspect-[3/2] overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
                data-ai-hint="calm parent child"
              />
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary-foreground bg-primary/80 p-2 rounded-md inline-block shadow-md">
                    {t('tagline')}
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    {t('description')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href={user ? "/log-activity" : "/signup"}>
                    <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
                      {user ? t('startCheckin') : t("signupPage.getStartedButton")}
                    </Button>
                  </Link>
                  {user && (
                     <Link href="/dashboard">
                        <Button size="lg" variant="outline" className="shadow-md">
                          {t('goToDashboard')}
                        </Button>
                      </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {t('keyFeatures')}
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-primary">
                  {t('toolsForWellbeing')}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('featuresDescription')}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <Leaf className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>{t('feature.activityLogging.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('feature.activityLogging.description')}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <Smile className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>{t('feature.wellbeingCheckins.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('feature.wellbeingCheckins.description')}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <Droplet className="w-10 h-10 text-primary mb-2" />
                  <CardTitle>{t('feature.personalizedSolutions.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('feature.personalizedSolutions.description')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-secondary">
        <p className="text-xs text-secondary-foreground">
          {t('copyright', { year: currentYear || new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}

    