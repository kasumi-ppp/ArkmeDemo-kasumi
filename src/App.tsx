import { useState } from "react";
import AdminMessageConsole from "@/pages/AdminMessageConsole";
import Home from "@/pages/Home";
import AISettings from "@/pages/AISettings";
import { PreferencesProvider } from "@/settings/preferences";

export type PageType = "records" | "insight" | "mine" | "arrangements" | "ai-settings";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("records");
  const isAdminConsole =
    typeof window !== "undefined" && window.location.pathname === "/sendtest";

  if (isAdminConsole) {
    return <AdminMessageConsole />;
  }

  if (currentPage === "ai-settings") {
    return (
      <PreferencesProvider>
        <AISettings />
      </PreferencesProvider>
    );
  }

  return (
    <PreferencesProvider>
      <Home currentPage={currentPage} onNavigate={setCurrentPage} />
    </PreferencesProvider>
  );
}
