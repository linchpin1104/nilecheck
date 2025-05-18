
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { useTranslation } from '@/hooks/useTranslation';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth(); // Use auth state
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading) { // Only redirect once auth state is resolved
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/log-activity'); // Changed from /about to /log-activity
      }
    }
  }, [user, loading, router]);

  // Show a loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">{t('redirecting')}</p>
      </div>
    );
  }

  // This content will ideally not be seen due to quick redirection
  return (
    <div className="flex items-center justify-center h-screen">
      <p>{t('redirecting')}</p>
    </div>
  );
}

