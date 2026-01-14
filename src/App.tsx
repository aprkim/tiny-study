import { useState } from "react";
import Home from "./pages/Home";
import NewEntry from "./pages/NewEntry";
import EntryDetail from "./pages/EntryDetail";
import EditEntry from "./pages/EditEntry";
import Repeat from "./pages/Repeat";
import Settings from "./pages/Settings";

type Page = "home" | "new" | "detail" | "edit" | "repeat" | "settings";

function App() {
  const [page, setPage] = useState<Page>("home");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const navigateHome = () => {
    setRefreshKey((k) => k + 1);
    setPage("home");
    setSelectedEntryId(null);
  };

  const handleSaved = () => {
    navigateHome();
  };

  const handleSavedWithId = (id: string) => {
    setSelectedEntryId(id);
    setPage("detail");
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntryId(id);
    setPage("detail");
  };

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      {page === "home" && (
        <Home
          key={refreshKey}
          onAddNew={() => setPage("new")}
          onSelectEntry={handleSelectEntry}
          onStartRepeat={() => setPage("repeat")}
          onSettings={() => setPage("settings")}
        />
      )}
      {page === "new" && (
        <NewEntry
          onBack={navigateHome}
          onSaved={handleSaved}
          onSavedWithId={handleSavedWithId}
        />
      )}
      {page === "detail" && selectedEntryId && (
        <EntryDetail
          entryId={selectedEntryId}
          onBack={navigateHome}
          onDeleted={navigateHome}
          onEdit={() => setPage("edit")}
        />
      )}
      {page === "edit" && selectedEntryId && (
        <EditEntry
          entryId={selectedEntryId}
          onBack={() => setPage("detail")}
          onSaved={() => setPage("detail")}
        />
      )}
      {page === "repeat" && <Repeat onBack={navigateHome} />}
      {page === "settings" && <Settings onBack={navigateHome} />}
    </div>
  );
}

export default App;
