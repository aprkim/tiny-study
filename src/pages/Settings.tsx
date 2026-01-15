import { useState, useEffect, useRef } from "react";
import { getApiKey, setApiKey, clearApiKey, hasApiKey } from "../lib/anthropic";
import { useAuth } from "../contexts/AuthContext";
import { getEntries, getAllExamplesForExport, saveEntries, saveExamples } from "../storage";
import { Entry, GeneratedExample } from "../types";

interface BackupData {
  entries: Entry[];
  examples: GeneratedExample[];
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isKeySet, setIsKeySet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "error";
  }>({ isOpen: false, title: "", message: "", type: "info" });

  const showModal = (title: string, message: string, type: "info" | "success" | "error" = "info") => {
    setModal({ isOpen: true, title, message, type });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    setIsKeySet(hasApiKey());
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKeyInput(existingKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKeyInput.trim()) {
      setSaveStatus("error");
      return;
    }

    setApiKey(apiKeyInput.trim());
    setIsKeySet(true);
    setSaveStatus("saved");

    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleClear = () => {
    clearApiKey();
    setApiKeyInput("");
    setIsKeySet(false);
    setSaveStatus("idle");
  };

  const handleExport = async () => {
    try {
      const [entries, examples] = await Promise.all([
        getEntries(),
        getAllExamplesForExport(),
      ]);
      const data: BackupData = { entries, examples };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiny-study-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      showModal("Error", "Failed to export data", "error");
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);

        let importedEntries: Entry[] = [];
        let importedExamples: GeneratedExample[] = [];

        if (raw.entries || raw.examples) {
          importedEntries = raw.entries || [];
          importedExamples = raw.examples || [];
        } else {
          showModal("Error", "Invalid file format", "error");
          return;
        }

        // Merge entries
        const existingEntries = await getEntries();
        const mergedEntries = [...existingEntries];
        for (const entry of importedEntries) {
          if (!mergedEntries.find((e) => e.id === entry.id)) {
            mergedEntries.push(entry);
          }
        }
        await saveEntries(mergedEntries);

        // Merge examples
        const existingExamples = await getAllExamplesForExport();
        const mergedExamples = [...existingExamples];
        for (const example of importedExamples) {
          if (!mergedExamples.find((ex) => ex.id === example.id)) {
            mergedExamples.push(example);
          }
        }
        await saveExamples(mergedExamples);

        showModal(
          "Import Successful",
          `Imported ${importedEntries.length} entries and ${importedExamples.length} examples`,
          "success"
        );
      } catch {
        showModal("Error", "Failed to import: Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const maskedKey = apiKeyInput
    ? `${apiKeyInput.slice(0, 7)}...${apiKeyInput.slice(-4)}`
    : "";

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* Data Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h2 className="font-semibold text-[#1e293b] mb-4">Data</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#1e293b]">Export Data</span>
                <p className="text-sm text-[#64748b]">Download all entries as JSON</p>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
              >
                Export
              </button>
            </div>

            <div className="border-t border-[#e2e8f0]" />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#1e293b]">Import Data</span>
                <p className="text-sm text-[#64748b]">Restore from backup file</p>
              </div>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h2 className="font-semibold text-[#1e293b] mb-2">
            Anthropic API Key
          </h2>
          <p className="text-sm text-[#64748b] mb-4">
            Add your API key to enable AI-powered explanations and example
            generation. Get your key from{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#BF3143] underline"
            >
              console.anthropic.com
            </a>
          </p>

          {isKeySet && !showKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 bg-[#E7F1EB] text-[#3F6B52] rounded-lg text-sm font-medium">
                  Key configured
                </span>
                <span className="text-sm text-[#64748b] font-mono">
                  {maskedKey}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKey(true)}
                  className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
                >
                  Edit Key
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-[#FEF2F2] text-[#BF3143] rounded-lg text-sm font-medium hover:bg-[#fde8e8] transition-colors"
                >
                  Remove Key
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setSaveStatus("idle");
                }}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 bg-white border border-[#e2e8f0] rounded-lg text-[#1e293b] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#BF3143] font-mono text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#BF3143] text-white rounded-lg text-sm font-medium hover:bg-[#a52a3a] transition-colors"
                >
                  Save Key
                </button>
                {isKeySet && (
                  <button
                    onClick={() => {
                      setShowKey(false);
                      setApiKeyInput(getApiKey() || "");
                    }}
                    className="px-4 py-2 bg-[#f0f4f3] text-[#1e293b] rounded-lg text-sm font-medium hover:bg-[#e2e8f0] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {saveStatus === "saved" && (
                <p className="text-sm text-[#3F6B52]">API key saved successfully!</p>
              )}
              {saveStatus === "error" && (
                <p className="text-sm text-[#BF3143]">Please enter a valid API key.</p>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-[#F7F5FA] border border-[#e2e8f0] rounded-lg p-4">
          <h3 className="font-medium text-[#6E6282] mb-2">How it works</h3>
          <ul className="text-sm text-[#64748b] space-y-2">
            <li>
              <strong>Save + Explain:</strong> AI generates meaning and nuance for new entries
            </li>
            <li>
              <strong>Generate Examples:</strong> AI creates 3 contextual example sentences
            </li>
            <li>
              <strong>Privacy:</strong> Your API key is stored locally in your browser
            </li>
          </ul>
        </div>

        {/* Account Section */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
          <h2 className="font-semibold text-[#1e293b] mb-2">Account</h2>
          <p className="text-sm text-[#64748b] mb-4">
            Signed in as {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-2 bg-[#FEF2F2] text-[#BF3143] rounded-lg text-sm font-medium hover:bg-[#fde8e8] transition-colors disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>

        {/* Version */}
        <p className="text-center text-[#64748b] text-sm">
          Tiny Study by{" "}
          <a
            href="https://tinywins.space"
            className="text-[#BF3143] hover:underline"
          >
            TinyWins
          </a>
        </p>
      </div>

      {/* Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2
              className={`text-xl font-bold mb-2 ${
                modal.type === "error"
                  ? "text-[#BF3143]"
                  : modal.type === "success"
                  ? "text-[#3F6B52]"
                  : "text-[#1e293b]"
              }`}
            >
              {modal.title}
            </h2>
            <p className="text-[#64748b] mb-4">{modal.message}</p>
            <button
              onClick={() => setModal({ ...modal, isOpen: false })}
              className="w-full px-4 py-2 bg-[#BF3143] text-white rounded-lg text-sm font-medium hover:bg-[#a52a3a] transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
