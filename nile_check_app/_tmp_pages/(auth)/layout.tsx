"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white py-4 px-6 shadow-sm">
        <div className="container mx-auto flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              N
            </div>
            <h1 className="text-xl font-bold text-primary">Nile Check</h1>
          </div>
        </div>
      </header>
      
      <main>{children}</main>
      
      <footer className="py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Nile Check. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 