import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/contexts/SessionProvider";
import { AuthInitializer } from "@/components/auth-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "나일체크 - 일상 기록과 정서 체크인",
  description: "식습관, 수면, 활동 등을 기록하고 정서 상태를 체크인하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProvider>
          <AuthInitializer />
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
