import { useState } from "react";
import Home from "./pages/Home";
import NewEntry from "./pages/NewEntry";
import EntryDetail from "./pages/EntryDetail";
import EditEntry from "./pages/EditEntry";
import Settings from "./pages/Settings";
import Mastered from "./pages/Mastered";

type Page = "home" | "new" | "detail" | "edit" | "settings" | "mastered";
type Tab = "study" | "mastered" | "settings";

function App() {
  const [page, setPage] = useState<Page>("home");
  const [activeTab, setActiveTab] = useState<Tab>("study");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

  const navigateHome = () => {
    setRefreshKey((k) => k + 1);
    setPage("home");
    setActiveTab("study");
    setSelectedEntryId(null);
    setSelectedEntryIds([]);
  };

  const handleSaved = () => {
    navigateHome();
  };

  const handleSavedWithIds = (ids: string[]) => {
    if (ids.length >= 1) {
      setSelectedEntryId(ids[0]);
      setSelectedEntryIds(ids);
      setPage("detail");
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id);
    setPage("detail");
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "study") {
      setRefreshKey((k) => k + 1);
      setPage("home");
    } else if (tab === "mastered") {
      setPage("mastered");
    } else if (tab === "settings") {
      setPage("settings");
    }
    setSelectedEntryId(null);
  };

  // Check if we should show bottom tabs (not on detail pages like new, detail, edit)
  const showBottomTabs = page === "home" || page === "mastered" || page === "settings";

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      {page === "home" && (
        <Home
          key={refreshKey}
          onAddNew={() => setPage("new")}
          onSelectEntry={handleSelectEntry}
        />
      )}
      {page === "new" && (
        <NewEntry
          onBack={navigateHome}
          onSaved={handleSaved}
          onSavedWithIds={handleSavedWithIds}
        />
      )}
      {page === "detail" && selectedEntryId && (
        <EntryDetail
          entryId={selectedEntryId}
          entryIds={selectedEntryIds}
          onBack={navigateHome}
          onDeleted={navigateHome}
          onNavigate={(id) => setSelectedEntryId(id)}
        />
      )}
      {page === "edit" && selectedEntryId && (
        <EditEntry
          entryId={selectedEntryId}
          onBack={() => setPage("detail")}
          onSaved={() => setPage("detail")}
        />
      )}
      {page === "mastered" && (
        <Mastered onSelectEntry={handleSelectEntry} />
      )}
      {page === "settings" && <Settings />}

      {/* Bottom Tabs */}
      {showBottomTabs && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0]">
          <div className="max-w-md mx-auto flex">
            <button
              onClick={() => handleTabChange("study")}
              className={`flex-1 flex flex-col items-center py-3 ${
                activeTab === "study" ? "text-[#BF3143]" : "text-[#9CA3AF]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Study</span>
            </button>
            <button
              onClick={() => handleTabChange("mastered")}
              className={`flex-1 flex flex-col items-center py-3 ${
                activeTab === "mastered" ? "text-[#BF3143]" : "text-[#9CA3AF]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-xs mt-1 font-medium">Mastered</span>
            </button>
            <button
              onClick={() => handleTabChange("settings")}
              className={`flex-1 flex flex-col items-center py-3 ${
                activeTab === "settings" ? "text-[#BF3143]" : "text-[#9CA3AF]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Settings</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default App;
