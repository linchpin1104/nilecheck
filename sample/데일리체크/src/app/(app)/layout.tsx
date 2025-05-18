
import { AppHeader } from "@/components/layout/app-header";
import { AppProvider } from "@/lib/app-store"; // Import AppProvider

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider> {/* Wrap with AppProvider */}
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        {/* AppSidebar removed */}
        {/* Adjusted padding for the main content area as sidebar is removed */}
        <div className="flex flex-col sm:gap-4 sm:py-4">
          <AppHeader />
          <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
